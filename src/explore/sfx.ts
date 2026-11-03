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

// 대자비 게이지 긴장음: 게이지가 차오를수록 심장 박동이 빨라지고, 낮은 웅웅거림이 커지며 높아진다.
// 매 프레임 0~1 값을 넘기면 알아서 박자를 맞춘다. 0이면 서서히 사라진다
let drone: { a: OscillatorNode; b: OscillatorNode; lp: BiquadFilterNode; g: GainNode } | null = null;
let nextBeat = 0;
export function tension(m: number) {
  if (!on || m < 0.03) {
    if (drone && ctx) drone.g.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    nextBeat = 0;
    return;
  }
  const c = ac();
  if (!c || !master) return;
  const now = c.currentTime;
  if (!drone) {
    const a = c.createOscillator();
    const b = c.createOscillator();
    a.type = "sawtooth";
    b.type = "sawtooth";
    b.detune.value = 14;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 6;
    const g = c.createGain();
    g.gain.value = 0;
    a.connect(lp);
    b.connect(lp);
    lp.connect(g).connect(master);
    a.start();
    b.start();
    drone = { a, b, lp, g };
  }
  const f = 46 + 50 * m;
  drone.a.frequency.setTargetAtTime(f, now, 0.1);
  drone.b.frequency.setTargetAtTime(f * 1.5, now, 0.1);
  drone.lp.frequency.setTargetAtTime(160 + 2200 * m * m, now, 0.1);
  drone.g.gain.setTargetAtTime(0.05 + 0.3 * m * m, now, 0.1);
  if (now >= nextBeat) {
    // 쿵-쿵 두 번 뛰는 심장. 게이지가 높으면 위로 날카로운 경고음이 겹친다
    tone(62, 0.16, { f2: 38, vol: 0.45 + 0.4 * m, attack: 0.003 });
    tone(58, 0.12, { f2: 36, vol: 0.3 + 0.35 * m, at: 0.17, attack: 0.003 });
    if (m > 0.45) tone(700 + 900 * m, 0.06, { type: "square", vol: 0.04 + 0.1 * m, at: 0.02 });
    nextBeat = now + Math.max(0.24, 1.0 - 0.8 * m);
  }
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
    tone(660, 0.1, { type: "square", vol: 0.14 });
    tone(660, 0.1, { type: "square", vol: 0.14, at: 0.14 });
  },
  // 사이렌처럼 두 번 치솟는다
  charge: () => {
    tone(300, 0.55, { type: "sawtooth", f2: 900, vol: 0.16 });
    tone(300, 0.55, { type: "sawtooth", f2: 900, vol: 0.16, at: 0.6 });
  },
  // 조준 고정: 짧고 빠른 경보
  lock: () => {
    for (let i = 0; i < 4; i++) tone(1500, 0.07, { type: "square", vol: 0.12, at: i * 0.11 });
    tone(80, 0.5, { type: "sawtooth", f2: 50, vol: 0.25 });
  },
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
  // 얼굴 복원 장치: 원통이 돌아가는 톱니 소리와 제자리에 걸리는 소리
  ratchet: () => {
    for (let i = 0; i < 4; i++) tone(1900 + i * 90, 0.025, { type: "square", vol: 0.05, at: i * 0.075 });
    noise(0.32, { vol: 0.07, from: 2600, to: 900, q: 2 });
  },
  clunk: () => {
    tone(150, 0.12, { type: "triangle", f2: 90, vol: 0.32, attack: 0.002 });
    noise(0.09, { vol: 0.16, from: 1400, to: 500, q: 1.4 });
  },
  // 두 조각의 외곽선이 이어졌다: 짧고 맑은 울림
  seam: () => {
    tone(1046, 0.6, { vol: 0.07 });
    tone(1568, 0.7, { vol: 0.05, at: 0.05 });
  },
  // 얼굴이 맞아 장치가 잠긴다: 무거운 걸쇠, 그리고 낮은 화음
  faceLock: () => {
    tone(90, 0.3, { type: "triangle", f2: 60, vol: 0.45, attack: 0.002 });
    noise(0.2, { vol: 0.2, from: 1000, to: 300 });
    tone(392, 1.6, { vol: 0.12, at: 0.35, attack: 0.03 });
    tone(523, 1.8, { vol: 0.1, at: 0.45, attack: 0.03 });
    tone(784, 2.2, { vol: 0.07, at: 0.6, attack: 0.03 });
  },
  // 도시의 목소리가 끼어든다: 매끈하고 밝은 안내음 위에 지직거림
  cityVoice: () => {
    noise(0.35, { vol: 0.16, from: 5000, to: 1200 });
    tone(1318, 0.16, { vol: 0.12, at: 0.3 });
    tone(1760, 0.16, { vol: 0.12, at: 0.46 });
    tone(2093, 0.42, { vol: 0.1, at: 0.62 });
  },
  // 분홍 버튼: 말랑한 플라스틱 누름
  press: () => {
    tone(620, 0.08, { type: "sine", f2: 380, vol: 0.2 });
    tone(1046, 0.5, { vol: 0.1, at: 0.15 });
    tone(1318, 0.6, { vol: 0.08, at: 0.3 });
  },
  // 나무 레버: 삐걱 당기고 덜컥 걸린다
  lever: () => {
    noise(0.45, { vol: 0.12, from: 500, to: 260, q: 5 });
    tone(110, 0.25, { type: "triangle", f2: 70, vol: 0.4, at: 0.42, attack: 0.002 });
  },
  // 이산이 깨어난다: 낮고 따뜻하게 차오르는 소리
  wake: () => {
    tone(130.8, 5, { vol: 0.12, attack: 1.6 });
    tone(196, 5.5, { vol: 0.08, attack: 2, at: 0.6 });
    tone(329.6, 5, { vol: 0.05, attack: 2.2, at: 1.4 });
  },
  // 기록 검증 장치(퍼즐 B): 재생 손잡이를 돌리면 테이프가 감기듯 덜덜거린다
  handle: () => {
    for (let i = 0; i < 6; i++) tone(260 + i * 30, 0.04, { type: "square", vol: 0.05, at: i * 0.09 });
    noise(0.7, { vol: 0.08, from: 700, to: 1800, q: 3 });
    tone(140, 0.12, { type: "triangle", f2: 90, vol: 0.3, at: 0.62, attack: 0.002 });
  },
  // 묵직한 금속 버튼
  button: () => {
    tone(180, 0.09, { type: "triangle", f2: 110, vol: 0.36, attack: 0.002 });
    noise(0.07, { vol: 0.14, from: 2000, to: 700, q: 1.2 });
  },
  // 입력 = 처리 결과: 정상 처리의 밝은 두 음
  auditOk: () => {
    tone(880, 0.16, { vol: 0.14 });
    tone(1318, 0.42, { vol: 0.12, at: 0.13 });
  },
  // 입력 ≠ 처리 결과: 기계가 걸리는 소리와 반음 어긋난 화음
  auditError: () => {
    tone(220, 0.5, { type: "sawtooth", vol: 0.12 });
    tone(233, 0.5, { type: "sawtooth", vol: 0.12 });
    tone(110, 0.16, { type: "square", vol: 0.14, at: 0.55 });
    tone(104, 0.3, { type: "square", vol: 0.14, at: 0.72 });
  },
  // 감사 기록함: 작은 걸쇠가 풀리고 덮개가 들린다
  unlatch: () => {
    tone(1200, 0.05, { type: "square", vol: 0.08 });
    tone(320, 0.08, { type: "triangle", f2: 200, vol: 0.3, at: 0.12, attack: 0.002 });
    noise(0.35, { vol: 0.08, from: 900, to: 400, q: 4, at: 0.2 });
  },
  // 기록지가 롤러에서 끌려 나온다
  slip: () => {
    noise(0.55, { vol: 0.12, from: 3200, to: 2200, q: 1.5 });
    for (let i = 0; i < 5; i++) tone(90, 0.03, { type: "square", vol: 0.06, at: i * 0.1 });
  },
  // 장치가 멈추고 도시 안내가 툭 끊긴다
  cut: () => {
    tone(60, 0.25, { type: "sawtooth", f2: 30, vol: 0.3, attack: 0.002 });
    noise(0.08, { vol: 0.25, from: 5000, to: 2000 });
  },
  // 보증 장치에 불이 들어온다: 낮고 긴 한 음
  guarantor: () => {
    tone(73.4, 2.4, { type: "triangle", vol: 0.3, attack: 0.03 });
    tone(587, 0.9, { vol: 0.06, at: 0.2, attack: 0.05 });
  },
};
