import * as THREE from "three";

// 윤곽만 네온색으로 빛나게 하는 림라이트(프레넬). 어두운 시민과 동상의 실루엣이 도시 빛에서 떠오른다.
// MeshStandardMaterial에 붙여 쓰고, 인스턴싱에도 그대로 동작한다.
export function addRim<T extends THREE.MeshStandardMaterial>(mat: T, color = "#3fd6ff", strength = 0.9, power = 2.6): T {
  if (mat.userData.rim) return mat;
  mat.userData.rim = true;
  const c = new THREE.Color(color);
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    shader.uniforms.uRimColor = { value: c };
    shader.uniforms.uRim = { value: new THREE.Vector2(strength, power) };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRimColor;\nuniform vec2 uRim;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          // 법선 길이가 0인 면(합친 지오메트리의 이음매)에서 NaN이 나오면 빛 번짐이 화면 전체로 번지므로 막는다
          float nl = length(normal);
          float vl = length(vViewPosition);
          if (nl > 1e-4 && vl > 1e-4) {
            float rimF = pow(1.0 - clamp(abs(dot(normal / nl, vViewPosition / vl)), 0.0, 1.0), uRim.y);
            totalEmissiveRadiance += uRimColor * rimF * uRim.x;
          }
        }`
      );
  };
  mat.customProgramCacheKey = () => `rim-${color}-${strength}-${power}`;
  return mat;
}

export function rimStandard(params: THREE.MeshStandardMaterialParameters, rim?: { color?: string; strength?: number; power?: number }) {
  return addRim(new THREE.MeshStandardMaterial(params), rim?.color, rim?.strength, rim?.power);
}
