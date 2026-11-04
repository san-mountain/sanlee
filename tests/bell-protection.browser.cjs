// 이미 Playwright와 Chromium이 제공되는 개발 환경에서 실행하는 선택적 브라우저 검증.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseURL = process.env.BELL_TEST_BASE_URL || "http://127.0.0.1:3010";
const ledgerKey = "sanlee-citizen-records-v1";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 760 } : { width: 1280, height: 800 },
        isMobile: mobile, hasTouch: true, locale: "ko-KR", reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => {
        if (!sessionStorage.getItem("bell-test-seeded")) {
          localStorage.setItem("sanlee-lang", "ko");
          localStorage.setItem("sanlee-sfx", "0");
          localStorage.setItem("sanlee-met", "1");
          localStorage.setItem("sanlee-promise", "1");
          localStorage.setItem("sanlee-backup", JSON.stringify({ n: 7, list: [{ n: 7, t: 123, x: 2, z: 3 }], deaths: 1, restores: 2, deleted: false }));
          sessionStorage.setItem("bell-test-seeded", "1");
        }
        document.addEventListener("DOMContentLoaded", () => {
          document.documentElement.requestFullscreen = () => Promise.reject(new Error("Keep test viewport"));
        });
      });
      await page.goto(`${baseURL}/deleteseoul?debug&fx=off`);
      await page.waitForFunction(() => window.__neo?.citizenRecords && document.querySelector("canvas"));
      await page.getByRole("button", { name: "방공호로 들어가기", exact: true }).click();
      assert.equal(await page.evaluate(() => window.__neo.citizenRecords.commit("before").status), "recorded");

      // 기존 디버그 이동만 사용하고, 작동 자체는 실제 상호작용 키/모바일 버튼으로 실행한다.
      await page.evaluate(() => window.__neo.tp(-5, -6.9, 0));
      const bellAction = mobile ? page.locator(".jump-btn.act") : page.locator(".prompt");
      await page.waitForFunction(() => document.querySelector(".prompt, .jump-btn.act")?.textContent.includes("종 치기"));
      if (mobile) await bellAction.tap(); else await page.keyboard.press("KeyE");
      await page.waitForFunction(() => window.__neo.recordProtection.snapshot().active);
      const firstStart = await page.evaluate(() => window.__neo.recordProtection.snapshot().startedAt);
      if (mobile) await bellAction.tap(); else await page.keyboard.press("KeyE");
      assert.equal(await page.evaluate(() => window.__neo.recordProtection.snapshot().startedAt), firstStart);
      assert.equal(await page.evaluate(() => window.__neo.citizenRecords.commit("protected-action").status), "protected");
      const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), ledgerKey);
      assert.equal(before.pending.length, 1);

      await page.evaluate(() => window.__neo.tp(-8.8, -4, Math.PI / 2));
      await page.waitForFunction(() => document.querySelector(".prompt, .jump-btn.act")?.textContent.includes("ABOUT"));
      if (mobile) await page.locator(".jump-btn.act").tap(); else await page.keyboard.press("KeyE");
      await page.locator(".panel-head h2").filter({ hasText: "ABOUT" }).waitFor();
      assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem("sanlee-visited")))).includes("about"));
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("sanlee-backup")).n), 7);
      assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).pending.length, ledgerKey), 1);
      await page.waitForFunction(() => !window.__neo.recordProtection.snapshot().active, null, { timeout: 15000 });
      await page.getByRole("status").filter({ hasText: "로컬 기록 수집" }).waitFor();
      assert.equal(await page.evaluate(() => window.__neo.citizenRecords.commit("after").status), "recorded");
      await page.keyboard.press("Escape");

      await page.evaluate(() => window.__neo.goTo("city"));
      await page.waitForFunction(() => window.__neo.citizenRecords.read().synced.length === 2);
      const synced = await page.evaluate(() => window.__neo.citizenRecords.read());
      assert.equal(synced.pending.length, 0);
      assert.deepEqual(synced.synced.map((entry) => entry.sourceId), ["before", "after"]);
      await page.reload();
      await page.waitForFunction(() => window.__neo?.citizenRecords);
      assert.deepEqual(await page.evaluate(() => window.__neo.citizenRecords.read()), synced);
      await page.getByRole("button", { name: "방공호로 들어가기", exact: true }).click();
      await page.locator(".hud a").evaluate((link) => link.click());
      await page.waitForURL(`${baseURL}/`);
      await page.getByRole("button", { name: "이 기기의 도시 기록 지우기", exact: true }).click();
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), ledgerKey), null);
      assert.equal(await page.evaluate(() => localStorage.getItem("sanlee-backup")), null);
      assert.equal(await page.evaluate(() => localStorage.getItem("sanlee-sfx")), "0");
      if (mobile) {
        await page.locator(".seal").tap();
        await page.locator(".seal").tap();
      } else {
        await page.locator(".nav-explore-pill").click();
      }
      await page.waitForURL(`${baseURL}/deleteseoul`);
      assert.deepEqual(await page.evaluate(() => window.__neo.citizenRecords.read()), { schema: 1, pending: [], synced: [] });
      assert.equal(await page.evaluate(() => window.__neo.recordProtection.snapshot().startedAt), null);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ mobile, protectedProgressSaved: true, protectedRecordsAbsentAfterSyncAndReload: true, footerDeletionClearedMemory: true, pageErrors: errors }));
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
