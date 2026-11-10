"use client";

import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, KernelSize, ToneMappingMode, type BloomEffect } from "postprocessing";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { isForced, setQuality, setRenderScale, useQuality } from "./quality";
import { runtime } from "./runtime";

// 후처리는 HDR(half float) 버퍼에 그린다. 반들반들한 바닥에 점광원이 바로 비치면 반사광이 버퍼 한계를 넘어
// Inf/NaN이 되고, 빛 번짐이 그것을 화면 전체로 퍼뜨려 화면이 까맣게 된다. 모든 기본 재질의 출력에 상한을 둔다.
const CLAMP = "/* neo-clamp */";
if (!THREE.ShaderChunk.opaque_fragment.includes(CLAMP)) {
  THREE.ShaderChunk.opaque_fragment = THREE.ShaderChunk.opaque_fragment.replace(
    "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
    `${CLAMP}
if ( any( isnan( outgoingLight ) ) ) outgoingLight = vec3( 0.0 );
outgoingLight = clamp( outgoingLight, 0.0, 32.0 );
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`
  );
}


// 기기 성능에 맞춰 스스로 조절한다. 1.5초마다 실제 프레임 수를 재서, 50fps 아래면 한 단계씩 낮춘다:
// 해상도 1.25배 → 1배 → 후처리 끔 → 해상도 0.85 → 0.7 → 0.6배. 한 번 낮추고 끝나던 예전 방식은 그보다 느린 기기에서 계속 끊겼다.
// 낮춰도 나아지지 않으면(그래픽이 아니라 계산이 느린 경우) 되돌리고 더 낮추지 않는다. 한참 여유가 있으면 한 단계씩 다시 올린다.
const STEPS: { dpr: number; fx: boolean }[] = [
  { dpr: 1.25, fx: true },
  { dpr: 1, fx: true },
  { dpr: 1, fx: false },
  { dpr: 0.85, fx: false },
  { dpr: 0.7, fx: false },
  { dpr: 0.6, fx: false },
];
const DEBUG = typeof location !== "undefined" && location.search.includes("debug");
function Governor() {
  const st = useRef({ i: -1, t: 0, n: 0, skip: 2, before: 0, floor: STEPS.length - 1, good: 0, raises: 0, held: 0, retries: 0 });
  useFrame((_, dt) => {
    if (isForced()) return;
    const s = st.current;
    const native = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    const apply = (i: number) => {
      s.i = i;
      setRenderScale(Math.min(native, STEPS[i].dpr));
      setQuality(STEPS[i].fx ? "mid" : "low");
      s.skip = 1; // 바꾼 직후의 한 구간은 재지 않는다 (셰이더 준비로 잠깐 느려진다)
    };
    if (s.i < 0) apply(native > 1 ? 0 : 1);
    // 멈춰 있거나 탭이 가려진 동안은 재지 않는다
    if (runtime.paused || document.hidden) {
      s.t = 0;
      s.n = 0;
      return;
    }
    // 1초가 넘는 한 프레임은 불러오는 중의 멈춤이므로 빼고 센다 (아주 느린 기기의 느린 프레임은 그대로 센다)
    if (dt > 1) return;
    s.t += dt;
    s.n++;
    if (s.t < 1.5) return;
    const fps = s.n / s.t;
    if (DEBUG) (window as unknown as Record<string, unknown>).__gov = { fps: Math.round(fps), step: s.i, floor: s.floor };
    s.t = 0;
    s.n = 0;
    if (s.skip > 0) {
      s.skip--;
      return;
    }
    // 방금 낮춘 것이 효과가 없었으면 되돌리고, 거기서 멈춘다
    if (s.before > 0) {
      const gained = fps > s.before * 1.06;
      s.before = 0;
      if (!gained && fps < 50) {
        s.floor = s.i - 1;
        s.held = 0;
        apply(s.i - 1);
        return;
      }
    }
    // 한 번의 측정이 우연히 나빴을 수도 있으니, 30초쯤 뒤에 다시 낮춰 본다 (세 번까지)
    if (s.floor < STEPS.length - 1 && s.retries < 3 && ++s.held >= 20) {
      s.held = 0;
      s.retries++;
      s.floor = STEPS.length - 1;
    }
    if (fps < 50 && s.i < s.floor) {
      s.good = 0;
      s.before = fps;
      apply(s.i + 1);
    } else if (fps > 57 && s.i > 0 && s.raises < 2) {
      // 12초쯤 계속 여유가 있으면 한 단계 올려 본다 (오르내림을 되풀이하지 않게 두 번까지만)
      if (++s.good >= 8) {
        s.good = 0;
        s.raises++;
        apply(s.i - 1);
      }
    } else s.good = 0;
  });
  return null;
}

// 화면 전체 후처리: 네온 빛 번짐, 가장자리 어둡게, 아주 옅은 필름 노이즈.
// 프레임이 떨어지면 해상도와 효과를 단계적으로 낮춘다.
export default function Effects() {
  const q = useQuality();
  // 빛 번짐이 읽는 첫 단계에서 Inf/NaN 픽셀을 걸러낸다. 한 픽셀이라도 새면 흐림 단계에서 화면 전체가 까맣게 된다.
  const bloomRef = useCallback((b: BloomEffect | null) => {
    const m = b?.luminanceMaterial;
    if (!m || m.fragmentShader.includes("neo-scrub")) return;
    m.fragmentShader = m.fragmentShader.replace(
      "vec4 texel=texture2D(inputBuffer,vUv);",
      "vec4 texel=texture2D(inputBuffer,vUv);/* neo-scrub */if(any(isnan(texel))||any(isinf(texel)))texel=vec4(0.0);texel=min(texel,vec4(16.0));"
    );
    m.needsUpdate = true;
  }, []);
  return (
    <>
      <Governor />
      {q !== "low" && (
        <EffectComposer multisampling={0}>
          <Bloom ref={bloomRef} mipmapBlur luminanceThreshold={0.5} luminanceSmoothing={0.1} intensity={0.7} radius={0.3} kernelSize={KernelSize.MEDIUM} />
          <Vignette offset={0.3} darkness={0.62} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  );
}
