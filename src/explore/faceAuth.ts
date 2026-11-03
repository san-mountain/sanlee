export const FACE_KEY = 'sanlee-face-auth-v1';
export type FaceMethod = 'standard' | 'exception';
export type FaceState = {
  schema: 1; prepared: FaceMethod | null; method: FaceMethod | null; scanner: 'low' | 'high';
  front: boolean; side: boolean; scan: boolean; specs: boolean; preview: boolean;
  slots: [boolean, boolean]; lampDim: boolean; portrait: boolean; legacy: boolean;
};
export const emptyFace = (): FaceState => ({ schema: 1, prepared: null, method: null, scanner: 'low', front: false, side: false, scan: false, specs: false, preview: false, slots: [false, false], lampDim: false, portrait: false, legacy: false });
export function loadFace(): FaceState {
  const state = emptyFace();
  try {
    const raw = localStorage.getItem(FACE_KEY);
    if (!raw) { state.legacy = JSON.parse(localStorage.getItem('sanlee-visited') || '[]').length >= 3; return state; }
    const data = JSON.parse(raw);
    if (data.schema !== 1) return state;
    for (const key of ['front','side','scan','specs','preview','lampDim','portrait','legacy'] as const) state[key] = data[key] === true;
    if (data.prepared === 'standard' || data.prepared === 'exception') state.prepared = data.prepared;
    state.scanner = data.scanner === 'high' ? 'high' : 'low';
    state.slots = [data.slots?.[0] === true, data.slots?.[1] === true];
    if (data.method === 'standard' || data.method === 'exception') state.method = data.method;
  } catch {}
  return state;
}
export function saveFace(state: FaceState) { try { localStorage.setItem(FACE_KEY, JSON.stringify(state)); } catch {} }
export function missingFace(state: FaceState, method: FaceMethod): string[] {
  const missing = [];
  if (!state.scan) missing.push('머리 영역의 유효한 현장 스캔');
  if (method === 'standard' && !state.preview) missing.push('표준 보정 미리보기');
  if (method === 'exception') {
    if (!state.front) missing.push('정면에서 손 가림 관찰');
    if (!state.specs) missing.push('보정 명세판');
    if (!state.slots.every(Boolean)) missing.push('현장 스캔과 보정 명세를 비교 칸에 제출');
  }
  return missing;
}
// 향후 지상 카메라와 대화가 읽을 결과. 이번 퍼즐에서는 지상 판정을 바꾸지 않는다.
export function faceConsequences(state: FaceState) {
  return { method: state.method, standardAccess: state.method === 'standard', additionalReview: state.method === 'exception', expressionConstrained: state.method === 'standard' };
}
export function executeFace(state: FaceState, method: FaceMethod, protectionIntended: boolean, protectedNow: boolean, confirmedUnprotected = false) {
  if (state.method) return { status: 'complete' as const, state };
  const missing = missingFace(state, method);
  if (missing.length) return { status: 'missing' as const, state, missing };
  if (protectionIntended && !protectedNow && !confirmedUnprotected) return { status: 'expired' as const, state };
  return { status: 'success' as const, state: { ...state, method } };
}
