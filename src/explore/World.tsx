"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import type { Lang, SectionId } from "@/data/site";
import type { Drums } from "./faceAuth";
import Player from "./Player";
import Bunker from "./Bunker";
import City from "./City";
import SanNPC, { type SanPath } from "./SanNPC";
import Labels, { type LabelEls } from "./Labels";
import Effects from "./Effects";
import { CITY, ZONES, type Interactable, type Zone } from "./zones";

type Props = {
  zone: Zone;
  lang: Lang;
  visited: SectionId[];
  onTap: (id: string) => void;
  onNear: (it: Interactable | null) => void;
  onTracked: (v: boolean) => void;
  labelEls: LabelEls;
  sanPath?: SanPath; // 망원경 장면·결말: 이산이 걸어갈 정해진 길과 마지막에 바라볼 방향
  hideSan?: boolean;
  secondStatue?: boolean;
  // 이산이 깨어 있는가: 터미널 셋과 얼굴 맞추기를 마쳤거나, 기록을 지우고 돌아와 곁에 앉아 기다린 뒤
  awake?: boolean;
  drums: Drums;
  arrived?: boolean;
};

const POPUP = [{ key: "popup", pos: [1.7, 4.5, 1.6] as [number, number, number], scaleAt: 6, maxScale: 1 }];

export default function World({ zone, lang, visited, onTap, onNear, onTracked, labelEls, sanPath, hideSan, secondStatue, arrived, awake, drums }: Props) {
  const complete = !!awake;
  return (
    <Canvas dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ fov: 66, near: 0.1, far: 600 }}>
      <Player zone={ZONES[zone]} zoneKey={zone} onNear={onNear} arrived={arrived} />
      <Suspense fallback={null}>
        {zone === "bunker" ? (
          <Bunker lang={lang} visited={visited} onTap={onTap} secondStatue={secondStatue} awake={awake} drums={drums} />
        ) : (
          <>
            <City lang={lang} onTap={onTap} onTracked={onTracked} />
            {complete && !hideSan && (
              <SanNPC mode="follow" item={CITY.items.find((i) => i.id === "san")!} onTap={onTap} start={[CITY.spawn.pos[0], CITY.spawn.pos[2] + 2.2]} path={sanPath} />
            )}
          </>
        )}
      </Suspense>
      <Effects />
      <Labels anchors={zone === "bunker" && !complete ? POPUP : []} els={labelEls} />
    </Canvas>
  );
}
