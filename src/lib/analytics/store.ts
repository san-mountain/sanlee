// 방문 기록을 두는 곳: Upstash Redis(Vercel Marketplace에서 무료로 붙일 수 있다).
// 필요한 환경 변수(둘 중 한 쌍). Vercel에서 Upstash를 프로젝트에 연결하면 KV_REST_API_* 가 저절로 들어온다
//   KV_REST_API_URL / KV_REST_API_TOKEN
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// 합계: 하루에 키 두 개(v:YYYY-MM-DD 셈들을 담은 해시, v:YYYY-MM-DD:u 방문자 수를 세는 HyperLogLog). 400일 뒤 저절로 지워진다.
// 방문 하나하나의 기록은 아래 visit:* 키에, 90일 뒤 저절로 지워진다.
import { createHash } from "node:crypto";

const url = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const token = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
export const analyticsReady = () => !!url() && !!token();

export const KEEP_DAYS = 400;
export const dayKey = (day: string) => `v:${day}`;
export const visitorKey = (day: string) => `v:${day}:u`;
// 방문 하나하나: visit:<id>(해시) + visit:<id>:p(본 페이지 목록), 모든 방문은 시작 시각 순으로 visits(정렬 집합)에
export const visitKey = (id: string) => `visit:${id}`;
export const visitPagesKey = (id: string) => `visit:${id}:p`;
export const VISITS = "visits";

type Cmd = (string | number)[];
export async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  const res = await fetch(`${url().replace(/\/+$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!res.ok) throw Object.assign(new Error(`redis ${res.status}`), { status: res.status });
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const bad = out.find((r) => r.error);
  if (bad) throw new Error(`redis ${bad.error}`);
  return out.map((r) => r.result);
}

// 같은 사람을 하루 동안만 같은 사람으로 알아보는 표. IP·브라우저 정보에 그날의 날짜와 서버만 아는 값을 섞어 되돌릴 수 없게 만든다.
// 날이 바뀌면 표도 바뀌어서, 같은 사람이라도 다른 날에는 따로 센다
export function visitorId(day: string, ip: string, ua: string) {
  const secret = process.env.ANALYTICS_SECRET ?? process.env.ADMIN_PASSWORD ?? token();
  return createHash("sha256").update(`sanlee-visit\0${secret}\0${day}\0${ip}\0${ua}`).digest("base64url").slice(0, 16);
}

// HGETALL 결과(["칸", "값", ...])를 객체로
export function strHashOf(r: unknown): Record<string, string> {
  const o: Record<string, string> = {};
  if (Array.isArray(r)) for (let i = 0; i + 1 < r.length; i += 2) o[String(r[i])] = String(r[i + 1]);
  else if (r && typeof r === "object") for (const [k, v] of Object.entries(r)) o[k] = String(v);
  return o;
}
export function hashOf(r: unknown): Record<string, number> {
  const o: Record<string, number> = {};
  if (Array.isArray(r)) for (let i = 0; i + 1 < r.length; i += 2) o[String(r[i])] = Number(r[i + 1]) || 0;
  else if (r && typeof r === "object") for (const [k, v] of Object.entries(r)) o[k] = Number(v) || 0;
  return o;
}
