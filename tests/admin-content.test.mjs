import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { clean, seal, cleanDiary, cleanWorks, cleanUpload, droppedImages, serialize, FILES, Invalid } from "../src/lib/admin/content.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("현재 저장된 시·일기·작업은 검사를 거쳐도 한 글자도 바뀌지 않는다", () => {
  for (const kind of ["poems", "diary", "works"]) {
    const raw = read(FILES[kind]);
    assert.equal(serialize(clean(kind, JSON.parse(raw))), raw, kind);
  }
});

test("일기의 {가린 곳}은 글자 수 표시로만 남는다", () => {
  assert.equal(seal("오늘은 {아무도 모를 이야기} 했다."), "오늘은 ⟦8⟧ 했다.");
  assert.equal(seal("{a{b}c}"), "⟦5⟧");
  assert.equal(seal("이미 ⟦30⟧ 가린 곳"), "이미 ⟦30⟧ 가린 곳");
  assert.throws(() => seal("닫지 않은 {비밀"), Invalid);
  const [e] = cleanDiary([{ date: "2026.11.09", body: "공개\n\n{비밀 문단}" }]);
  assert.equal(e.body, "공개\n\n⟦4⟧");
  assert.ok(!JSON.stringify(e).includes("비밀"));
});

test("전체 비공개 일기는 날짜만 남는다", () => {
  assert.deepEqual(cleanDiary([{ date: "2026.11.09", hidden: true, title: "x", body: "비밀" }]), [{ hidden: true, date: "2026.11.09" }]);
});

test("잘못된 값은 저장하지 않는다", () => {
  assert.throws(() => cleanDiary([{ date: "2026-11-09", body: "a" }]), Invalid);
  assert.throws(() => clean("poems", [{ title: "", date: "2026.11.09", body: "a" }]), Invalid);
  const w = { title: { ko: "가", en: "A" }, date: "2026. 11.", medium: { ko: "m", en: "m" }, size: { ko: "s", en: "s" } };
  assert.throws(() => cleanWorks([w]), Invalid); // 사진도 링크도 없음
  assert.throws(() => cleanWorks([{ ...w, link: "javascript:alert(1)" }]), Invalid);
  assert.throws(() => cleanWorks([{ ...w, image: "/works/../../x.webp", width: 1, height: 1 }]), Invalid);
  assert.throws(() => cleanWorks([{ ...w, link: "/a" }, { ...w, link: "/b" }]), Invalid); // 같은 영어 제목
  assert.deepEqual(cleanWorks([{ ...w, image: "/works/a.webp", width: 10, height: 20, category: "sculpture", description: { ko: "", en: "" } }]), [
    { ...w, image: "/works/a.webp", category: "sculpture", width: 10, height: 20 },
  ]);
});

test("사진은 JPEG·PNG·WebP만, public/works 아래 .webp 경로로만 받는다", () => {
  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")]).toString("base64");
  assert.equal(cleanUpload({ path: "/works/a.webp", base64: webp }).path, "/works/a.webp");
  assert.equal(cleanUpload({ path: "/works/a.webp", base64: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]).toString("base64") }).bytes.length, 5);
  assert.throws(() => cleanUpload({ path: "/works/a.webp", base64: Buffer.from("<svg>").toString("base64") }), Invalid);
  assert.throws(() => cleanUpload({ path: "/works/a.svg", base64: webp }), Invalid);
});

test("목록에서 빠진 작업의 사진만 지운다", () => {
  assert.deepEqual(droppedImages([{ image: "/works/a.webp" }, { image: "/works/b.webp" }, { link: "/x" }], [{ image: "/works/b.webp" }]), ["/works/a.webp"]);
});
