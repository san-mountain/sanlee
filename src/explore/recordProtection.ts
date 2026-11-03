// 범종은 보호 장치를 작동시킨다. 소리 재생과 보호 판정은 연결하지 않는다.
export const RECORD_PROTECTION_CONFIG = {
  durationMs: 8_000,
  // 재사용 대기는 작동 시작 시각부터 센다.
  cooldownMs: 20_000,
} as const;

export type ProtectionConfig = { durationMs: number; cooldownMs: number };
export type ProtectionSnapshot = {
  startedAt: number | null;
  endsAt: number | null;
  readyAt: number;
  active: boolean;
  remainingMs: number;
  cooldownRemainingMs: number;
};

// 문서 안에서는 시스템 시계 조정으로 보호 시간이 늘어나지 않도록 단조 시계를 사용한다.
export const recordTime = () => typeof performance === "undefined"
  ? Date.now()
  : performance.timeOrigin + performance.now();

export function createRecordProtection(
  config: ProtectionConfig = RECORD_PROTECTION_CONFIG,
  now: () => number = recordTime
) {
  if (!Number.isFinite(config.durationMs) || config.durationMs <= 0 || !Number.isFinite(config.cooldownMs) || config.cooldownMs < 0) {
    throw new Error("Invalid record protection timing");
  }
  const { durationMs, cooldownMs } = config;
  let startedAt: number | null = null;
  let endsAt: number | null = null;
  let readyAt = 0;
  const isProtected = (at = now()) => startedAt !== null && endsAt !== null && startedAt <= at && at < endsAt;

  return {
    ring() {
      const at = now();
      if (isProtected(at) || at < readyAt) return false;
      startedAt = at;
      endsAt = at + durationMs;
      readyAt = at + cooldownMs;
      return true;
    },
    isProtected,
    snapshot(): ProtectionSnapshot {
      const at = now();
      const active = isProtected(at);
      return {
        startedAt,
        endsAt,
        readyAt,
        active,
        remainingMs: active ? endsAt! - at : 0,
        cooldownRemainingMs: Math.max(0, readyAt - at),
      };
    },
    // 도시 기록 삭제가 메모리의 장치 상태까지 함께 비울 때 사용한다.
    reset() {
      startedAt = endsAt = null;
      readyAt = 0;
    },
  };
}

// 시간은 프레임/예약 콜백 대신 실행 시각으로 판정한다. 보호 사용 이력은 저장하지 않는다.
export const protection = createRecordProtection();
