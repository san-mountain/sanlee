import { isOwner } from "@/lib/admin/auth";
import { analyticsReady, dayKey, KEEP_DAYS, pipeline, visitKey, visitorId, visitorKey, visitPagesKey, VISITS } from "@/lib/analytics/store";
import { browserOf, cityOf, COUNTRY, dayOf, deviceOf, FIELD, hourOf, isBot, LANG, LOG_DAYS, osOf, pageOf, sourceOf, VISIT_ID } from "@/lib/analytics/visit";

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
  const now = Date.now();
  const id = typeof body?.id === "string" && VISIT_ID.test(body.id) ? body.id : null;
  const logTtl = LOG_DAYS * 86400;

  // 페이지를 떠날 때: 방문이 끝난 시각만 적는다(머문 시간을 알려고)
  if (body?.leave === true) {
    if (id) await pipeline([["HSET", visitKey(id), "e", now], ["EXPIRE", visitKey(id), logTtl]]).catch((e) => console.error("[visit]", e));
    return done();
  }

  const page = pageOf(body?.path);
  if (!page) return done();

  const day = dayOf(now);
  const key = dayKey(day);
  const ttl = KEEP_DAYS * 86400;
  const cmds: (string | number)[][] = [["HINCRBY", key, `${FIELD.page}:${page}`, 1]];
  // 이 탭에서 처음 연 페이지일 때만 한 번의 "방문"으로 세고, 어디서 왔는지·나라·기기·언어·시간대도 그때 센다
  if (body.first === true) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
    const country = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase();
    const touch = body.touch === true;
    const source = sourceOf(body.ref, host);
    const lang = LANG(body.lang);
    const device = deviceOf(ua, touch);
    cmds.push(["HINCRBY", key, "v", 1], ["HINCRBY", key, `${FIELD.device}:${device}`, 1], ["HINCRBY", key, `${FIELD.hour}:${hourOf(now)}`, 1]);
    if (source) cmds.push(["HINCRBY", key, `${FIELD.source}:${source}`, 1]);
    if (COUNTRY.test(country)) cmds.push(["HINCRBY", key, `${FIELD.country}:${country}`, 1]);
    if (lang) cmds.push(["HINCRBY", key, `${FIELD.lang}:${lang}`, 1]);
    cmds.push(["PFADD", visitorKey(day), visitorId(day, ip, ua)], ["EXPIRE", visitorKey(day), ttl]);
    // 방문 하나의 기록. IP는 남기지 않는다
    if (id) {
      const fields: Record<string, string | number> = {
        t: now,
        city: cityOf(req.headers.get("x-vercel-ip-city")),
        c: COUNTRY.test(country) ? country : "",
        d: device,
        os: osOf(ua, touch),
        b: browserOf(ua),
        r: source ?? "",
        l: lang ?? "",
      };
      cmds.push(
        ["HSET", visitKey(id), ...Object.entries(fields).flat()],
        ["EXPIRE", visitKey(id), logTtl],
        ["ZADD", VISITS, now, id],
        ["ZREMRANGEBYSCORE", VISITS, "-inf", now - logTtl * 1000],
      );
    }
  }
  if (id) cmds.push(["RPUSH", visitPagesKey(id), `${page}|${now}`], ["LTRIM", visitPagesKey(id), 0, 199], ["EXPIRE", visitPagesKey(id), logTtl]);
  cmds.push(["EXPIRE", key, ttl]);
  try {
    await pipeline(cmds);
  } catch (e) {
    console.error("[visit]", e);
  }
  return done();
}
