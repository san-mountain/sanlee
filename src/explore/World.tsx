"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { sections, type Lang, type SectionId } from "@/data/site";
import Player from "./Player";
import Bunker from "./Bunker";
import City from "./City";
import SanNPC from "./SanNPC";
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
  sanMode?: "beside" | "stay";
  sanAt?: [number, number, number]; // 결말: 이산이 걸어가 설 자리와 바라볼 방향
  hideSan?: boolean;
  secondStatue?: boolean;
  awake?: boolean; // 기록 없이 이산의 말로 깨웠을 때 (터미널은 그대로, 이산만 깨어 있다)
  arrived?: boolean;
};

const POPUP = [{ key: "popup", pos: [1.7, 4.5, 1.6] as [number, number, number], scaleAt: 6, maxScale: 1 }];

export default function World({ zone, lang, visited, onTap, onNear, onTracked, labelEls, sanMode, sanAt, hideSan, secondStatue, arrived, awake }: Props) {
  const complete = visited.length >= sections.length || !!awake;
  return (
    <Canvas dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ fov: 66, near: 0.1, far: 600 }}>
      <Player zone={ZONES[zone]} zoneKey={zone} onNear={onNear} arrived={arrived} />
      <Suspense fallback={null}>
        {zone === "bunker" ? (
          <Bunker lang={lang} visited={visited} onTap={onTap} secondStatue={secondStatue} awake={awake} />
        ) : (
          <>
            <City lang={lang} onTap={onTap} onTracked={onTracked} />
            {complete && !hideSan && (
              <SanNPC mode="follow" item={CITY.items.find((i) => i.id === "san")!} onTap={onTap} start={[CITY.spawn.pos[0], CITY.spawn.pos[2] + 2.2]} beside={sanMode === "beside"} stay={sanMode === "stay"} at={sanAt} />
            )}
          </>
        )}
      </Suspense>
      <Effects />
      <Labels anchors={zone === "bunker" && !complete ? POPUP : []} els={labelEls} />
    </Canvas>
  );
}
