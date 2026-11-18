import { isOwner } from "@/lib/admin/auth";
import { analyticsReady, dayKey, KEEP_DAYS, pipeline, visitorId, visitorKey } from "@/lib/analytics/store";
import { COUNTRY, dayOf, deviceOf, FIELD, isBot, LANG, pageOf, sourceOf } from "@/lib/analytics/visit";

export const dynamic = "force-dynamic";

// 페이지를 볼 때마다 브라우저가 조용히 보내는 기록 한 줄. 무엇이 와도 204로만 답한다(세는지 안 세는지 밖에서 알 수 없게)
const done = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  if (!analyticsReady()) return done();
  // 다른 사이트에서 보낸 가짜 기록은 받지 않는다
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return done();
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return done();
  // 사이트 주인(관리 화면에 로그인한 기기)의 방문은 세지 않는다
  if (await isOwner()) return done();

  const body = await req
    .text()
    .then((t) => (t.length < 4000 ? JSON.parse(t) : null))
    .catch(() => null);
  const page = pageOf(body?.path);
  if (!page) return done();

  const day = dayOf(Date.now());
  const key = dayKey(day);
  const ttl = KEEP_DAYS * 86400;
  const cmds: (string | number)[][] = [["HINCRBY", key, `${FIELD.page}:${page}`, 1]];
  // 이 탭에서 처음 연 페이지일 때만 한 번의 "방문"으로 세고, 어디서 왔는지·나라·기기·언어도 그때 센다
  if (body.first === true) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
    const country = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
    const source = sourceOf(body.ref, host);
    const lang = LANG(body.lang);
    cmds.push(["HINCRBY", key, "v", 1], ["HINCRBY", key, `${FIELD.device}:${deviceOf(ua, body.touch === true)}`, 1]);
    if (source) cmds.push(["HINCRBY", key, `${FIELD.source}:${source}`, 1]);
    if (COUNTRY.test(country)) cmds.push(["HINCRBY", key, `${FIELD.country}:${country}`, 1]);
    if (lang) cmds.push(["HINCRBY", key, `${FIELD.lang}:${lang}`, 1]);
    cmds.push(["PFADD", visitorKey(day), visitorId(day, ip, ua)], ["EXPIRE", visitorKey(day), ttl]);
  }
  cmds.push(["EXPIRE", key, ttl]);
  try {
    await pipeline(cmds);
  } catch (e) {
    console.error("[visit]", e);
  }
  return done();
}
