// 배경음악. 장면마다 한 곡(방공호, 지상, 대자비 구역, 결말)이 반복되고, 장면이 바뀌면 서서히 겹쳐 넘어간다.
// 효과음과 같은 소리 설정을 따른다: 소리를 끄면 음악도 멈춘다. 첫 클릭 뒤에만 재생된다(브라우저 정책).
import { sfxOn } from "./sfx";

export type Track = "bunker" | "ground" | "jabi" | "ending";
const SRC: Record<Track, string> = {
  bunker: "/audio/bgm-bunker.mp3",
  ground: "/audio/bgm-ground.mp3",
  jabi: "/audio/bgm-jabi.mp3",
  ending: "/audio/bgm-ending.mp3",
};
const VOL = 0.3;
// 곡마다 원래 음량이 달라서(대자비가 가장 크다) 방공호 곡에 맞춰 낮춘다
const LEVEL: Record<Track, number> = { bunker: 1, ground: 0.83, jabi: 0.68, ending: 0.87 };
const FADE = 1.6;

let ctx: AudioContext | null = null;
const chans: Partial<Record<Track, { el: HTMLAudioElement; gain: GainNode }>> = {};
let want: Track | null = null;
let duck = 1;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// 곡 파일은 처음 필요할 때만 받는다
function chan(t: Track) {
  const c = audio();
  if (!c) return null;
  let ch = chans[t];
  if (!ch) {
    const el = new Audio();
    el.src = SRC[t];
    el.loop = true;
    el.preload = "auto";
    const gain = c.createGain();
    gain.gain.value = 0;
    c.createMediaElementSource(el).connect(gain).connect(c.destination);
    ch = chans[t] = { el, gain };
  }
  return ch;
}

function apply() {
  const c = ctx;
  const on = sfxOn();
  (Object.keys(chans) as Track[]).forEach((t) => {
    const ch = chans[t]!;
    const target = on && t === want ? VOL * LEVEL[t] * duck : 0;
    if (c) {
      const g = ch.gain.gain;
      g.cancelScheduledValues(c.currentTime);
      g.setValueAtTime(g.value, c.currentTime);
      g.linearRampToValueAtTime(target, c.currentTime + FADE);
    }
    if (target > 0) ch.el.play().catch(() => {});
    else {
      // 다 줄어든 뒤에 멈춘다. 그 사이 다시 원하게 되면 그대로 둔다
      setTimeout(() => {
        const still = sfxOn() && t === want;
        if (!still) ch.el.pause();
      }, FADE * 1000 + 100);
    }
  });
}

// 지금 장면의 곡. null이면 모두 서서히 꺼진다
export function playBgm(t: Track | null) {
  if (t === want) return;
  want = t;
  if (t && sfxOn()) chan(t);
  apply();
}

// 설정창이 열려 있을 때처럼 음악을 잠시 낮출 때
export function duckBgm(low: boolean) {
  const d = low ? 0.45 : 1;
  if (d === duck) return;
  duck = d;
  apply();
}

// 소리 설정이 바뀌었을 때
export function syncBgm() {
  if (want && sfxOn()) chan(want);
  apply();
}

// 첫 클릭 전에 만들어진 오디오는 잠겨 있으므로 사용자 입력 때 다시 깨운다
export function wakeBgm() {
  if (!ctx || ctx.state !== "suspended") return;
  ctx.resume().catch(() => {});
  if (want && sfxOn()) chans[want]?.el.play().catch(() => {});
}
