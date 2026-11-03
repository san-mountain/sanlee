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
