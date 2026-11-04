// DELETE SEOUL 추격 실험판 전용 입력 시스템.
//
// 공개 게임(/deleteseoul)이 쓰는 src/explore/input.ts·TouchControls.tsx와 완전히 분리되어 있다.
// 이전 실험판의 조이스틱이 멈춘 원인은, 터치 기기에서도 시작 버튼이 포인터 잠금을 요청해
// 화면 전체가 잠긴 상태가 되는 것이었다. 잠긴 상태에서는 setPointerCapture가 InvalidStateError를
// 던지고, 화면 탭이 전부 '상호작용'으로 해석되었다. 이 모듈은 다음 규칙으로 그 문제를 구조적으로 없앤다.
//
// 1. 포인터 잠금은 pointerType === "mouse"인 입력에서만 요청한다.
// 2. 터치는 pointerId별로 역할을 나눈다. 화면 왼쪽에서 시작한 첫 손가락은 이동, 나머지는 시점.
//    그래서 이동과 시점 회전을 동시에 할 수 있다.
// 3. setPointerCapture를 쓰지 않는다. move/up은 window에서 pointerId로 추적한다.
//    (touch-action:none 표면 위의 터치는 브라우저가 자동으로 대상에 고정한다)
// 4. 손을 떼거나, 취소되거나, 화면이 회전하거나, 창이 포커스를 잃으면 모든 포인터를 즉시 놓는다.
// 5. 리스너는 attach()가 돌려주는 detach()로 한 번에 정리한다.

export type MoveFrame = { x: number; y: number; run: boolean };

export type InputDebug = {
  enabled: boolean;
  locked: boolean;
  joy: { x: number; y: number; active: boolean };
  lookPointers: number;
  keys: string;
  hold: boolean;
  mode: "touch" | "mouse";
};

type JoyVisual = { base: HTMLElement; knob: HTMLElement } | null;

const JOY_RADIUS = 52;
const JOY_DEADZONE = 0.12;
const TOUCH_LOOK = 0.0062;
const DRAG_LOOK = 0.0042;
const MOUSE_LOOK = 0.0022;

export function isCoarsePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

export class ChaseInput {
  enabled = false;
  sens = 1;
  // 이동 조이스틱 (오른쪽 +x, 앞 +y)
  readonly joy = { x: 0, y: 0 };
  private joyPointer: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private joyVisual: JoyVisual = null;
  // 시점 포인터들
  private look = new Map<number, { x: number; y: number }>();
  private lookAcc = { yaw: 0, pitch: 0 };
  // 키보드
  readonly keys = new Set<string>();
  // 길게 누르기 상호작용 (E키, 잠금 상태 마우스 왼쪽, 터치 행동 버튼)
  private holdSources = new Set<string>();
  private holdPointer: number | null = null;
  private root: HTMLElement | null = null;
  private lastMode: "touch" | "mouse" = "mouse";

  /** 입력 표면에 리스너를 등록한다. 돌려준 함수로 전부 해제된다. */
  attach(surface: HTMLElement, root: HTMLElement, cb: { onLockLost?: () => void; onPause?: () => void }) {
    this.root = root;
    const locked = () => typeof document !== "undefined" && document.pointerLockElement === root;

    const down = (e: PointerEvent) => {
      if (!this.enabled) return;
      if (e.pointerType === "mouse") {
        this.lastMode = "mouse";
        if (locked()) {
          if (e.button === 0) this.holdSources.add("mouse");
          return;
        }
        // 잠금이 지원되지 않거나 거부된 경우를 위해 드래그 시점도 함께 쓴다
        this.requestLock();
        this.look.set(e.pointerId, { x: e.clientX, y: e.clientY });
        return;
      }
      this.lastMode = "touch";
      e.preventDefault();
      const leftSide = e.clientX < window.innerWidth * 0.45;
      if (leftSide && this.joyPointer === null) {
        this.joyPointer = e.pointerId;
        this.joyOrigin = { x: e.clientX, y: e.clientY };
        this.setJoy(0, 0);
        this.paintJoy(true, 0, 0);
      } else {
        this.look.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId === this.joyPointer) {
        let dx = e.clientX - this.joyOrigin.x;
        let dy = e.clientY - this.joyOrigin.y;
        const d = Math.hypot(dx, dy);
        if (d > JOY_RADIUS) {
          dx = (dx / d) * JOY_RADIUS;
          dy = (dy / d) * JOY_RADIUS;
        }
        this.setJoy(dx / JOY_RADIUS, -dy / JOY_RADIUS);
        this.paintJoy(true, dx, dy);
        return;
      }
      const p = this.look.get(e.pointerId);
      if (!p || locked()) return;
      const k = (e.pointerType === "touch" ? TOUCH_LOOK : DRAG_LOOK) * this.sens;
      this.lookAcc.yaw -= (e.clientX - p.x) * k;
      this.lookAcc.pitch -= (e.clientY - p.y) * k;
      p.x = e.clientX;
      p.y = e.clientY;
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId === this.joyPointer) this.releaseJoy();
      // 행동 버튼이 누르는 도중 사라져도(대상이 바뀌어 언마운트) 손을 떼면 반드시 풀린다
      if (e.pointerId === this.holdPointer) this.setTouchHold(false);
      this.look.delete(e.pointerId);
      if (e.pointerType === "mouse") this.holdSources.delete("mouse");
    };

    const mouseMove = (e: MouseEvent) => {
      if (!locked() || !this.enabled) return;
      const mx = Math.max(-160, Math.min(160, e.movementX));
      const my = Math.max(-160, Math.min(160, e.movementY));
      this.lookAcc.yaw -= mx * MOUSE_LOOK * this.sens;
      this.lookAcc.pitch -= my * MOUSE_LOOK * this.sens;
    };

    const lockChange = () => {
      if (!locked()) {
        this.holdSources.delete("mouse");
        if (this.enabled) cb.onLockLost?.();
      }
    };

    const keyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      if (e.code === "Escape" || e.code === "KeyP") {
        if (this.enabled && !locked()) cb.onPause?.();
        return;
      }
      if (!this.enabled) return;
      if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        this.holdSources.add("key");
        return;
      }
      if (e.code.startsWith("Arrow")) e.preventDefault();
      this.lastMode = "mouse";
      this.keys.add(e.code);
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") this.holdSources.delete("key");
      this.keys.delete(e.code);
    };

    // 화면 회전·크기 변경·포커스 상실: 조이스틱 원점이 무의미해지므로 모두 놓는다
    const resetAll = () => this.releaseAll();
    const hidden = () => {
      if (document.visibilityState === "hidden") {
        this.releaseAll();
        if (this.enabled) cb.onPause?.();
      }
    };

    surface.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("mousemove", mouseMove);
    document.addEventListener("pointerlockchange", lockChange);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", resetAll);
    window.addEventListener("resize", resetAll);
    window.addEventListener("orientationchange", resetAll);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      surface.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("pointerlockchange", lockChange);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", resetAll);
      window.removeEventListener("resize", resetAll);
      window.removeEventListener("orientationchange", resetAll);
      document.removeEventListener("visibilitychange", hidden);
      this.releaseAll();
      this.exitLock();
      this.root = null;
    };
  }

  /** 마우스 사용자의 클릭 안에서만 부른다. 터치 입력에서는 절대 잠그지 않는다. */
  requestLock() {
    const el = this.root;
    if (!el || !el.requestPointerLock || document.pointerLockElement === el) return;
    try {
      const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => {});
    } catch {}
  }
  exitLock() {
    if (typeof document !== "undefined" && document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) {
      this.releaseAll();
      this.exitLock();
    }
  }

  bindJoystickVisual(v: JoyVisual) {
    this.joyVisual = v;
    this.paintJoy(this.joyPointer !== null, 0, 0);
  }

  /** 터치 행동 버튼 */
  setTouchHold(v: boolean, pointerId: number | null = null) {
    if (v && this.enabled) {
      this.holdSources.add("touch");
      this.holdPointer = pointerId;
    } else {
      this.holdSources.delete("touch");
      this.holdPointer = null;
    }
  }
  get hold() {
    return this.enabled && this.holdSources.size > 0;
  }

  /** 이번 프레임까지 쌓인 시점 회전(라디안)을 꺼내고 비운다 */
  consumeLook() {
    const v = { yaw: this.lookAcc.yaw, pitch: this.lookAcc.pitch };
    this.lookAcc.yaw = 0;
    this.lookAcc.pitch = 0;
    return v;
  }

  /** 키보드와 조이스틱을 합친 이동 벡터. 길이는 최대 1 */
  moveVector(): MoveFrame {
    if (!this.enabled) return { x: 0, y: 0, run: false };
    const k = this.keys;
    let x = this.joy.x;
    let y = this.joy.y;
    if (k.has("KeyW") || k.has("ArrowUp")) y += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) y -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) x += 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) x -= 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const run = k.has("ShiftLeft") || k.has("ShiftRight") || Math.hypot(this.joy.x, this.joy.y) > 0.86;
    return { x, y, run };
  }

  releaseAll() {
    this.releaseJoy();
    this.look.clear();
    this.keys.clear();
    this.holdSources.clear();
    this.holdPointer = null;
    this.lookAcc.yaw = 0;
    this.lookAcc.pitch = 0;
  }

  debug(): InputDebug {
    return {
      enabled: this.enabled,
      locked: typeof document !== "undefined" && !!this.root && document.pointerLockElement === this.root,
      joy: { x: this.joy.x, y: this.joy.y, active: this.joyPointer !== null },
      lookPointers: this.look.size,
      keys: [...this.keys].join(" "),
      hold: this.hold,
      mode: this.lastMode,
    };
  }

  private setJoy(x: number, y: number) {
    const len = Math.hypot(x, y);
    if (len < JOY_DEADZONE) {
      this.joy.x = 0;
      this.joy.y = 0;
      return;
    }
    // 데드존 바깥을 0~1로 다시 펼친다
    const k = (len - JOY_DEADZONE) / (1 - JOY_DEADZONE) / len;
    this.joy.x = x * k;
    this.joy.y = y * k;
  }

  private releaseJoy() {
    this.joyPointer = null;
    this.joy.x = 0;
    this.joy.y = 0;
    this.paintJoy(false, 0, 0);
  }

  private paintJoy(active: boolean, dx: number, dy: number) {
    const v = this.joyVisual;
    if (!v) return;
    if (active) {
      const r = v.base.offsetParent?.getBoundingClientRect();
      v.base.style.left = `${this.joyOrigin.x - (r?.left ?? 0)}px`;
      v.base.style.top = `${this.joyOrigin.y - (r?.top ?? 0)}px`;
      v.base.dataset.active = "1";
    } else {
      v.base.style.left = "";
      v.base.style.top = "";
      delete v.base.dataset.active;
    }
    v.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
}
