// 키보드·조이스틱·드래그 입력을 한곳에 모아 두는 공유 상태 (리렌더 없이 매 프레임 읽음)
export const input = {
  // 조이스틱/키보드 이동 벡터: x = 오른쪽, y = 앞쪽 (-1~1)
  joy: { x: 0, y: 0 },
  keys: new Set<string>(),
  // 이번 프레임까지 쌓인 시점 회전량(라디안)
  look: { yaw: 0, pitch: 0 },
  enabled: true,
  // 점프 요청 (스페이스바·점프 버튼)
  jump: false,
  // 점프 키·버튼을 누르고 있는 중 (누르고 있으면 착지할 때마다 다시 뛴다)
  jumpHeld: false,
  // Shift를 톡 누르면 켜지는 달리기 (멈추면 꺼진다). 한국어 입력기에서 Shift+Space가 한/영 전환에 먹히는 문제를 피한다
  runLatch: false,
  shiftAt: 0,
  // 설정창에서 바꾸는 값
  sens: 1,
  bob: true,
  // 화면 효과 줄이기: 흔들림·번쩍임·글리치를 약하게 (빛에 민감한 사람, 멀미)
  // 노트북처럼 느린 기기에서는 무거운 화면 효과(빛 번짐 등)도 끄고 해상도를 낮춰 가볍게 그린다
  calm: false,
  // 방문자가 설정창에서 직접 고른 적이 있는가. 없을 때만 기기 성능을 보고 자동으로 켠다
  calmSet: false,
  // 자동으로 켜졌는가 (설정창에 그 사실을 알린다)
  calmAuto: false,
};

// 화면 효과 줄이기가 바뀌면 화면(후처리·해상도·비)이 바로 따라오게 알린다
const calmSubs = new Set<() => void>();
export function onCalm(f: () => void) {
  calmSubs.add(f);
  return () => {
    calmSubs.delete(f);
  };
}
// by: user = 설정창에서 직접, auto = 느린 기기라 자동으로
export function setCalm(v: boolean, by: "user" | "auto") {
  if (by === "auto" && input.calmSet) return;
  const changed = input.calm !== v;
  input.calm = v;
  if (by === "user") {
    input.calmSet = true;
    input.calmAuto = false;
  } else input.calmAuto = v;
  saveSettings();
  if (changed) calmSubs.forEach((f) => f());
}

// 설정은 브라우저에 저장해 둔다
// weak: 이 기기가 힘든 기기인지 (device.ts의 weakDevice). 처음 와서 아직 고른 적이 없을 때 쓴다
export function loadSettings(weak: () => boolean = () => false) {
  try {
    const v = JSON.parse(localStorage.getItem("neo-settings") || "{}");
    if (typeof v.sens === "number") input.sens = Math.max(0.3, Math.min(2.5, v.sens));
    if (typeof v.bob === "boolean") input.bob = v.bob;
    const was = input.calm;
    input.calmSet = false;
    input.calmAuto = false;
    // 예전 저장값의 calm: false는 다른 설정을 바꿀 때 함께 저장된 기본값일 수 있어 고른 것으로 보지 않는다
    if (v.calmSet === true && typeof v.calm === "boolean") {
      input.calm = v.calm;
      input.calmSet = true;
    } else if (v.calm === true) input.calm = true;
    else if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) input.calm = true;
    // 이 기기에서 전에 끊겨서 자동으로 켰거나, 처음부터 힘든 기기(내장 그래픽 노트북 등)로 보이면 켠다
    else if (v.calmAuto === true || weak()) {
      input.calm = true;
      input.calmAuto = true;
    } else input.calm = false;
    if (was !== input.calm) calmSubs.forEach((f) => f());
  } catch {}
}
export function saveSettings() {
  try {
    localStorage.setItem(
      "neo-settings",
      JSON.stringify({ sens: input.sens, bob: input.bob, calm: input.calm, calmSet: input.calmSet, calmAuto: input.calmAuto })
    );
  } catch {}
}

export function moveVector() {
  const k = input.keys;
  let x = input.joy.x;
  let y = input.joy.y;
  if (k.has("KeyW") || k.has("ArrowUp")) y += 1;
  if (k.has("KeyS") || k.has("ArrowDown")) y -= 1;
  if (k.has("KeyD")) x += 1;
  if (k.has("KeyA")) x -= 1;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  // 움직임이 없으면 달리기 고정을 푼다
  if (len < 0.05) input.runLatch = false;
  const run = input.runLatch || k.has("ShiftLeft") || k.has("ShiftRight") || Math.hypot(input.joy.x, input.joy.y) > 0.92;
  return { x, y, run };
}

export function turnKeys() {
  const k = input.keys;
  return (k.has("ArrowLeft") || k.has("KeyQ") ? 1 : 0) - (k.has("ArrowRight") ? 1 : 0);
}

export function resetInput() {
  input.keys.clear();
  input.joy.x = input.joy.y = 0;
  input.look.yaw = input.look.pitch = 0;
  input.jump = input.jumpHeld = input.runLatch = false;
  input.shiftAt = 0;
}
