"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/* ---------- 높이 안개 ----------
   도시의 FogExp2에만 붙는다(벙커는 선형 Fog라 그대로). 거리 안개 위에, 바닥 근처에만 고이는 옅은 물안개를 더한다.
   모든 기본 재질과 빌딩 셰이더가 같은 조각(fog_*)을 쓰므로 한 곳만 고치면 도시 전체에 걸린다. 파일 용량은 0. */
const MARK = "/* neo-height-fog */";
if (!THREE.ShaderChunk.fog_pars_vertex.includes(MARK)) {
  THREE.ShaderChunk.fog_pars_vertex = THREE.ShaderChunk.fog_pars_vertex.replace(
    "varying float vFogDepth;",
    `varying float vFogDepth;
	${MARK}
	varying vec3 vFogWorld;`
  );
  THREE.ShaderChunk.fog_vertex = THREE.ShaderChunk.fog_vertex.replace(
    "vFogDepth = - mvPosition.z;",
    `vFogDepth = - mvPosition.z;
	// 시점 좌표 -> 월드 좌표 (카메라 행렬은 회전+이동뿐이라 전치로 충분)
	vFogWorld = cameraPosition + transpose( mat3( viewMatrix ) ) * mvPosition.xyz;`
  );
  THREE.ShaderChunk.fog_pars_fragment = THREE.ShaderChunk.fog_pars_fragment.replace(
    "varying float vFogDepth;",
    `varying float vFogDepth;
	varying vec3 vFogWorld;
	float neoFogHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
	float neoFogNoise( vec2 p ) {
		vec2 i = floor( p ), f = fract( p );
		f = f * f * ( 3.0 - 2.0 * f );
		return mix( mix( neoFogHash( i ), neoFogHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( neoFogHash( i + vec2( 0.0, 1.0 ) ), neoFogHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
	}`
  );
  THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace(
    "float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );",
    `float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
		{
			// 발목~허리 높이에 고이는 물안개. 땅 밑(떠 있는 섬의 아랫면)에는 걸지 않는다
			float h = vFogWorld.y;
			float patch = 0.55 + 0.9 * neoFogNoise( vFogWorld.xz * 0.07 ) * neoFogNoise( vFogWorld.xz * 0.023 + 7.0 );
			float dens = exp( - max( h, 0.0 ) / 1.5 ) * smoothstep( -3.0, -0.6, h ) * patch;
			float mist = 1.0 - exp( - min( vFogDepth, 90.0 ) * 0.03 * dens );
			vec3 mistColor = fogColor * 1.9 + vec3( 0.012, 0.004, 0.010 );
			gl_FragColor.rgb = mix( gl_FragColor.rgb, mistColor, mist * ( 1.0 - fogFactor ) );
		}`
  );
}

/* ---------- 빛기둥 ----------
   원뿔 안쪽이 가장 밝고, 가장자리와 바닥으로 갈수록 사라지는 가짜 볼륨 조명 */
export function beamMaterial(color: string, strength = 0.12) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      varying float vY;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float core = pow(abs(dot(normalize(vN), normalize(vV))), 3.0);
        float fall = pow(vY, 2.4) + 0.05 * smoothstep(0.0, 0.15, vY);
        gl_FragColor = vec4(uColor * core * fall * uStrength, 1.0);
      }
    `,
  });
}

export function useBeam(color: string, strength?: number) {
  const m = useMemo(() => beamMaterial(color, strength), [color, strength]);
  return m;
}

/* ---------- 반사 환경 ----------
   HDR 이미지 대신 네온 띠 몇 장을 코드로 세워 한 번만 굽는다. 금속과 젖은 면에 도시 빛이 비친다. */
export function NeonEnvironment() {
  return (
    <Environment resolution={64} frames={1} environmentIntensity={0.45}>
      <color attach="background" args={["#050307"]} />
      <Lightformer form="rect" intensity={3} color="#ff2bd6" position={[-6, 2, -4]} rotation-y={Math.PI / 2.5} scale={[8, 0.6, 1]} />
      <Lightformer form="rect" intensity={3} color="#22f0ff" position={[6, 1.5, -2]} rotation-y={-Math.PI / 2.5} scale={[8, 0.5, 1]} />
      <Lightformer form="rect" intensity={2} color="#ffb02e" position={[0, 6, -8]} scale={[4, 4, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#ff2030" position={[0, 0.5, 8]} rotation-y={Math.PI} scale={[12, 0.4, 1]} />
      <Lightformer form="ring" intensity={1.5} color="#bfe6ff" position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={3} />
    </Environment>
  );
}

/* ---------- 빛이 닿은 자리 ----------
   흰색을 덧칠하지 않고, 이미 있는 바닥과 벽의 색을 그 자리만 밝게 한다(결과 = 원래 색 x (1 + 빛)).
   그래서 어두운 곳이 회색 띠로 뜨지 않고, 실제 조명이 닿은 것처럼 보인다. 그림자 계산이 없어 가볍다. */
const poolCache: Partial<Record<"radial" | "top", THREE.Texture>> = {};
function poolTexture(kind: "radial" | "top") {
  const hit = poolCache[kind];
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 128, 128);
  // radial: 바닥용 둥근 웅덩이. top: 위쪽 등에서 내려와 아래와 양옆으로 사라지는 벽 빛. 어느 쪽이든 가장자리는 0이라 네모 테두리가 보이지 않는다
  const grad = kind === "radial" ? g.createRadialGradient(64, 64, 0, 64, 64, 64) : g.createRadialGradient(64, 26, 4, 64, 26, 96);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.45, "#777");
  grad.addColorStop(1, "#000");
  g.fillStyle = grad;
  if (kind === "top") g.setTransform(1, 0, 0, 1.25, 0, -6);
  g.fillRect(0, 0, 128, 128);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (kind === "top") {
    const edge = (x0: number, y0: number, x1: number, y1: number, x: number, y: number, w: number, h: number) => {
      const e = g.createLinearGradient(x0, y0, x1, y1);
      e.addColorStop(0, "rgba(0,0,0,1)");
      e.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = e;
      g.fillRect(x, y, w, h);
    };
    edge(0, 0, 0, 18, 0, 0, 128, 18);
    edge(0, 0, 22, 0, 0, 0, 22, 128);
    edge(128, 0, 106, 0, 106, 0, 22, 128);
  }
  const t = new THREE.CanvasTexture(c);
  poolCache[kind] = t;
  return t;
}

export function lightPoolMaterial(color: string, strength: number, kind: "radial" | "top" = "radial") {
  return new THREE.MeshBasicMaterial({
    map: poolTexture(kind),
    color: new THREE.Color(color).multiplyScalar(strength),
    transparent: true,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.DstColorFactor,
    blendDst: THREE.OneFactor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
}

export function useLightPool(color: string, strength: number, kind: "radial" | "top" = "radial") {
  return useMemo(() => lightPoolMaterial(color, strength, kind), [color, strength, kind]);
}
