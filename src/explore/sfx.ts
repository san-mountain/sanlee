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
  applyAmb();
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
// 잡음 버퍼는 한 번만 만들어 두고 매번 다른 자리부터 꺼내 쓴다 (발소리처럼 자주 나는 소리도 가볍게)
let noiseBuf: AudioBuffer | null = null;
function nbuf(c: AudioContext) {
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    const len = Math.ceil(c.sampleRate * 3);
    noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
// 잡음: 바람, 문, 지직거림
function noise(d: number, { vol = 0.3, at = 0, from = 1800, to = 300, q = 0.8 } = {}) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = nbuf(c);
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = q;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(d * 0.15, 0.03 + d * 0.1));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(bp).connect(g).connect(master);
  src.start(t, Math.random() * 2);
  src.stop(t + d + 0.02);
}

// 휴대폰 진동 (지원하는 기기에서만, 효과음을 꺼 두면 함께 꺼진다)
function buzz(p: number | number[]) {
  if (!on || typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(p);
  } catch {}
}

// 구역의 바탕 소리: 방공호는 환기구의 낮은 바람과 전원 웅웅거림, 가끔 떨어지는 물방울.
// 지상은 높은 곳의 바람이 천천히 불었다 잦아든다. 음악 밑에 깔릴 만큼만 작게
export type Amb = "bunker" | "city" | null;
type AmbNodes = { kind: "bunker" | "city"; g: GainNode; stop: () => void };
let amb: AmbNodes | null = null;
let ambWant: Amb = null;
let ambLevel = 1;
let dripTimer: ReturnType<typeof setTimeout> | undefined;
const AMB_GAIN = { bunker: 0.75, city: 0.6 };
function buildAmb(c: AudioContext, kind: "bunker" | "city"): AmbNodes {
  const g = c.createGain();
  g.gain.value = 0;
  g.connect(master!);
  const src = c.createBufferSource();
  src.buffer = nbuf(c);
  src.loop = true;
  const nodes: AudioScheduledSourceNode[] = [src];
  if (kind === "bunker") {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    lp.Q.value = 0.6;
    src.connect(lp).connect(g);
    // 전원 웅웅거림: 아주 작게
    const hum = c.createOscillator();
    hum.frequency.value = 60;
    const hg = c.createGain();
    hg.gain.value = 0.05;
    hum.connect(hg).connect(g);
    nodes.push(hum);
  } else {
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 380;
    bp.Q.value = 0.5;
    const gust = c.createGain();
    gust.gain.value = 0.6;
    // 바람이 12초쯤마다 불었다 잦아든다 (세기와 높이가 함께 출렁인다)
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.083;
    const depth = c.createGain();
    depth.gain.value = 0.4;
    lfo.connect(depth).connect(gust.gain);
    const fd = c.createGain();
    fd.gain.value = 160;
    lfo.connect(fd).connect(bp.frequency);
    src.connect(bp).connect(gust).connect(g);
    nodes.push(lfo);
  }
  nodes.forEach((n) => n.start());
  return {
    kind,
    g,
    stop: () => {
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0, t, 0.5);
      nodes.forEach((n) => {
        try {
          n.stop(t + 2.5);
        } catch {}
      });
      setTimeout(() => g.disconnect(), 2700);
    },
  };
}
function drip() {
  clearTimeout(dripTimer);
  if (!on || ambWant !== "bunker") return;
  dripTimer = setTimeout(() => {
    if (ambWant === "bunker" && ambLevel > 0.5) {
      const f = 1300 + Math.random() * 700;
      tone(f, 0.09, { f2: f * 0.6, vol: 0.05 * ambLevel, attack: 0.002 });
      tone(f * 1.5, 0.05, { vol: 0.015 * ambLevel, at: 0.01, attack: 0.002 });
    }
    drip();
  }, 5000 + Math.random() * 9000);
}
function applyAmb() {
  if (!on || !ambWant) {
    amb?.stop();
    amb = null;
    clearTimeout(dripTimer);
    return;
  }
  const c = ac();
  if (!c || !master) return;
  if (amb && amb.kind !== ambWant) {
    amb.stop();
    amb = null;
  }
  const fresh = !amb;
  if (!amb) amb = buildAmb(c, ambWant);
  amb.g.gain.setTargetAtTime(AMB_GAIN[amb.kind] * ambLevel, c.currentTime, fresh ? 1.2 : 0.4);
  if (fresh && ambWant === "bunker") drip();
}
// kind가 없으면 서서히 사라진다. level은 0~1 (설정창, 대화 중에는 낮춘다)
export function ambience(kind: Amb, level = 1) {
  if (kind === ambWant && Math.abs(level - ambLevel) < 0.03 && (!!amb || !on || !kind)) return;
  ambWant = kind;
  ambLevel = level;
  applyAmb();
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

export type Voice = "san" | "robot" | "radio" | "person" | "none";
const blip = () => tone(1180, 0.05, { type: "square", vol: 0.08 });
export const sfx = {
  // 대화 넘김, 작은 버튼
  blip,
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
    buzz([60, 50, 60]);
    for (let i = 0; i < 4; i++) tone(1500, 0.07, { type: "square", vol: 0.12, at: i * 0.11 });
    tone(80, 0.5, { type: "sawtooth", f2: 50, vol: 0.25 });
  },
  beam: () => {
    buzz(320);
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
  // 도시의 목소리가 끼어든다: 지직임 뒤 밝은 세 음
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
  // R-07에게 두 번 두드림 (방문자의 말이 아니라 실제 소리)
  knock: () => {
    tone(190, 0.07, { type: "triangle", f2: 120, vol: 0.32 });
    noise(0.05, { vol: 0.12, from: 1800, to: 600 });
    tone(190, 0.07, { type: "triangle", f2: 120, vol: 0.32, at: 0.2 });
    noise(0.05, { vol: 0.12, from: 1800, to: 600, at: 0.2 });
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
  // 드론: 대자비(낮은 사인·징)와 섞이지 않도록 높고 짧은 전자음
  droneSpot: () => {
    tone(1560, 0.06, { type: "square", vol: 0.06 });
    tone(2080, 0.08, { type: "square", vol: 0.06, at: 0.08 });
  },
  droneLost: () => tone(1800, 0.18, { type: "triangle", f2: 900, vol: 0.05 }),
  droneId: () => {
    buzz([40, 80, 40]);
    tone(2400, 0.08, { type: "square", vol: 0.07 });
    tone(2400, 0.08, { type: "square", vol: 0.07, at: 0.12 });
    tone(2400, 0.22, { type: "square", f2: 1200, vol: 0.07, at: 0.24 });
  },
  // 발소리: 방공호는 콘크리트(낮고 둔하게), 지상은 돌 포장(조금 더 또렷하게). 걸음마다 높이를 조금씩 흔든다
  step: (where: "bunker" | "city" | "stair", run: boolean) => {
    const v = run ? 1 : 0.72;
    const r = 0.88 + Math.random() * 0.24;
    if (where === "bunker") {
      tone(92 * r, 0.08, { type: "triangle", f2: 58, vol: 0.28 * v, attack: 0.002 });
      noise(0.07, { vol: 0.15 * v, from: 1300 * r, to: 420, q: 1.1 });
    } else {
      tone(120 * r, 0.06, { type: "triangle", f2: 70, vol: 0.22 * v, attack: 0.002 });
      noise(0.06, { vol: 0.19 * v, from: 2600 * r, to: 900, q: 1.4 });
      // 계단: 텅 빈 아래에서 한 박 늦게 되돌아온다
      if (where === "stair") noise(0.08, { vol: 0.06 * v, from: 1800 * r, to: 700, q: 1.4, at: 0.19 });
    }
  },
  // 점프 뒤 착지
  land: (where: "bunker" | "city" | "stair") => {
    tone(where === "bunker" ? 78 : 96, 0.14, { type: "triangle", f2: 48, vol: 0.26, attack: 0.002 });
    noise(0.11, { vol: 0.12, from: where === "bunker" ? 1000 : 1800, to: 360, q: 1 });
  },
  // 말하는 이의 목소리 대신 짧은 소리 (대사가 한 줄 뜰 때마다)
  voice: (k: Voice) => {
    const r = 0.94 + Math.random() * 0.12;
    if (k === "san") {
      tone(587 * r, 0.1, { vol: 0.07, attack: 0.012 });
      tone(784 * r, 0.14, { vol: 0.05, at: 0.07, attack: 0.012 });
    } else if (k === "robot") {
      for (let i = 0; i < 3; i++) tone((1100 + Math.random() * 700) * r, 0.035, { type: "square", vol: 0.05, at: i * 0.06 });
    } else if (k === "radio") {
      noise(0.16, { vol: 0.1, from: 3200, to: 1600, q: 3 });
      tone(1000, 0.04, { type: "square", vol: 0.03, at: 0.15 });
    } else if (k === "person") {
      tone((330 + Math.random() * 90) * r, 0.09, { type: "triangle", vol: 0.09, attack: 0.01 });
      tone((440 + Math.random() * 90) * r, 0.1, { type: "triangle", vol: 0.06, at: 0.07, attack: 0.01 });
    } else blip();
  },
  // 망원경: 초점 고리가 돌아가며 렌즈가 당겨진다 / 눈을 떼면 풀린다
  scopeIn: () => {
    for (let i = 0; i < 5; i++) tone(2300 + i * 60, 0.02, { type: "square", vol: 0.03, at: 0.05 + i * 0.07 });
    noise(0.55, { vol: 0.07, from: 500, to: 2200, q: 4 });
  },
  scopeOut: () => noise(0.35, { vol: 0.06, from: 2200, to: 500, q: 4 }),
  // 수락 결말: 이산이 돌처럼 굳는다. 낮게 갈리는 소리 위로 잔금이 가는 소리
  stone: () => {
    tone(52, 3.2, { type: "sine", f2: 40, vol: 0.22, attack: 0.6 });
    noise(3.2, { vol: 0.12, from: 420, to: 140, q: 2 });
    for (let i = 0; i < 12; i++) tone(1800 + Math.random() * 2400, 0.012, { type: "square", vol: 0.025, at: 0.3 + Math.random() * 2.8, attack: 0.001 });
  },
  // 거부 결말: 화면이 하얗게 멎는 순간. 높은 음이 솟다가 뚝 끊긴다
  freeze: () => {
    buzz(200);
    tone(1320, 0.7, { f2: 2640, vol: 0.08, attack: 0.4 });
    noise(0.7, { vol: 0.08, from: 1200, to: 6000, q: 0.7 });
  },
};
