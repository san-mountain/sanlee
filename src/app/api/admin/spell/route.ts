import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { aiSpellReady, isOwner, sameOrigin } from "@/lib/admin/auth";
import { dedupe, locate } from "@/lib/spell";

// AI 맞춤법 검사: 본문을 문단 단위로 나눠 Claude에게 동시에 보내고, 고칠 곳만 돌려받는다.
// Vercel 환경 변수 ANTHROPIC_API_KEY 가 있어야 켜진다(없으면 관리 화면은 기본 규칙 검사만 한다).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

const SYSTEM = `당신은 한국어 문학 원고를 교정하는 꼼꼼한 교정자입니다. 국립국어원 표준 맞춤법·띄어쓰기·문장부호 규정을 기준으로 틀린 곳만 찾습니다.
- 시인·작가가 일부러 쓴 표현(옛말투 어미, 방언, 시적 허용, 의도적인 되풀이·생략, 행갈이, 신조어)은 고치지 않습니다. 확실히 틀린 것만 고릅니다.
- 문체나 어휘 선택을 바꾸자고 제안하지 않습니다. 뜻을 바꾸지 않습니다.
- original 에는 본문에 있는 그대로의 글자를 고칠 곳만큼 짧게(보통 한 어절) 옮겨 적습니다. 공백과 문장부호까지 똑같이.
- before 에는 본문에서 original 바로 앞에 오는 글자 5~10자를 그대로 적습니다(맨 앞이면 빈 문자열).
- suggestion 에는 original 을 바꿀 말을, reason 에는 짧은 한국어 설명(한 문장, '~예요' 말투)을 적습니다.
- kind 는 맞춤법, 띄어쓰기, 문장부호, 오타 중 하나입니다.
- 고칠 곳이 없으면 빈 목록을 돌려줍니다.`;

const SCHEMA = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          before: { type: "string" },
          suggestion: { type: "string" },
          reason: { type: "string" },
          kind: { type: "string", enum: ["맞춤법", "띄어쓰기", "문장부호", "오타"] },
        },
        required: ["original", "before", "suggestion", "reason", "kind"],
        additionalProperties: false,
      },
    },
  },
  required: ["issues"],
  additionalProperties: false,
};

// 문단 경계에서 약 2500자씩 자른다(각 조각의 시작 위치도 같이)
function chunks(text: string, size = 2500) {
  const out: { text: string; base: number }[] = [];
  let base = 0;
  while (base < text.length) {
    let end = Math.min(text.length, base + size);
    if (end < text.length) {
      const nl = text.lastIndexOf("\n", end);
      if (nl > base + size / 2) end = nl + 1;
    }
    out.push({ text: text.slice(base, end), base });
    base = end;
  }
  return out;
}

type Found = { original: string; before: string; suggestion: string; reason: string; kind: string };

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("잘못된 요청이에요", 403);
  if (!(await isOwner())) return err("로그인이 필요해요", 401);
  if (!aiSpellReady()) return err("AI 검사를 쓰려면 Vercel 환경 변수에 ANTHROPIC_API_KEY 를 넣어 주세요", 501);
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.replace(/\r\n?/g, "\n") : "";
  const kind = typeof body?.category === "string" ? body.category.slice(0, 30) : "";
  if (!text.trim()) return NextResponse.json({ issues: [] });
  if (text.length > 60_000) return err("한 번에 6만 자까지 검사할 수 있어요", 400);

  const client = new Anthropic();
  try {
    const results = await Promise.all(
      chunks(text).map(async (c) => {
        const res = await client.beta.messages.create({
          model: "claude-opus-5-5",
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
          system: SYSTEM,
          messages: [{ role: "user", content: `글의 종류: ${kind || "글"}\n\n아래 본문을 교정해 주세요.\n\n<본문>\n${c.text}\n</본문>` }],
        });
        if (res.stop_reason === "refusal") return [];
        const block = res.content.find((b) => b.type === "text");
        if (!block || block.type !== "text") return [];
        const parsed = JSON.parse(block.text) as { issues: Found[] };
        return locate(c.text, parsed.issues, c.base);
      })
    );
    return NextResponse.json({ issues: dedupe(results.flat()) });
  } catch (e) {
    console.error("[admin spell]", e);
    if (e instanceof Anthropic.AuthenticationError) return err("ANTHROPIC_API_KEY 가 맞지 않아요", 502);
    if (e instanceof Anthropic.RateLimitError) return err("AI 검사를 너무 자주 했어요. 잠시 뒤 다시 해 주세요", 429);
    return err("AI 검사를 하지 못했어요. 잠시 뒤 다시 해 주세요", 502);
  }
}
