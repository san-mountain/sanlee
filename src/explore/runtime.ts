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
