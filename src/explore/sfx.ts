// 게임 효과음. 파일 없이 브라우저(Web Audio)에서 그때그때 합성한다.
// 첫 클릭·키 입력 뒤에만 소리가 난다(브라우저 정책). 설정창에서 끌 수 있고, 꺼 둔 상태는 기억한다.
const KEY = "sanlee-sfx";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let on = true;
try {
  on = typeof localStorage === "undefined" || localStorage.getItem(KEY) !== "0";
} catch {}

export function sfxOn() {
  return on;
}
export function setSfx(v: boolean) {
  on = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
}

function ac(): AudioContext | null {
  if (!on || typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

type Wave = OscillatorType;
// 음 하나: 주파수 f(끝 f2로 미끄러짐), 길이 d초, 시작 지연 at초
function tone(f: number, d: number, { type = "sine" as Wave, f2 = f, vol = 0.5, at = 0, attack = 0.005 } = {}) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + d + 0.02);
}
// 잡음: 바람, 문, 지직거림
function noise(d: number, { vol = 0.3, at = 0, from = 1800, to = 300, q = 0.8 } = {}) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const len = Math.ceil(c.sampleRate * d);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = q;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + d * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + d + 0.02);
}

export const sfx = {
  // 대화 넘김, 작은 버튼
  blip: () => tone(1180, 0.05, { type: "square", vol: 0.08 }),
  // 터미널·패널 열기
  open: () => {
    tone(520, 0.08, { type: "triangle", vol: 0.25 });
    tone(780, 0.12, { type: "triangle", vol: 0.22, at: 0.07 });
  },
  // 방폭문·승강: 무거운 문과 바람
  door: () => {
    tone(70, 0.5, { type: "sine", f2: 45, vol: 0.5 });
    noise(1.1, { vol: 0.22, from: 900, to: 160, at: 0.05 });
  },
  // 위치 기억, 쿠키 안내
  chime: () => {
    tone(880, 0.35, { vol: 0.16 });
    tone(1320, 0.5, { vol: 0.12, at: 0.09 });
  },
  // 대자비 소개: 낮은 범종
  gong: () => {
    tone(98, 3.2, { vol: 0.5, attack: 0.02 });
    tone(196, 2.4, { vol: 0.18, attack: 0.02 });
    tone(293, 1.8, { vol: 0.08, attack: 0.02 });
  },
  // 대자비 시선 단계
  watch: () => tone(220, 0.15, { type: "sine", vol: 0.12 }),
  suspect: () => {
    tone(330, 0.12, { type: "triangle", vol: 0.18 });
    tone(330, 0.12, { type: "triangle", vol: 0.18, at: 0.18 });
  },
  charge: () => tone(260, 0.9, { type: "sawtooth", f2: 620, vol: 0.12 }),
  lock: () => tone(1400, 0.6, { type: "square", f2: 1900, vol: 0.07 }),
  beam: () => {
    tone(900, 1.4, { type: "sawtooth", f2: 60, vol: 0.18 });
    noise(1.4, { vol: 0.25, from: 3000, to: 200 });
  },
  hidden: () => tone(440, 0.2, { type: "sine", f2: 330, vol: 0.08 }),
  // 연결이 끊김: 지직거림
  glitch: () => {
    for (let i = 0; i < 6; i++) tone(200 + Math.random() * 1400, 0.05, { type: "square", vol: 0.12, at: i * 0.07 });
    noise(0.6, { vol: 0.2, from: 4000, to: 800, at: 0.1 });
  },
  // 다시 오셨군요
  restore: () => {
    tone(523, 0.18, { vol: 0.16 });
    tone(659, 0.18, { vol: 0.16, at: 0.12 });
    tone(784, 0.4, { vol: 0.14, at: 0.24 });
  },
  // 잠긴 문·검문소
  denied: () => {
    tone(160, 0.14, { type: "square", vol: 0.12 });
    tone(120, 0.22, { type: "square", vol: 0.12, at: 0.16 });
  },
  // 검문소 선택
  accept: () => {
    tone(523, 0.5, { vol: 0.18 });
    tone(659, 0.5, { vol: 0.15, at: 0.05 });
    tone(784, 0.8, { vol: 0.14, at: 0.1 });
  },
  reject: () => tone(110, 1.2, { type: "sawtooth", f2: 55, vol: 0.15 }),
  ghost: () => noise(2.2, { vol: 0.18, from: 200, to: 2400, q: 0.5 }),
};
