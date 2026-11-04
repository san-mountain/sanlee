import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const quality = read("src/explore/quality.ts");
const effects = read("src/explore/Effects.tsx");
const world = read("src/explore/World.tsx");
const pause = read("src/explore/PauseMenu.tsx");
const city = read("src/explore/City.tsx");
const story = read("src/explore/story.ts");

test("Retina devices start with GPU-safe off-equivalent rendering and honor explicit fx override", () => {
  assert.match(quality, /devicePixelRatio >= 1\.6 \? "low" : "mid"/);
  assert.match(quality, /v === "off" \? "low"/);
  assert.match(quality, /if \(forced\) return forced/);
  assert.match(effects, /\{q !== "low" && \(/);
  assert.match(city, /q === "high" \? \(/);
});

test("Postprocessing and Retina pixel ratios are bounded", () => {
  assert.match(effects, /q === "high" \? 1\.5 : q === "mid" \? 1\.25 : 1\.1/);
  assert.match(effects, /<EffectComposer multisampling=\{0\}>/);
  assert.match(world, /dpr=\{\[1, 1\.3\]\}/);
});

test("Users can override graphics preferences without changing gameplay saves", () => {
  assert.match(pause, /chooseQuality\(preset satisfies Quality\)/);
  assert.match(pause, /aria-pressed=\{quality === preset\}/);
  assert.match(quality, /GRAPHICS_KEY = "sanlee-graphics-quality-v1"/);
  assert.match(quality, /localStorage\.setItem\(GRAPHICS_KEY, q\)/);
  assert.match(quality, /if \(forced\) return;/);
  assert.match(story, /graphicsLow:.*성능 우선/);
});
