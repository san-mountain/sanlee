// 글과 사진은 GitHub 저장소에 커밋으로 저장한다. main에 커밋이 들어가면 Vercel이 사이트를 다시 만들어 1~2분 뒤 반영된다.
const API = process.env.ADMIN_GITHUB_API ?? "https://api.github.com"; // 시험할 때만 바꾼다
const repo = () => process.env.ADMIN_REPO ?? "san-mountain/sanlee";
export const branch = () => process.env.ADMIN_BRANCH ?? "main";

export class Conflict extends Error {}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/repos/${repo()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 300)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

type Ref = { object: { sha: string } };
type Commit = { sha: string; tree: { sha: string } };
type Blob = { sha: string };
type Tree = { tree: { path: string; sha: string; type: string }[] };

// 지금 main에 있는 파일 내용과 그 파일의 blob sha(저장할 때 사이에 바뀌었는지 확인하는 데 쓴다)
export async function readFile(path: string) {
  const head = await gh<Ref>(`/git/ref/heads/${branch()}`);
  return readAt(head.object.sha, path);
}
async function readAt(commitSha: string, path: string) {
  const f = await gh<{ sha: string; content: string; encoding: string }>(
    `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${commitSha}`
  );
  // 1MB가 넘는 파일은 contents API가 내용을 비워 주므로 blob으로 다시 읽는다
  const b64 = f.content ? f.content : (await gh<{ content: string }>(`/git/blobs/${f.sha}`)).content;
  return { sha: f.sha, text: Buffer.from(b64, "base64").toString("utf8") };
}

export type Change = { path: string; text?: string; base64?: string; delete?: true };

// 여러 파일을 커밋 하나로 저장한다. guard: { path, sha } 를 주면 그 파일이 그 사이 바뀌었을 때 Conflict
export async function commit(message: string, changes: Change[], guard?: { path: string; sha: string }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const head = await gh<Ref>(`/git/ref/heads/${branch()}`);
    const parent = await gh<Commit>(`/git/commits/${head.object.sha}`);
    if (guard) {
      const now = await readAt(head.object.sha, guard.path);
      if (now.sha !== guard.sha) throw new Conflict("다른 곳에서 먼저 고친 내용이 있어요");
    }
    const tree = await Promise.all(
      changes.map(async (c) => {
        if (c.delete) return { path: c.path, mode: "100644", type: "blob", sha: null };
        const blob = await gh<Blob>(`/git/blobs`, {
          method: "POST",
          body: JSON.stringify(
            c.base64 !== undefined ? { content: c.base64, encoding: "base64" } : { content: c.text ?? "", encoding: "utf-8" }
          ),
        });
        return { path: c.path, mode: "100644", type: "blob", sha: blob.sha };
      })
    );
    const newTree = await gh<{ sha: string }>(`/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: parent.tree.sha, tree }),
    });
    const created = await gh<{ sha: string; html_url: string }>(`/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message, tree: newTree.sha, parents: [parent.sha] }),
    });
    try {
      await gh(`/git/refs/heads/${branch()}`, { method: "PATCH", body: JSON.stringify({ sha: created.sha, force: false }) });
      return { sha: created.sha, url: created.html_url };
    } catch (e) {
      // 그 사이 main에 다른 커밋이 들어왔으면(422) 새 main 위에서 다시 만든다
      if ((e as { status?: number }).status !== 422) throw e;
    }
  }
  throw new Conflict("저장소가 계속 바뀌고 있어요. 잠시 뒤 다시 저장해 주세요");
}

// 저장한 커밋이 사이트에 반영됐는지: Vercel이 커밋에 남기는 상태(commit status 또는 check run)를 읽는다
export async function deployState(sha: string): Promise<"pending" | "success" | "failure" | "unknown"> {
  const s = await gh<{ statuses: { context: string; state: string }[] }>(`/commits/${sha}/status`);
  let states = s.statuses.filter((x) => /vercel/i.test(x.context)).map((x) => x.state);
  if (!states.length) {
    const c = await gh<{ check_runs: { name: string; status: string; conclusion: string | null }[] }>(`/commits/${sha}/check-runs`);
    states = c.check_runs
      .filter((r) => /vercel/i.test(r.name) && !/comment/i.test(r.name))
      .map((r) => (r.status !== "completed" ? "pending" : r.conclusion === "success" ? "success" : "failure"));
  }
  if (!states.length) return "unknown";
  if (states.some((x) => x === "failure" || x === "error")) return "failure";
  if (states.every((x) => x === "success")) return "success";
  return "pending";
}
