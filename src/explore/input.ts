// 키보드·조이스틱·드래그 입력을 한곳에 모아 두는 공유 상태 (리렌더 없이 매 프레임 읽음)
export const input = {
  // 조이스틱/키보드 이동 벡터: x = 오른쪽, y = 앞쪽 (-1~1)
  joy: { x: 0, y: 0 },
  keys: new Set<string>(),
  // 이번 프레임까지 쌓인 시점 회전량(라디안)
  look: { yaw: 0, pitch: 0 },
  enabled: true,
};

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
  const run = k.has("ShiftLeft") || k.has("ShiftRight") || Math.hypot(input.joy.x, input.joy.y) > 0.92;
  return { x, y, run };
}

export function turnKeys() {
  const k = input.keys;
  return (k.has("ArrowLeft") || k.has("KeyQ") ? 1 : 0) - (k.has("ArrowRight") ? 1 : 0);
}
