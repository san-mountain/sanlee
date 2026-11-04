# DELETE SEOUL — Chase Prototype (rebuild)

Route: `/deleteseoul-lab/chase` (unlisted, `noindex`). The public `/deleteseoul` route and its input code are untouched.

## Scope
ACT 2 late → ACT 3. First device is assumed restored (ACT 1).

1. Alley: San opens a shutter the player can't open (cooperation). "너 혼자였으면 여기서 막혔을 거야."
2. Second restoration device. Hold to restore. San's warning ("잠깐. 그건 건드리지 마.") fires *while* the player is holding.
   Releasing after the warning gets its own reaction ("……고마워." → "근데 그게 꺼져 있으면, 저 앞 문도 안 열려."). The device is still required.
3. Surge: alley lamps on → "……젠장." → "전력만 돌아오는 게 아니야." → silence → the giant searchlight at the end of the street turns on (view is gently turned toward it) → `[미등록 개체 감지]` → "뛰어!"
4. Chase: four searchlights. Ground circle = detection zone. Cover breaks the line from the (low, forward) light source to the player's chest.
   Exposure fills the meter; a light that sees you for 0.35 s starts tracking you (slower than running). Out of sight → meter decays (faster in cover).
5. Gate: hold at the control panel for 3.2 s total (progress is kept, decays slowly). The big light passes over the panel every ~10 s; San watches from cover and calls "숨어!" / "지금!".
6. Escape: gate opens → stairs of 을지로3가 station exit 2. Reaching the stairs completes the prototype.

Fail → "위치 확인됨" → retry from checkpoint (chase start, or past the gate). Repairs/gate stay done; no long dialogue replays.
On the first retry only, San remembers: "이번에는 오른쪽으로 가 보자. 아까는 왼쪽에서 막혔잖아." (side computed from where you were caught).

## Code
`src/explore/v3/chase/`
- `input.ts` — the only input system for this route (keyboard, mouse + pointer lock, touch). Independent of `src/explore/input.ts`.
- `level.ts` — geometry/numbers shared by rules and rendering.
- `logic.ts` — pure TS game state + `stepGame()`; all timers are simulation time, so pause freezes everything. Tested in `tests/delete-seoul-chase.test.mjs`.
- `Scene.tsx` — R3F scene; reads only `gameRef`. No shadows, no postprocessing, ≤3 real lights; light pools and beams are additive meshes.
- `ChaseGame.tsx` — screens, HUD (React state updated ≤10×/s and only when the summary changes), sfx.

## Mobile joystick: root cause of the old bug
The old start button called `requestPointerLock()` on touch devices too. When the browser grants it, the whole `main` is locked:
`setPointerCapture` throws `InvalidStateError`, touch drags never reach look/move, and every tap is treated as "interact".
On top of that two joysticks were mounted (legacy `.joy-zone` and `ChaseTouchOverlay`), and the overlay also covered the start button on phones.

New rules: lock only for `pointerType === "mouse"`; touch pointers are split by `pointerId` (first finger on the left 45% = move, others = look);
no `setPointerCapture`; window-level move/up; release everything on `pointerup/cancel`, blur, resize, orientationchange, visibility hidden.

## Controls
Desktop: WASD/arrows, Shift run, mouse look (click to lock), hold E/Space/left-click to interact, Esc/P pause.
Mobile: press-and-drag anywhere on the left = move (push to the edge = run), drag on the right = look, hold the action button.

## Quality
`low` (DPR 1, no AA, no rain, fewer skyline towers) is the default on touch devices; `high` (DPR ≤1.5, AA, rain) on desktop.
Auto-drops to `low` after 5 s under 40 fps. Override: `?q=low|high`. Choice is remembered.

## Debug
`?debug` shows joystick vector, pointers, lock, hold, player position, phase, meter, San. It also exposes `window.__chase` for automated tests.
