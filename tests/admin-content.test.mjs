import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkUse, clean, cleanMeta, cleanPoems, cleanWorks, cleanUpload, droppedImages, serialize, FILES, Invalid } from "../src/lib/admin/content.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("현재 저장된 시·작업은 검사를 거쳐도 한 글자도 바뀌지 않는다", () => {
  for (const kind of ["poems", "works", "meta"]) {
    const raw = read(FILES[kind]);
    assert.equal(serialize(clean(kind, JSON.parse(raw))), raw, kind);
  }
});

test("잘못된 값은 저장하지 않는다", () => {
  assert.throws(() => clean("poems", [{ title: "a", date: "2026-11-09", body: "a" }]), Invalid);
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

const meta = {
  categories: [
    { id: "poem", ko: "시", en: "Poems", indent: false, serial: false },
    { id: "novel", ko: "소설", en: "Fiction", indent: true, serial: true },
  ],
  series: [{ id: "s-a", category: "novel", title: "밤의 도시" }],
};

test("글은 분류·연작이 실제로 있어야 하고, 시는 분류를 적지 않는다", () => {
  const ep = (part, title = `${part}화`) => ({ title, date: "2026.11.18", category: "novel", series: "s-a", part, body: "본문" });
  assert.deepEqual(cleanPoems([{ title: "a", date: "2026.11.18", category: "poem", body: "b" }], meta), [{ title: "a", date: "2026.11.18", body: "b" }]);
  assert.deepEqual(Object.keys(cleanPoems([ep(1)], meta)[0]), ["title", "date", "category", "series", "part", "body"]);
  // 다른 연작이면 같은 제목도 된다, 같은 연작의 같은 회차는 안 된다
  assert.equal(cleanPoems([ep(1), { title: "1화", date: "2026.11.18", body: "시" }], meta).length, 2);
  assert.throws(() => cleanPoems([ep(1), ep(1, "다른 제목")], meta), Invalid);
  assert.throws(() => cleanPoems([{ ...ep(1), series: "s-x" }], meta), Invalid); // 없는 연작
  assert.throws(() => cleanPoems([{ ...ep(1), category: "poem" }], meta), Invalid); // 분류가 다름
  assert.throws(() => cleanPoems([{ ...ep(1), part: 0 }], meta), Invalid);
  assert.throws(() => cleanPoems([{ title: "a", date: "2026.11.18", category: "essay", body: "b" }], meta), Invalid);
});

test("분류·연작 목록 검사: 글이 있는 분류·연작은 지울 수 없다", () => {
  assert.deepEqual(cleanMeta(meta), meta);
  assert.throws(() => cleanMeta({ ...meta, categories: [] }), Invalid);
  assert.throws(() => cleanMeta({ ...meta, categories: [meta.categories[0], { ...meta.categories[1], serial: false }] }), Invalid); // 연작이 있는데 연작 끔
  assert.throws(() => cleanMeta({ ...meta, categories: [meta.categories[0], meta.categories[0]] }), Invalid);
  const pieces = [{ title: "1화", date: "2026.11.18", category: "novel", series: "s-a", part: 1, body: "b" }];
  assert.throws(() => checkUse({ ...meta, series: [] }, pieces), Invalid);
  assert.throws(() => checkUse({ categories: [meta.categories[0]], series: [] }, pieces), Invalid);
  checkUse(meta, pieces);
});
