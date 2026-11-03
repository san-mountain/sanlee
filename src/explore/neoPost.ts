import { useEffect } from "react";
import * as THREE from "three";
import { useQuality } from "./quality";

// 직접 짠 셰이더(하늘, 구름, 빌딩 외벽)는 원래 색을 화면에 그대로 내보낸다.
// 후처리를 켜면 마지막에 ACES 톤매핑과 sRGB 변환이 한 번 더 걸려 회색으로 떠 보이므로,
// 후처리 중에는 그 둘의 역변환을 미리 걸어 두어 화면에 보이는 색이 효과를 끈 때와 같게 한다.
export const NEO_POST_GLSL = /* glsl */ `
vec3 neoPost(vec3 c) {
#ifdef NEO_POST
  c = clamp(c, 0.0, 0.98);
  // sRGB -> linear
  c = mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
  // ACES Filmic(three.js) 역변환
  c = mat3(vec3(0.643038, 0.059269, 0.005962), vec3(0.311187, 0.931436, 0.063929), vec3(0.045775, 0.009295, 0.930118)) * c;
  vec3 a = 1.0 - 0.983729 * c;
  vec3 b = 0.0245786 - 0.432951 * c;
  vec3 k = 0.000090537 + 0.238081 * c;
  c = (-b + sqrt(max(b * b + 4.0 * a * k, 0.0))) / (2.0 * max(a, 1e-4));
  c = mat3(vec3(1.764741, -0.147028, -0.036337), vec3(-0.675778, 1.160252, -0.162436), vec3(-0.088963, -0.013224, 1.198773)) * c;
  c = max(c, 0.0) * 0.6;
#endif
  return c;
}
`;

// 후처리 단계에 맞춰 재질의 NEO_POST 정의를 켜고 끈다
export function useNeoPost(mat: THREE.ShaderMaterial) {
  const q = useQuality();
  useEffect(() => {
    const on = q !== "low";
    if (on === "NEO_POST" in (mat.defines ?? {})) return;
    mat.defines = { ...(mat.defines ?? {}) };
    if (on) mat.defines.NEO_POST = "";
    else delete mat.defines.NEO_POST;
    mat.needsUpdate = true;
  }, [q, mat]);
}
