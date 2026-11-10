"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, KernelSize, ToneMappingMode, type BloomEffect } from "postprocessing";
import { useCallback } from "react";
import * as THREE from "three";
import { isForced, lowerQuality, useQuality } from "./quality";

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

// 화면 전체 후처리: 네온 빛 번짐, 가장자리 어둡게, 아주 옅은 필름 노이즈.
// 프레임이 떨어지면 해상도와 효과를 단계적으로 낮춘다.
export default function Effects() {
  const q = useQuality();
  const setDpr = useThree((s) => s.setDpr);
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
      <PerformanceMonitor
        flipflops={Infinity}
        // 조금만 끊겨도(평균 55~52fps 아래) 한 단계 낮춘다
        bounds={(r) => (r > 90 ? [55, 90] : [52, 60])}
        onDecline={() => {
          if (isForced()) return;
          setDpr(1);
          lowerQuality();
        }}
      />
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
