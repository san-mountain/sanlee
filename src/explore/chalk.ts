// 분필: 이산과 방문자 둘만의 것. 망원경 가는 길 세 곳에서 이산이 선을 하나 긋고 분필을 내민다.
// 도시의 기록(검문소의 '도시가 저장한 기록')에는 나오지 않는다. 세 결말과 삭제 뒤 재회에서 되돌아온다.
// 저장: 이 기기에 { seen: 이산이 그은 자리, mine: 방문자가 옆에 그은 자리 }. 꼬리말에서 기록을 지우면 선 하나의 흔적(trace)만 남는다
import { CHALK } from "./zones";

const KEY = "sanlee-chalk";
// 골목(분필 화살표 옆) / 배송 대기소 처마 밑 / 바깥 산책로 북쪽. 모두 드론 빛이 닿지 않는 자리
export const CHALK_SPOTS: { x: number; z: number; rotY: number }[] = [
  { x: CHALK[4].x + 0.95, z: CHALK[4].z + 1.1, rotY: 0.2 },
  { x: -52.3, z: 30.5, rotY: 1.2 },
  { x: -67.6, z: 34.6, rotY: -0.3 },
];
export type ChalkState = { seen: number[]; mine: number[]; trace?: boolean };

export function readChalk(): ChalkState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && Array.isArray(v.seen) && Array.isArray(v.mine)) return { seen: v.seen, mine: v.mine, trace: !!v.trace };
  } catch {}
  return { seen: [], mine: [] };
}
function write(s: ChalkState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  window.dispatchEvent(new Event("sanlee-chalk"));
}
// 이산이 그 자리에 선을 긋는다 (분필을 내밀기 직전)
export function offerChalk(i: number) {
  const s = readChalk();
  if (!s.seen.includes(i)) write({ ...s, seen: [...s.seen, i] });
}
// 방문자가 옆에 선을 하나 긋는다
export function drawChalk(i: number) {
  const s = readChalk();
  if (!s.mine.includes(i)) write({ ...s, mine: [...s.mine, i] });
}
export function clearChalk() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new Event("sanlee-chalk"));
}
