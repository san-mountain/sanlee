# Puzzle B — The sealed three seconds (`/deleteseoul`)

> **Legacy.** Feature of the published `/deleteseoul` work. Does not apply directly to the chase prototype (`/deleteseoul-lab/chase`).
> This describes current behaviour (merged from the v0.7–v0.9 change notes).

A sliding-block puzzle found in the 3D bunker and solved on a 2D panel.

## Story
- San refused the city's location/activity tracking cookies and was frozen as an "inactive citizen".
- The official record says `14:02:01 — 모두 동의`. The goal is to extract the sealed red original cassette.
- Before solving: the official record shows a `자동 정정 완료` trace but hides the original input.
- After solving: one screen shows `실제 입력: 모두 거부 → SEOUL.SYS 강제 정정 → 도시 공식 기록: 모두 동의`. Only the consent record was changed; there is no activity data, so San stays frozen.
- `SEOUL.SYS` is the actor before B; the name 대자비 is introduced above ground. A separate refuser-management cookie remains (used by the refusal ending).

## Flow
1. After Puzzle A, control returns. Approaching within **6 m** of the audit machine starts the intro automatically (the open button range is 3.6 m and stays inactive until the intro ends). Saves that already saw the intro open the panel directly.
2. Intro (`auditScenes` in `story.ts`): the official record, then San's lines on what the cookie records, why he refused and the contradiction, then the camera shows `수정 전 원본 기록 — 봉인됨`. Text and lines advance manually (다음, or E/Enter on PC); camera and machine motion are automatic.
3. Open with E/click (PC) or tap/action button `기록 열기` (mobile). The camera moves to the seal grid (0.55 s, no movement), then the 2D panel zooms in. While open, movement, jump, joystick and look are off and pointer lock is released. 나가기 or Esc zooms back out; progress is kept.
4. Completion (no extra confirm, Esc ignored while reading): cassette ejects → panel darkens → "원본 판독 중" → `14:02:01 — 모두 거부` in red with the comparison → panel closes to 3D, cassette sits on the tray → city line `b.city.forced-correction` → San `b.san.refused`, `b.san.still-here` (legs still stone) → guarantor unit lights with `b.guarantor.required` → prototype end card. Each line advances manually. There is no Puzzle C.

## Puzzle rules (`src/explore/sealPuzzle.ts`, pure functions)
- 6×6 grid. The 2-wide cassette is on row 2 (0-based) and exits right.
- Horizontal blocks move left/right, vertical blocks up/down; no overlap, no leaving the board, no jumping.
- One move = one push of one block in one direction, any distance. Zero-distance is not a move.
- Solved the moment the cassette reaches the two right-most cells.

```
B . . . C D
B E E E C D
B R R . C D   → exit
. . . . . .
. . A G F F
. . A G . .
```
- Shortest solution 11 moves (BFS, 1066 states), e.g. B↓3 · R←1 · A↑2 · G↑2 · F←3 · C↓3 · D↓3 · E→2 · A↑2 · G↓1 · R→4.
- Dependency chain: C·D must drop → F must move → A·G must rise → A then blocks the cassette row, so E slides to let A go fully up → the cassette must first move left → B must drop. Moving any single blocker alone does not open the path (tested). Dragging the cassette right first moves one cell and stops.

## Panel feel (`src/explore/SealPanel.tsx`)
- Drag blocks directly (Pointer Events). Blocks follow their axis only; at a wall they give 0.08 cell, then stop with a dull sound and a short darkening.
- Release snaps to the nearest cell. Only a changed cell counts as a move (metal scrape sound). Presses under 5 px are ignored. One block at a time; `touch-action: none`.
- An OS interruption or cancelled pointer capture during a drag does not commit the move.
- UI: one goal line ("원본 기록을 꺼내세요"), undo, restart, exit. Groove direction shows the axis. Landscape phones put text and buttons beside the board.
- Board width fits narrow screens; the comparison wraps and scrolls inside. The completion popup stays centred (opacity-only animation).

## 3D interaction UX (shared with Puzzle A)
- Targets near screen centre are preferred, with slight stickiness to the previous target.
- One small SVG hologram frame marks the single selected target on PC and mobile (no lines or labels; hidden in panels, cutscenes and the 2D puzzle). On PC the centre crosshair is hidden while a target is selected.
- Mobile has separate jump and action buttons. Action labels are short verbs: `원통 돌리기`, `표준 적용`, `원본 유지`, `기록 열기`, `대화`.
- NPC and statue interaction ranges are +2 m and +1.5 m; machine ranges are unchanged. Quest arrow is larger gold with a dark backing, shown until 2.15 m from the goal.
- All A/B subtitles sit on a translucent black backing.
- The cookie next to San is visible before and after face restoration; the refusal ending shows one cookie.

## Save (`sanlee-record-audit-v3`)
`{ schema: 3, intro, seal: { pos, history }, solved, done }`
- Saved on every move; leaving or reloading keeps the layout and undo history.
- On load the history is replayed with the rules; any invalid move resets only the seal layout.
- 처음부터 resets only the layout (intro and A untouched). 되돌리기 undoes the last valid move.

| Older save | Result |
| --- | --- |
| v0.6 `sanlee-record-audit-v2` `solved` | B complete (cassette out, guarantor on) |
| v0.4/v0.5 `sanlee-record-audit-v1` `done`/`taken` | B complete |
| Mid-B save from older versions | New puzzle from the intro |
| A v3 save exists | Older keys are ignored |

Older keys are read-only and are deleted on progress reset, city-record deletion and test restart. Legacy saves do not power the device.

## Citizen activity
`audit.extract` is evaluated once when the cassette ejects; nothing is recorded during bell protection. The result appears as one line on the end card, separate from puzzle progress.

## Test restart (debug)
`/deleteseoul?debug` adds a 테스트 group to settings (Esc or ⚙); the B end card also shows the B restart button.
- **A부터 다시 플레이**: resets A and B, start position of A, San fully stone.
- **B부터 다시 플레이**: keeps A and its choice, resets B (intro plays again even if B was finished). San's face/torso restored, legs stone.
- Console: `__neo.restartA()` / `__neo.restartB()`.
- A restart cuts running lines, timers, cutscenes, the 2D panel and end cards, resets the 3D runtime, and stores the start point in sessionStorage so it survives reload.
- Backup and restore: the first test restart snapshots A/B progress and the older keys (never overwritten by later restarts). **원래 진행으로 돌아가기**, or opening the route without `?debug`, restores the original A/B saves. If a snapshot cannot be made (storage full), the restart is refused.
- Visited terminals, endings, backups, citizen records and portfolio data are not touched.

## Tests
- `tests/seal-puzzle.test.mjs`: layout, BFS shortest 11, dependencies, moves/collisions, undo/restart, save validation.
- `tests/record-audit.test.mjs`: A→B entry, solve, reload restore, older-save migration, A/B restarts, city-record deletion, line IDs and intro content, no answer leakage, post-solve lines.
