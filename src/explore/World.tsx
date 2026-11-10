"use client";

import { Suspense } from "react";
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
      <Effects />
      <Labels anchors={zone === "bunker" && !complete ? POPUP : []} els={labelEls} />
    </Canvas>
  );
}
