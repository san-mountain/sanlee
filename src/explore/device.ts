// 이 기기가 DELETE SEOUL을 부드럽게 그리기엔 힘든가 (처음 들어올 때 한 번만 본다).
// 노트북 내장 그래픽(인텔·AMD 내장), 소프트웨어 렌더링, 코어 4개 이하, 메모리 4GB 이하면 힘든 기기로 본다.
// 여기서 놓친 기기는 Effects의 Governor가 실제 프레임을 재서 잡아낸다.
const WEAK_GPU = [
  // 인텔 내장 그래픽 (UHD·Iris·HD Graphics 등). 인텔 Arc 외장 그래픽은 빼고 본다
  /intel(?!.*\barc\b)/i,
  // AMD 내장 그래픽: 모델 번호 없이 "Radeon(TM) Graphics", "Radeon Vega 8 Graphics" 같은 이름을 쓴다
  /radeon\(tm\) graphics/i,
  /radeon graphics/i,
  /vega \d+ graphics/i,
  /swiftshader|llvmpipe|softpipe|software|basic render/i,
  /mali|adreno|powervr/i,
];

export function gpuName(): string {
  if (typeof document === "undefined") return "";
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "";
  }
}

let cached: boolean | null = null;
export function weakDevice(): boolean {
  if (cached !== null) return cached;
  if (typeof navigator === "undefined") return (cached = false);
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 8;
  const mem = nav.deviceMemory ?? 8;
  const gpu = gpuName();
  cached = cores <= 4 || mem <= 4 || WEAK_GPU.some((r) => r.test(gpu));
  return cached;
}
