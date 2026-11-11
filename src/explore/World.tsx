"use client";

import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import type { Lang, SectionId } from "@/data/site";
import type { FaceView } from "./faceRuntime";
import Player from "./Player";
import Bunker from "./Bunker";
import City from "./City";
import SanNPC, { type SanPath } from "./SanNPC";
import Labels, { type LabelEls } from "./Labels";
import Effects from "./Effects";
import { useRenderScale } from "./quality";
import { warm } from "./runtime";
import { CITY, FROZEN_SAN, ZONES, type Interactable, type Zone } from "./zones";
import Statue from "./Statue";
import { Tap } from "./parts";

type Props = {
  zone: Zone;
  lang: Lang;
  visited: SectionId[];
  onTap: (id: string) => void;
  onNear: (it: Interactable | null) => void;
  onTracked: (v: boolean) => void;
  labelEls: LabelEls;
  sanStone?: boolean; // 수락 결말: 줄 밖의 이산이 돌처럼 굳는다
  sanPath?: SanPath; // 망원경 장면·결말: 이산이 걸어갈 정해진 길과 마지막에 바라볼 방향
  hideSan?: boolean;
  secondStatue?: boolean;
  notesRead?: number[];
  // 이산이 깨어 있는가: 터미널 셋과 얼굴 맞추기를 마쳤거나, 기록을 지우고 돌아와 곁에 앉아 기다린 뒤
  awake?: boolean;
  face: FaceView;
  arrived?: boolean;
  // 수락한 뒤 다시 왔을 때: 검문소 앞 줄 밖에 정지 처분된 이산 / 풀어 준 뒤 이산이 걷기 시작하는 자리
  frozenSan?: boolean;
  sanStart?: [number, number];
};

// 테스트용(?debug): 그리는 양을 콘솔에서 볼 수 있게 렌더러와 장면을 내놓는다
function Probe() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  if (typeof location !== "undefined" && location.search.includes("debug")) (window as unknown as Record<string, unknown>).__gl = { gl, scene };
  return null;
}

// 장면을 미리 데운다. three.js는 물체를 처음 그리는 순간에야 셰이더를 만들고 모양·그림을 그래픽 카드에 올린다.
// 그래서 구역에 들어선 직후나 처음 보는 쪽으로 고개를 돌릴 때마다 화면이 멈췄다.
// 구역이 바뀌면 검은 화면 뒤에서 시야 밖의 것까지 한 번에 그려, 셰이더·모양·그림을 전부 올려 둔다
function Warm({ zone }: { zone: Zone }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const id = ++warm.id;
    warm.ready = false;
    let off = false;
    const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    const count = () => {
      let n = 0;
      scene.traverse(() => void n++);
      return n;
    };
    (async () => {
      // 그림처럼 늦게 불러오는 것들이 다 놓일 때까지: 물체 수가 잠깐(여덟 프레임) 그대로면 다 놓인 것으로 본다 (길어도 4초)
      const t0 = performance.now();
      let last = -1;
      let same = 0;
      while (!off && same < 8 && performance.now() - t0 < 4000) {
        await frame();
        const n = count();
        same = n === last ? same + 1 : 0;
        last = n;
      }
      if (off) return;
      // 시야 밖의 것까지 몇 프레임 동안 그리게 한다. 평소와 똑같은 경로(후처리 포함)로 그려야 실제로 쓰일 셰이더가 만들어진다:
      // 따로 미리 컴파일하면 조건이 달라 다른 셰이더가 만들어지고, 정작 쓸 것은 화면이 열린 뒤에 다시 만들어졌다
      const culled: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o.frustumCulled) {
          culled.push(o);
          o.frustumCulled = false;
        }
      });
      for (let k = 0; k < 3; k++) await frame();
      culled.forEach((o) => (o.frustumCulled = true));
      await frame();
      if (warm.id === id) warm.ready = true;
    })();
    return () => {
      off = true;
    };
  }, [zone, scene]);
  return null;
}

const POPUP = [{ key: "popup", pos: [1.7, 4.5, 1.6] as [number, number, number], scaleAt: 6, maxScale: 1 }];

export default function World({ zone, lang, visited, onTap, onNear, onTracked, labelEls, sanPath, sanStone, hideSan, secondStatue, notesRead, arrived, awake, face, frozenSan, sanStart }: Props) {
  const complete = !!awake;
  const scale = useRenderScale();
  return (
    <Canvas dpr={scale} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ fov: 66, near: 0.1, far: 600 }}>
      <Player zone={ZONES[zone]} zoneKey={zone} onNear={onNear} arrived={arrived} />
      <Suspense fallback={null}>
        {zone === "bunker" ? (
          <Bunker lang={lang} visited={visited} onTap={onTap} secondStatue={secondStatue} awake={awake} face={face} notesRead={notesRead} />
        ) : (
          <>
            <City lang={lang} onTap={onTap} onTracked={onTracked} />
            {complete && !hideSan && (
              <SanNPC smile={face.method === "standard"} mode="follow" item={CITY.items.find((i) => i.id === "san")!} onTap={onTap} start={sanStart ?? [CITY.spawn.pos[0], CITY.spawn.pos[2] + 2.2]} path={sanPath} stone={sanStone} />
            )}
            {/* 이산이 없을 때도 이산의 빛 자리를 꺼 둔 채 남겨 둔다. 장면의 빛 개수가 바뀌면 모든 재질의 셰이더를 한꺼번에 다시 만들어서
                (수락 뒤 이산을 풀어 줄 때) 화면이 몇 초씩 멈췄다 */}
            {!(complete && !hideSan) && <pointLight position={[0, -50, 0]} intensity={0} distance={4} color="#ffd6f4" />}
            {frozenSan && (
              <group position={[FROZEN_SAN.x, 0, FROZEN_SAN.z]}>
                <Tap id="frozen-san" onTap={onTap}>
                  <Statue restored={0} lang={lang} />
                </Tap>
              </group>
            )}
          </>
        )}
      </Suspense>
      <Probe />
      <Warm zone={zone} />
      <Effects />
      <Labels anchors={zone === "bunker" && !complete ? POPUP : []} els={labelEls} />
    </Canvas>
  );
}
