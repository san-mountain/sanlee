import assert from "node:assert/strict";
import { test } from "node:test";
import { dayOf, deviceOf, isBot, lastDays, pageOf, sourceOf, summarize } from "../src/lib/analytics/visit.ts";

test("셀 페이지만 센다: 끝의 / 와 ?·# 는 떼고, 관리 화면·없는 주소는 뺀다", () => {
  assert.equal(pageOf("/"), "/");
  assert.equal(pageOf("/works/"), "/works");
  assert.equal(pageOf("/works#sculpture"), "/works");
  assert.equal(pageOf("/deleteseoul?end=accept"), "/deleteseoul");
  assert.equal(pageOf("/admin"), null);
  assert.equal(pageOf("/nope"), null);
  assert.equal(pageOf(42), null);
});

test("어디서 왔는지는 호스트 이름만, 같은 곳은 하나로 묶는다", () => {
  const own = "sanlee.kr";
  assert.equal(sourceOf("https://www.google.co.kr/", own), "google");
  assert.equal(sourceOf("https://m.search.naver.com/search?q=x", own), "naver");
  assert.equal(sourceOf("https://l.instagram.com/?u=https%3A%2F%2Fsanlee.kr", own), "instagram.com");
  assert.equal(sourceOf("https://t.co/abc", own), "x.com");
  assert.equal(sourceOf("https://www.example.org/a/b?c", own), "example.org");
  assert.equal(sourceOf("https://sanlee.kr/works", own), null);
  assert.equal(sourceOf("https://www.sanlee.kr/", own), null);
  assert.equal(sourceOf("https://sanlee-abc.vercel.app/", own), null);
  assert.equal(sourceOf("", own), null);
  assert.equal(sourceOf("javascript:alert(1)", own), null);
});

test("기기와 로봇", () => {
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15";
  assert.equal(deviceOf(iphone), "mobile");
  assert.equal(deviceOf(mac), "desktop");
  assert.equal(deviceOf(mac, true), "tablet"); // iPad
  assert.equal(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/130 Safari/537.36"), "tablet");
  assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isBot("Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/130"), true);
  assert.equal(isBot(""), true);
  assert.equal(isBot(iphone), false);
});

test("날짜는 한국 시간", () => {
  assert.equal(dayOf(Date.UTC(2026, 10, 18, 14, 59)), "2026-11-18");
  assert.equal(dayOf(Date.UTC(2026, 10, 18, 15, 0)), "2026-11-19");
  assert.deepEqual(lastDays(3, Date.UTC(2026, 0, 1, 3)), ["2025-12-30", "2025-12-31", "2026-01-01"]);
});

test("하루치 기록을 모아 합친다", () => {
  const s = summarize(
    ["2026-11-17", "2026-11-18"],
    [
      { v: 3, "p:/": 3, "p:/works": 2, "r:google": 1, "d:mobile": 3, "c:KR": 3, "l:ko": 3 },
      { v: 2, "p:/works": 4, "r:google": 1, "r:instagram.com": 1, "d:desktop": 2, "c:US": 1, "c:KR": 1, "l:en": 2 },
    ],
    [3, 2],
  );
  assert.deepEqual(s.days, [
    { day: "2026-11-17", visitors: 3, views: 5 },
    { day: "2026-11-18", visitors: 2, views: 4 },
  ]);
  assert.equal(s.visitors, 5);
  assert.equal(s.visits, 5);
  assert.equal(s.views, 9);
  assert.deepEqual(s.pages, [["/works", 6], ["/", 3]]);
  assert.deepEqual(s.sources, [["google", 2], ["instagram.com", 1]]);
  assert.equal(s.direct, 2);
  assert.deepEqual(s.countries, [["KR", 4], ["US", 1]]);
});

test("방문 하나의 기록: 기기·브라우저·도시와 본 페이지 순서", async () => {
  const { browserOf, osOf, cityOf, hourOf, visitOf } = await import("../src/lib/analytics/visit.ts");
  const ig = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 350.0";
  assert.equal(osOf(ig), "iOS");
  assert.equal(browserOf(ig), "인스타그램 앱");
  assert.equal(browserOf("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130 Safari/537.36 Edg/130"), "Edge");
  assert.equal(browserOf("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 SamsungBrowser/26.0 Chrome/122 Mobile Safari/537.36"), "삼성 인터넷");
  assert.equal(osOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", true), "iPadOS");
  assert.equal(cityOf("Seoul"), "Seoul");
  assert.equal(cityOf("S%C3%A3o%20Paulo"), "São Paulo");
  assert.equal(cityOf("%E0%A4%A"), "");
  assert.equal(hourOf(Date.UTC(2026, 10, 18, 15, 30)), 0);
  const v = visitOf("abcdefghijklmnop", { t: "1000", e: "90000", city: "Seoul", c: "KR", d: "mobile", r: "google" }, ["/|1000", "/works|20000"]);
  assert.equal(v.end, 90000);
  assert.deepEqual(v.pages, [{ path: "/", at: 1000 }, { path: "/works", at: 20000 }]);
  assert.equal(visitOf("x", {}, []), null);
});
