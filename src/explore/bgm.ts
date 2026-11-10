// 배경음악. 장면마다 한 곡(방공호, 지상, 대자비 구역, 결말 셋, 空 경로의 지상)이 반복되고, 장면이 바뀌면 서서히 겹쳐 넘어간다.
// 효과음과 같은 소리 설정을 따른다: 소리를 끄면 음악도 멈춘다. 첫 클릭 뒤에만 재생된다(브라우저 정책).
import { sfxOn, vol } from "./sfx";

// accept = 수락 결말(Habitual Suffering), reject = 거부 결말(an open ended promise),
// fall = 기록을 지우고 돌아와 이산과 재회한 뒤의 지상과 空 결말(f-ALL)
// empty = 〈空〉: 결말 모음 화면, 그리고 세 결말을 모두 본 뒤의 첫 화면
export type Track = "bunker" | "ground" | "jabi" | "accept" | "reject" | "fall" | "empty";
// 곡 파일은 Opus(webm, 80kbps)를 먼저 쓰고, 재생하지 못하는 브라우저에서만 mp3(128kbps)를 쓴다 (전체 21MB → 13MB)
let ext: "webm" | "mp3" | null = null;
function src(t: Track) {
  if (!ext) {
    let ok = "";
    try {
      ok = new Audio().canPlayType('audio/webm; codecs="opus"');
    } catch {}
    ext = ok === "probably" ? "webm" : "mp3";
  }
  return `/audio/bgm-${t}.${ext}`;
}
const VOL = 0.3;
// 곡마다 원래 음량이 달라서 방공호 곡(−11.1 LUFS)에 맞춰 낮춘다. ffmpeg ebur128로 잰 통합 음량:
// bunker −11.1, ground −9.5, jabi −7.1, accept −8.6, reject −10.0, fall −7.0 LUFS.
// 대자비 곡만 일부러 0.6dB쯤 크게 남긴다(긴장). 결말 두 곡은 예전 값이 약 2dB 작게 들려서 맞췄다
// 〈空〉 −9.9 LUFS
const LEVEL: Record<Track, number> = { bunker: 1, ground: 0.83, jabi: 0.68, accept: 0.75, reject: 0.88, fall: 0.62, empty: 0.87 };
const FADE = 1.6;
// 처음 시작할 때 아주 작게 들어와 천천히 커지는 곡 (f-ALL: 공 경로의 지상에 올라서자마자 약 12초에 걸쳐). 줄어들 때나 설정창을 닫아 되돌릴 때는 다른 곡과 같다
// 수락·거부 결말 곡은 듣던 곡과 몇 초 겹치며 들어온다
const FADE_IN: Partial<Record<Track, number>> = { fall: 12, accept: 5, reject: 5, empty: 4 };
// 파일 맨 앞에 소리 없는 구간이 있는 곡은 그 뒤부터 튼다 (f-ALL: 첫 1.9초가 무음. 지상에 올라서자마자 들리게). 반복할 때도 같은 자리로 돌아간다
const START: Partial<Record<Track, number>> = { fall: 1.85 };
// 파일 끝의 소리 없는 구간은 건너뛰고 곧바로 처음으로 돌아간다 (ffmpeg silencedetect −45dB로 잰 무음 시작점).
// 대자비 곡은 끝에 8.6초가 비어 있어서, 큰길에서 오래 머물면 긴장이 한참 끊겼다
const END: Partial<Record<Track, number>> = { bunker: 149.8, jabi: 254.9, accept: 221.2, reject: 108.1, fall: 184.9, empty: 282.8 };

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
    const start = START[t] ?? 0;
    const end = END[t];
    el.src = start ? `${src(t)}#t=${start}` : src(t);
    el.preload = "auto";
    if (start || end) {
      // 처음 재생 위치를 무음 뒤로 옮기고, 끝의 무음에 닿으면(또는 끝나면) 앞의 무음을 건너뛴 자리로 돌아간다
      el.addEventListener("loadedmetadata", () => {
        if (el.currentTime < start) el.currentTime = start;
      });
      if (end)
        el.addEventListener("timeupdate", () => {
          if (el.currentTime >= end) el.currentTime = start;
        });
      el.addEventListener("ended", () => {
        el.currentTime = start;
        if (sfxOn() && t === want) el.play().catch(() => {});
      });
    } else el.loop = true;
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
    const target = on && t === want ? VOL * LEVEL[t] * duck * vol.music : 0;
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

// 설정창이 열려 있을 때나 장면의 정적처럼 음악을 잠시 낮출 때 (1 = 원래 크기)
export function duckBgm(level: number) {
  const d = Math.max(0, Math.min(1, level));
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
