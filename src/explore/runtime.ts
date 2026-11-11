// Session time excludes pauses. Input blocking (dialogue/cinematics) is separate.
let pausedAt: number | null = null;
let offset = 0;
let origin = performance.now();

export const runtime = {
  get paused() { return pausedAt !== null; },
  now: () => (pausedAt ?? performance.now()) - offset - origin,
  setPaused(value: boolean) {
    if (value && pausedAt === null) pausedAt = performance.now();
    else if (!value && pausedAt !== null) {
      offset += performance.now() - pausedAt;
      pausedAt = null;
    }
  },
  reset() {
    pausedAt = null;
    offset = 0;
    origin = performance.now();
  },
};

// 장면 준비 상태: 구역이 바뀌면 World의 Warm이 셰이더·텍스처·모양을 미리 올리고, 끝나면 ready를 켠다.
// 화면 전환(검은 화면)은 이것을 기다렸다가 걷힌다
export const warm = { ready: true, id: 0 };

// 이번 방문 동안 방문자가 한 사소한 일들. 검문소의 '도시가 저장한 기록'과 이산의 가벼운 말이 읽는다 (어디에도 저장하지 않는다)
export const tally = { jumps: 0, ran: false, caught: 0, lost: 0, r07: 0, withdraw: 0, sat: false, look: {} as Record<number, number> };
export const resetTally = () => Object.assign(tally, { jumps: 0, ran: false, caught: 0, lost: 0, r07: 0, withdraw: 0, sat: false, look: {} });

// Explicit advancement makes cancellation and pause behavior independently testable.
export class GameTimers {
  private time = 0;
  private nextId = 1;
  private tasks = new Map<number, { at: number; repeat: number; run: () => void }>();
  setTimeout = (run: () => void, ms = 0) => this.add(run, ms, 0);
  setInterval = (run: () => void, ms = 0) => this.add(run, ms, Math.max(1, ms));
  clearTimeout = (id?: number) => { if (id !== undefined) this.tasks.delete(id); };
  clearInterval = this.clearTimeout;
  clear = () => this.tasks.clear();
  private add(run: () => void, ms: number, repeat: number) {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.time + Math.max(0, ms), repeat, run });
    return id;
  }
  advance(ms: number) {
    if (!Number.isFinite(ms) || ms <= 0) return;
    this.time += ms;
    for (const [id, task] of [...this.tasks]) {
      if (!this.tasks.has(id) || task.at > this.time) continue;
      if (task.repeat) task.at = this.time + task.repeat;
      else this.tasks.delete(id);
      task.run();
    }
  }
}
