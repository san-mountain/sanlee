// 배경음악. 장면마다 한 곡(방공호, 지상, 대자비 구역, 결말 셋, 空 경로의 지상)이 반복되고, 장면이 바뀌면 서서히 겹쳐 넘어간다.
// 효과음과 같은 소리 설정을 따른다: 소리를 끄면 음악도 멈춘다. 첫 클릭 뒤에만 재생된다(브라우저 정책).
import { sfxOn } from "./sfx";

// ending = 예전 空 결말 곡(지금은 쓰지 않는다. 空 결말은 f-ALL을 잇는다), accept = 수락 결말(Habitual Suffering), reject = 거부 결말(an open ended promise),
// fall = 기록을 지우고 돌아와 이산과 재회한 뒤의 지상(f-ALL)
export type Track = "bunker" | "ground" | "jabi" | "ending" | "accept" | "reject" | "fall";
const SRC: Record<Track, string> = {
  bunker: "/audio/bgm-bunker.mp3",
  ground: "/audio/bgm-ground.mp3",
  jabi: "/audio/bgm-jabi.mp3",
  ending: "/audio/bgm-ending.mp3",
  accept: "/audio/bgm-accept.mp3",
  reject: "/audio/bgm-reject.mp3",
  fall: "/audio/bgm-fall.mp3",
};
const VOL = 0.3;
// 곡마다 원래 음량이 달라서(대자비가 가장 크다) 방공호 곡에 맞춰 낮춘다
// (새 세 곡은 평균 음량(accept −8.0, reject −9.5, fall −8.4 dB)을 기존 곡과 같은 비율로 맞춘 값. 들어 보고 정하지 않았다)
const LEVEL: Record<Track, number> = { bunker: 1, ground: 0.83, jabi: 0.68, ending: 0.87, accept: 0.61, reject: 0.73, fall: 0.64 };
const FADE = 1.6;
// 처음 시작할 때 아주 작게 들어와 천천히 커지는 곡 (f-ALL: 공 경로의 지상에 올라서자마자 약 24초에 걸쳐). 줄어들 때나 설정창을 닫아 되돌릴 때는 다른 곡과 같다
// 수락·거부 결말 곡은 듣던 곡과 몇 초 겹치며 들어온다
const FADE_IN: Partial<Record<Track, number>> = { fall: 24, accept: 5, reject: 5 };

let ctx: AudioContext | null = null;
const chans: Partial<Record<Track, { el: HTMLAudioElement; gain: GainNode }>> = {};
let want: Track | null = null;
let duck = 1;
const slowUntil: Partial<Record<Track, number>> = {};

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

let outFade = FADE;
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
      // 느린 시작은 한 번 정해지면 끝까지 간다 (그 사이 설정창을 열고 닫아도 남은 시간만큼 이어서 커진다)
      let dur = FADE;
      if (target > g.value) {
        if (g.value < 0.01 && FADE_IN[t]) slowUntil[t] = c.currentTime + FADE_IN[t]!;
        dur = Math.max(FADE, (slowUntil[t] ?? 0) - c.currentTime);
      } else if (target === 0) {
        slowUntil[t] = 0;
        dur = outFade;
      }
      g.linearRampToValueAtTime(target, c.currentTime + dur);
    }
    if (target > 0) ch.el.play().catch(() => {});
    else {
      // 다 줄어든 뒤에 멈춘다. 그 사이 다시 원하게 되면 그대로 둔다
      setTimeout(() => {
        const still = sfxOn() && t === want;
        if (!still) ch.el.pause();
      }, outFade * 1000 + 100);
    }
  });
}

// 지금 장면의 곡. null이면 모두 서서히 꺼진다
// out: 이번에 꺼지는 곡이 줄어드는 시간(초). 결말 곡으로 겹쳐 넘어갈 때 길게 준다
export function playBgm(t: Track | null, out = FADE) {
  if (t === want) return;
  want = t;
  if (t && sfxOn()) chan(t);
  outFade = out;
  apply();
  outFade = FADE;
}

// 곧 쓸 곡 파일을 미리 받아 둔다 (소리는 내지 않는다). 넘어가는 순간 파일을 기다리느라 생기는 빈틈을 없앤다
export function preloadBgm(t: Track) {
  if (chans[t] || !sfxOn()) return;
  chan(t)?.el.load();
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
