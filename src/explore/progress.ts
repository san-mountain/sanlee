// The target must remain reachable even if the visitor walked ahead of San.
export function finalStepTarget(startX: number, x0: number, x1: number) {
  return Math.min(x1 - 0.1, Math.max(x0 + 1.2, startX + 1));
}

export function uniqueIds<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is T => allowed.includes(id)))];
}
