// 퍼즐 A를 사람이 하듯 끝까지 플레이하는 브라우저 검증 (선택 실행: Playwright와 Chromium 필요).
// 순간이동·상태 조작 없이 키보드·마우스·터치만 쓴다. ?debug는 위치와 퍼즐 단계를 읽는 데만 쓴다.
//   FACE_TEST_BASE_URL=http://localhost:3010 FACE_TEST_SHOTS=/tmp/shots node tests/face-auth.browser.cjs [pc|mobile] [standard|exception]
// 소프트웨어 렌더링에서는 몇 fps밖에 나오지 않아 실제 걸음·시간 감각과는 다르다. 아래 시간 기록은 참고용이다.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

const BASE = process.env.FACE_TEST_BASE_URL || "http://localhost:3010";
const SHOTS = process.env.FACE_TEST_SHOTS || "";
const only = process.argv.slice(2);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// 장치 정면 2m 앞 (zones.ts FACE_MACHINE: [3.3, 0, 1.3], rotY -0.55)
const MACHINE = { x: 3.3, z: 1.3, rot: -0.55 };
const at = (lx, lz) => ({ x: MACHINE.x + lx * Math.cos(MACHINE.rot) + lz * Math.sin(MACHINE.rot), z: MACHINE.z - lx * Math.sin(MACHINE.rot) + lz * Math.cos(MACHINE.rot) });
const STAND = at(0, 2);
const STD = at(-0.58, 0.55);
const KEEP = at(0.58, 0.55);

async function play(browser, mobile, method, bell) {
  const W = mobile ? 390 : 960;
  const H = mobile ? 780 : 600;
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, locale: "ko-KR" });
  const page = await context.newPage();
  page.setDefaultTimeout(240000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem("face-test")) return;
    sessionStorage.setItem("face-test", "1");
    localStorage.clear();
    localStorage.setItem("sanlee-lang", "ko");
    localStorage.setItem("sanlee-sfx", "0");
  });
  const tag = `${mobile ? "mobile" : "pc"}-${method}`;
  const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${tag}-${name}.png`, timeout: 240000 });
  const log = (...a) => console.log(`[${tag}]`, ...a);
  const t0 = Date.now();
  const sec = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";

  await page.goto(`${BASE}/deleteseoul?debug&fx=off`);
  await page.getByRole("button", { name: "방공호로 들어가기", exact: true }).click();
  await page.waitForFunction(() => window.__neo?.face);
  // 자막은 실제 시간으로 지나가므로, 뜬 자막을 모두 모아 두었다가 확인한다
  const watchLines = () =>
    page.evaluate(() => {
      window.__lines = window.__lines || [];
      new MutationObserver(() => {
        const t = document.querySelector(".face-line")?.textContent;
        if (t && window.__lines[window.__lines.length - 1] !== t) window.__lines.push(t);
      }).observe(document.body, { subtree: true, childList: true, characterData: true });
    });
  await watchLines();
  const seen = async (text) => (await page.evaluate(() => window.__lines)).some((l) => l.includes(text));
  const pos = () => page.evaluate(() => window.__neo.pos());
  const rt = () => page.evaluate(() => window.__neo.face.rt());
  const prompt = () => page.evaluate((m) => document.querySelector(m ? ".jump-btn.act" : ".prompt")?.textContent ?? "", mobile);

  // 새 플레이어: 화살표는 장치를 가리키고, HUD에 터미널 진행(0/3)이 없다
  await page.waitForFunction(() => document.querySelector(".quest-label")?.textContent === "얼굴을 맞추십시오");
  assert.equal(await page.locator(".hud-progress").count(), 0);

  // ---- 이동 (PC: 키보드, 모바일: 조이스틱과 화면 끌기) ----
  let cdp = null;
  if (mobile) cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const hold = async (key, ms) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  };
  const turnBy = async (d) => {
    if (!mobile) return hold(d > 0 ? "ArrowLeft" : "ArrowRight", Math.min(700, Math.max(90, Math.abs(d) * 500)));
    // 화면 오른쪽을 가로로 끈다 (0.0055 rad/px)
    const px = Math.max(-140, Math.min(140, d / 0.0055));
    const x = W * 0.72;
    const y = H * 0.35;
    await touch("touchStart", [{ x, y, id: 2 }]);
    for (let k = 1; k <= 4; k++) await touch("touchMove", [{ x: x - (px * k) / 4, y, id: 2 }]);
    await touch("touchEnd", []);
  };
  const forward = async (ms) => {
    if (!mobile) return hold("KeyW", ms);
    const x = 70;
    const y = H - 110;
    await touch("touchStart", [{ x, y, id: 1 }]);
    await touch("touchMove", [{ x, y: y - 60, id: 1 }]);
    await page.waitForTimeout(ms);
    await touch("touchEnd", []);
  };
  const turnTo = async (yaw, tol = 0.06) => {
    for (let i = 0; i < 80; i++) {
      const d = wrap(yaw - (await pos())[2]);
      if (Math.abs(d) < tol) return;
      await turnBy(d);
    }
    throw new Error("turn did not converge");
  };
  const walkTo = async ({ x, z }, tol = 0.35) => {
    for (let i = 0; i < 200; i++) {
      const [px, pz, yaw] = await pos();
      const dist = Math.hypot(x - px, z - pz);
      if (dist < tol) return;
      const want = Math.atan2(-(x - px), -(z - pz));
      if (Math.abs(wrap(want - yaw)) > 0.2) await turnTo(want, 0.1);
      else await forward(Math.min(1400, 250 + dist * 450));
    }
    throw new Error("walk did not converge");
  };
  const faceTo = async (p) => {
    const [px, pz] = await pos();
    await turnTo(Math.atan2(-(p.x - px), -(p.z - pz)), 0.07);
  };
  // 위아래 시선 (PC: 마우스, 모바일: 화면 끌기)
  let mouse = { x: W / 2, y: H / 2 };
  const tilt = async (dy) => {
    if (mobile) {
      const x = W * 0.72;
      const y = H * 0.4;
      await touch("touchStart", [{ x, y, id: 3 }]);
      await touch("touchMove", [{ x, y: y + dy, id: 3 }]);
      await touch("touchEnd", []);
      return;
    }
    // 잠긴 마우스를 움직인다. 헤드리스 Chromium은 잠금 중 movementY를 0으로 보내므로,
    // 같은 mousemove 처리기로 movementY가 담긴 이벤트를 보낸다 (게임 쪽 입력 경로는 그대로)
    await page.evaluate((dy) => window.dispatchEvent(new MouseEvent("mousemove", { movementX: 0, movementY: dy })), dy);
    await page.waitForTimeout(300);
  };
  const tap = async (id) => {
    const s = (await rt()).screen[id];
    assert.ok(s && s[0] >= 0 && s[0] <= 1 && s[1] >= 0 && s[1] <= 1, `${id} on screen`);
    await page.touchscreen.tap(s[0] * W, s[1] * H);
  };

  // ---- A 발견: 장치 앞까지 걸어간다 ----
  await walkTo(STAND);
  await faceTo({ x: MACHINE.x, z: MACHINE.z });
  await page.waitForFunction((m) => (document.querySelector(m ? ".jump-btn.act" : ".prompt")?.textContent ?? "").includes("돌리기"), mobile);
  assert.ok((await rt()).wokeAt > 0, "the bulb woke up on approach");
  log("reached machine", sec());
  await shot("1-discover");
  if (!mobile) {
    // 마우스를 잠근다 (첫 클릭은 잠금만, 상호작용이 아니다)
    for (let k = 0; k < 6 && !(await page.evaluate(() => !!document.pointerLockElement)); k++) {
      await page.mouse.move(mouse.x, mouse.y);
      await page.mouse.click(mouse.x, mouse.y);
      await page.waitForTimeout(1200);
    }
    assert.ok(await page.evaluate(() => !!document.pointerLockElement), "mouse locked");
  }

  // ---- B 회전: 원통마다 맞을 때까지 한 칸씩 ----
  const tStart = Date.now();
  let seamSeen = false;
  for (const i of [1, 0, 2]) {
    if (!mobile) {
      for (let k = 0; k < 30 && (await rt()).aim !== i; k++) await tilt((await rt()).aim > i ? -18 : 18);
      assert.equal((await rt()).aim, i, `aimed drum ${i}`);
    }
    for (let k = 0; k < 3 && (await rt()).drums[i] !== 0; k++) {
      const before = (await rt()).drums[i];
      if (mobile) await tap(`drum-${i}`);
      else await page.keyboard.press("KeyE");
      await page.waitForFunction(([i, b]) => window.__neo.face.rt().drums[i] !== b, [i, before]);
      await page.waitForTimeout(500);
    }
    const d = (await rt()).drums;
    if (!seamSeen && ((d[0] === 0 && d[1] === 0) || (d[1] === 0 && d[2] === 0)) && d.some((x) => x !== 0)) {
      seamSeen = true;
      await shot("2-seam");
    }
  }
  assert.ok(seamSeen, "a partial seam was joined before the end");
  log("matched in", ((Date.now() - tStart) / 1000).toFixed(0) + "s");

  // ---- C 반전 ----
  // 연출은 실제 시간으로 흐르고, 느린 환경의 스크린숏은 몇 초씩 걸리므로 단계가 지나갔으면 건너뛴다
  const phaseIn = (list) => page.waitForFunction((l) => l.includes(window.__neo.face.rt().phase), list);
  assert.notEqual((await rt()).phase, "idle");
  if ((await rt()).phase === "restored") await shot("3-restored");
  await phaseIn(["twist", "choice"]);
  if ((await rt()).phase === "twist") await shot("4-twist");
  await phaseIn(["choice"]);
  assert.ok(await seen("원본 얼굴 복원 완료."), "machine said restored");
  assert.ok(await seen("표준 미소가 누락되었습니다."), "city voice");
  assert.equal((await page.evaluate(() => window.__neo.face.state())).method, null);

  // 고르기 전에 나갔다 와도 맞춘 얼굴과 선택 단계가 남는다
  await page.reload();
  await page.getByRole("button", { name: "방공호로 들어가기", exact: true }).click();
  await page.waitForFunction(() => window.__neo?.face && window.__neo.face.rt().phase === "choice");
  await watchLines();
  log("reload keeps choice", sec());
  // 다시 들어오면 입구에서 시작한다: 화살표를 따라 장치로 돌아간다
  await page.waitForFunction(() => document.querySelector(".quest-label")?.textContent === "얼굴을 맞추십시오");
  if (!bell) await walkTo(STAND);

  // ---- 범종 (선택 사항): 얼굴을 맞춘 뒤 치고 돌아오면, 느린 환경에서는 보호가 끝나 확인을 받는다 ----
  if (bell) {
    await walkTo({ x: -2.6, z: 3.4 });
    await walkTo({ x: -3.8, z: -5.6 });
    await faceTo({ x: -5, z: -8.2 });
    await page.waitForFunction((m) => (document.querySelector(m ? ".jump-btn.act" : ".prompt")?.textContent ?? "").includes("종 치기"), mobile);
    await page.waitForFunction(() => document.querySelector('[aria-label="기록 보호 장치 상태"]'));
    if (mobile) await page.locator(".jump-btn.act").tap();
    else await page.keyboard.press("KeyE");
    await page.waitForFunction(() => window.__neo.recordProtection.snapshot().active);
    log("bell rung", sec());
    await shot("5-bell");
    await walkTo({ x: -2.6, z: 3.4 });
    await walkTo(STAND);
  }

  // ---- D 선택 ----
  const target = method === "standard" ? STD : KEEP;
  const label = method === "standard" ? "표준 미소 적용" : "원본 얼굴 보존";
  if (!mobile) {
    await faceTo(target);
    for (let k = 0; k < 6 && !(await prompt()).includes(label); k++) await turnBy(method === "standard" ? 0.08 : -0.08);
    assert.ok((await prompt()).includes(label), `prompt shows ${label}`);
  } else await faceTo({ x: MACHINE.x, z: MACHINE.z });
  await shot("6-choice");
  const protectedAtPress = await page.evaluate(() => window.__neo.recordProtection.snapshot().active);
  if (mobile) await tap(method === "standard" ? "std" : "keep");
  else await page.keyboard.press("KeyE");
  let expectRecord = !protectedAtPress;
  if (bell && !protectedAtPress) {
    // 보호가 끝났다: 기록이 남는다는 확인 없이는 실행되지 않는다
    await page.getByRole("dialog", { name: "범종의 보호가 끝났습니다" }).waitFor();
    assert.equal((await page.evaluate(() => window.__neo.face.state())).method, null);
    await shot("6b-expired");
    await page.getByRole("button", { name: "그대로 실행", exact: true }).click();
    log("expired → confirmed", sec());
  }
  await phaseIn(["applying", "wake", "done"]);
  const records = await page.evaluate(() => window.__neo.citizenRecords.read().pending.filter((x) => x.kind === "face.authenticate"));
  assert.equal(records.length, expectRecord ? 1 : 0, "citizen record only when unprotected");
  if (expectRecord) assert.equal(records[0].sourceId, method);
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("sanlee-face-auth-v1"))).method, method);
  if ((await rt()).phase === "applying") await shot("7-applying");

  // ---- E 부분 복원 ----
  const tWake = Date.now();
  await phaseIn(["wake", "done"]);
  if ((await rt()).phase === "wake") await shot("8-wake");
  await phaseIn(["done"]);
  assert.ok(await seen(method === "standard" ? "더 나은 당신을 환영합니다" : "비표준 얼굴로 등록됩니다"), "machine executed the choice");
  assert.ok(await seen("고마워"), "San says thanks");
  assert.ok(await seen("다리는 아직 돌"), "legs stay stone");
  log("restoration took", ((Date.now() - tWake) / 1000).toFixed(0) + "s (real time, slow renderer)");
  await page.getByRole("dialog", { name: "이산이 고개를 들었습니다" }).waitFor();
  await shot("9-end");
  assert.equal(await page.evaluate(() => document.querySelector(".quest-label")?.offsetParent ?? null), null);
  await page.getByRole("button", { name: "계속 둘러보기", exact: true }).click();
  await page.waitForTimeout(1500);
  await shot("10-after");

  // 새로고침: 깨어난 이산과 선택이 그대로, 끝 카드는 다시 뜨지 않는다
  await page.reload();
  await page.getByRole("button", { name: "방공호로 들어가기", exact: true }).click();
  await page.waitForFunction(() => window.__neo?.face && window.__neo.face.rt().phase === "done");
  assert.equal(await page.getByRole("dialog", { name: "이산이 고개를 들었습니다" }).count(), 0);
  assert.deepEqual(errors, []);
  log("PASS", sec());
  await context.close();
}

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const runs = [
      [false, "exception", false],
      [false, "standard", true],
      [true, "standard", false],
      [true, "exception", false],
    ].filter(([m, method]) => (!only.includes("pc") && !only.includes("mobile")) || only.includes(m ? "mobile" : "pc")).filter(([, method]) => !only.some((o) => o === "standard" || o === "exception") || only.includes(method));
    for (const [mobile, method, bell] of runs) await play(browser, mobile, method, bell);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
