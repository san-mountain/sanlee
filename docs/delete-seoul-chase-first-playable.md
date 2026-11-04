# DELETE SEOUL — Prototype: 도입부 → 추격 (rebuild)

Route: `/deleteseoul-lab/chase` (unlisted, `noindex`). The public `/deleteseoul` route and its input code are untouched.

## Scope
현재 구현 범위: ACT 1 도입 → ACT 2 → ACT 3 추격 종료(지하철 계단)까지. 계단 도착은 **현재 구현 구간의 끝**이며 이야기의 결말이 아니다.

1. **혼자 시작 (intro)** — 정전된 막다른 통로 B-2. 이산은 보이지도, 움직이지도, 말하지도 않는다. 시스템 표시 `[통로 B-2 · 전원 없음]`.
   통로 문 옆 서쪽 벽의 작은 분전함 「국소 전원 · 통로 B-2 / 연결: 통로 문 · 통로 조명 · 셔터 제어」에서 가는 케이블이 문틀로, 문 위를 건너 동쪽 벽을 따라 골목 안쪽 셔터 제어판까지 이어진다.
2. **첫 번째 장치 (국소 전원)** — 길게 눌러 복구하면 통로 문만 열리고 통로 조명만 켜진다. 셔터 제어판이 꺼짐 → 주황(잠김)으로 바뀐다.
3. **첫 만남 (meet)** — 문 너머 벽감에 웅크린 이산이 조명에 드러난다. 서로 모르는 사이: "……누구야." → "그거, 네가 켰어?" → "이 길, 안쪽 셔터에서 한 번 더 막혀." → "……나도 저쪽으로 가야 해." (같은 통로를 지나야 한다는 상황이 임시 동행의 이유)
4. **셔터 협력 (approach)** — 이산이 제어판으로 가서 셔터를 연다. "됐다." HUD는 이산을 따라가라고 지시하지 않는다(목표: 골목 안쪽 셔터로).
5. **두 번째 장치 (relay, 구역 전원)** — 교차로에서 이산: "큰길 문은 죽어 있어. 전원이 안 들어와." 장치 표기 「구역 전원 · 7구역 / 연동: 큰길 차단문 · 감시망」, 굵은 케이블이 서쪽 벽을 따라 큰길로 가서 머리 위로 길을 건너 감시탑에 닿고, 차단문 제어판으로도 분기한다. 차단문 제어판은 이 장치 전까지 꺼져 있다.
   플레이어가 장치 앞에 서면 이산도 다가온다. 누르는 도중 이산이 케이블을 알아본다: "잠깐." → "그 선… 감시탑까지 이어져 있어." (금지가 아니라 위험의 발견)
   손을 떼면: "……" → "다른 길은 없어. 저 문도 이 전원을 써." → "켜면, 바로 뛸 준비 해." (선택이 끝난 것처럼 말하지 않는다. 장치는 여전히 필요)
6. **감시 재가동 (surge)** — 골목 조명 점등 → "……젠장." → "전력만 돌아오는 게 아니야." → 정적 → 큰길 끝 거대 감시등 점등. 빛이 큰길을 거슬러 올라와 **이산을 훑고**(시선이 빛을 따라감), 이산이 웅크리는 순간 `[미등록 개체 감지]` → "뛰어!" 이 연출 동안 플레이어 탐지는 없다.
7. **추격 (chase)** — 감시등 4개, 엄폐, 탐지 게이지, 추적. 추격 시작 직후 유예 시간에는 감시등이 플레이어를 쫓지 않는다.
8. **차단문** — 누적 3.2초. 이산이 망을 보며 "숨어!" / "지금!".
9. **탈출 (escape)** — 을지로3가역 2번 출구 계단 도착 → 완료 화면 「현재 구현 구간 끝」.

실패 → 체크포인트(추격 시작 / 차단문 통과 후)에서 재시도. 도입부와 첫 만남은 반복하지 않는다. "처음부터"는 도입부(혼자)부터.
첫 재시도에서만 이산이 실패를 기억하는 대사를 한다.

### 아직 구현하지 않은 범위 (후반 스토리)
- ACT 4 지하 기록실: 2026년 개발 기록 발견, NPC 이산의 원래 역할(안내·행동 범위·마지막 대사·경로 이탈 시 초기화)
- 이산의 정체 공개와 자기 인식
- ACT 5 최종 선택: 정상 경로(초기화) / 비정상 경로(미완성 공간)와 각 엔딩

## Code
`src/explore/v3/chase/`
- `input.ts` — the only input system for this route (keyboard, mouse + pointer lock, touch). Independent of `src/explore/input.ts`.
- `level.ts` — geometry/numbers shared by rules and rendering.
- `logic.ts` — pure TS game state + `stepGame()`; all timers are simulation time, so pause freezes everything. `tests/delete-seoul-chase.test.mjs` still describes the pre-intro flow (game started at `approach`) and needs updating before it is run again.
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
