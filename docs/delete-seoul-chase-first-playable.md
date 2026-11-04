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
7. **추격 (chase)** — 세 구간, 세 가지 판단. 추격 시작 직후 유예 시간(1.6초)에는 감시등이 플레이어를 쫓지 않는다.
   - 첫 구간(L1): 큰길을 가로지르는 왕복 하나(z -12, 11.2초 주기). 정류장 북쪽이 확실한 그늘. 이산이 먼저 정류장 뒤로 숨어 보여 준다.
   - 중간 구간(L2): 승합차(서쪽) / 매점(동쪽) 두 갈래를 가로지르는 왕복(z -21.5, 10.5초 주기). 빛이 반대편에 있을 때가 각 갈래의 틈. L1·L2 사이 z -15 ~ -18은 어느 빛도 닿지 않는 숨 고를 띠.
   - 차단문 구간(L3): 차단문 남쪽 서쪽 모서리 탑에서 내려 쏘는 거대 감시등이 제어판 앞을 약 9.7초마다 지나간다. 화물차 동쪽 틈(그늘) ↔ 제어판을 오가는 판단.
8. **차단문** — 누적 3.2초. 화물차 옆에서 망보는 이산이 제어판 위치의 실제 위험(켜진 모든 등, 차폐, 진행 방향)으로 "숨어!" / "지금!".
9. **탈출 (escape)** — 을지로3가역 2번 출구 계단 도착 → 완료 화면 「현재 구현 구간 끝」.

실패 → 체크포인트(추격 시작 / 차단문 통과 후)에서 재시도. 도입부와 첫 만남은 반복하지 않는다. "처음부터"는 도입부(혼자)부터.
첫 재시도에서만 이산이 실패를 기억하는 대사를 한다.

### 아직 구현하지 않은 범위 (후반 스토리)
- ACT 4 지하 기록실: 2026년 개발 기록 발견, NPC 이산의 원래 역할(안내·행동 범위·마지막 대사·경로 이탈 시 초기화)
- 이산의 정체 공개와 자기 인식
- ACT 5 최종 선택: 정상 경로(초기화) / 비정상 경로(미완성 공간)와 각 엔딩

## 탐지 규칙 (초기 조정값, 체감 난이도는 미검증)
게이지는 "감시망이 내 위치를 얼마나 확정했는가"다. 1.0이면 실패.
- 상승: 반경 60% 안 중심부 1/3.0 /s(0에서 3.0초), 가장자리 1/5.0 /s(0에서 5.0초). 겹친 등은 더하지 않고 가장 강한 하나.
- 추적: 같은 등에 연속 0.8초 비치면 그 등이 추적(빨강) 시작. 끊기면 연속 노출 값이 초당 2.0씩 준다. 추적 속도는 순찰 속도×0.95(최대 4.0m/s, 달리기 6.3m/s).
- 수색: 추적 대상이 1.0초 이상 안 보이면 마지막으로 본 자리를 2.4초 훑고(주황) 순찰로 돌아간다.
- 하강: 반경 안에서 가려짐(엄폐 중) 0.40/s, 시야 밖 0.22/s.
- 유예 시간에는 게이지가 오르지 않고, 연속 노출 값도 쌓지 않는다.
- "엄폐 중"은 빛의 반경 안이지만 광원→몸통 시야가 엄폐물·건물·닫힌 문에 막힌 경우에만 뜬다. 판정과 같은 값.
- 감시등 색: 흰빛 순찰 → 호박색(플레이어를 비추는 중, 추적까지 남은 시간만큼 진해짐) → 빨강 추적 → 주황 수색.
- 이산도 같은 빛에 노출된다(웅크리면 몸통 0.8m). 이산의 노출은 플레이어 게이지에 더하지 않고, 이산을 본 등은 이산을 쫓는다.

## 이산의 이동과 경고
- 반경 0.32m 원으로 건물·엄폐물·닫힌 문과 충돌한다. 이동 선분까지 확인하고, 막히거나 밀려 멈추면 경로를 다시 찾는다. 길이 없으면(닫힌 문) 제자리에서 기다린다. 순간이동하지 않는다. 계단에서는 같은 바닥 높이 함수를 따른다. (`nav.ts`)
- 추격: 안전한 엄폐 지점에서 웅크려 대기 → 플레이어가 7m 안에 오고 다음 구간을 달리는 동안·도착 후 0.8초 동안 켜진 등에 걸리지 않을 때 출발 → 다음 지점 도착 → 대기. 숨을 자리는 감시등 배치에서 계산한 "순찰 경로가 닿지 않거나 광원 시야가 막힌" 지점. 노출되면 가장 가까운 안전 지점으로 피한다.
- 경고 대사(탐지 직후, 이번 프레임 위치 기준. 근거가 없으면 침묵, 이산이 노출됐거나 피하는 중이면 침묵):
  - "몸 숨겨!"(긴급, 4초 간격): 실제 노출로 게이지 0.08 초과 또는 추적 중. 노출이 끝나면 내린다.
  - "잠깐. 지나가면 가자.": 엄폐 위치에서 앞으로 움직이는데, 앞 지점(엄폐물 밖)에 1.6초 안에 시야가 열린 등이 닿을 때.
  - "지금, 건너.": "잠깐" 후 10초 안에 그 지점이 2.2초 동안 안전해질 때. 다시 위험해지면 내린다.
  - 차단문 "숨어!"(긴급) / "지금!": 제어판 위치가 1.4초 안에 위험해지는 순간 / 2.6초 동안 안전해지는 순간.
  - 긴급 대사는 일반 대사가 덮지 않는다. 이야기 대사는 경고가 끝난 뒤 나온다.

## Code
`src/explore/v3/chase/`
- `input.ts` — the only input system for this route (keyboard, mouse + pointer lock, touch). Independent of `src/explore/input.ts`.
- `level.ts` — geometry/numbers shared by rules and rendering.
- `nav.ts` — San's collision radius, node graph (closed doors cut links), A* path, patrol prediction.
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
