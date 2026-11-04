// DELETE SEOUL v2: independent story state. No legacy A/B or ending keys are read or written.
export const STORY_V2_KEY = "sanlee-delete-seoul-story-v2";

export type Phase =
  | "arrival"
  | "recovery"
  | "origin"
  | "restored"
  | "discovered"
  | "confronted"
  | "crossing"
  | "decision"
  | "kept"
  | "left";

export type MemoryFlag = "r07Friend" | "childDrawing" | "radioHeard" | "monkClue";
export type StoryEvent =
  | "meet-san" | "read-origin" | "restore-san" | "discover-source"
  | "confront-san" | "enter-city" | "reach-core" | "keep-record" | "leave";

export type StoryV2 = {
  schema: 1;
  phase: Phase;
  memories: Record<MemoryFlag, boolean>;
};

const phases: Phase[] = ["arrival", "recovery", "origin", "restored", "discovered", "confronted", "crossing", "decision", "kept", "left"];
const memoryFlags: MemoryFlag[] = ["r07Friend", "childDrawing", "radioHeard", "monkClue"];

export function initialStory(): StoryV2 {
  return {
    schema: 1,
    phase: "arrival",
    memories: { r07Friend: false, childDrawing: false, radioHeard: false, monkClue: false },
  };
}

// Story decisions are gated here, never by the on-screen text or by stale timers.
const transitions: Partial<Record<Phase, Partial<Record<StoryEvent, Phase>>>> = {
  arrival: { "meet-san": "recovery" },
  recovery: { "read-origin": "origin" },
  origin: { "restore-san": "restored" },
  restored: { "discover-source": "discovered" },
  discovered: { "confront-san": "confronted" },
  confronted: { "enter-city": "crossing", leave: "left" },
  crossing: { "reach-core": "decision" },
  decision: { "keep-record": "kept" },
};

export function advanceStory(state: StoryV2, event: StoryEvent): StoryV2 {
  const next = transitions[state.phase]?.[event];
  return next ? { ...state, phase: next } : state;
}

export function remember(state: StoryV2, flag: MemoryFlag): StoryV2 {
  if (state.memories[flag] || state.phase === "kept" || state.phase === "left") return state;
  return { ...state, memories: { ...state.memories, [flag]: true } };
}

export function atLeast(state: StoryV2, phase: Phase): boolean {
  const current = phases.indexOf(state.phase);
  const target = phases.indexOf(phase);
  // "left" is a separate ending, not a continuation of the regular story.
  return state.phase !== "left" && current >= target;
}

export function parseStory(raw: string | null): StoryV2 {
  if (!raw) return initialStory();
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return initialStory();
    const record = data as Record<string, unknown>;
    if (record.schema !== 1 || !phases.includes(record.phase as Phase)) return initialStory();
    const memories = record.memories;
    if (!memories || typeof memories !== "object") return initialStory();
    const dataMemories = memories as Record<string, unknown>;
    if (!memoryFlags.every(flag => typeof dataMemories[flag] === "boolean")) return initialStory();
    return {
      schema: 1,
      phase: record.phase as Phase,
      memories: Object.fromEntries(memoryFlags.map(flag => [flag, dataMemories[flag]])) as StoryV2["memories"],
    };
  } catch {
    return initialStory();
  }
}

export type StoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readStory(storage?: StoryStorage): StoryV2 {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    return parseStory(target?.getItem(STORY_V2_KEY) ?? null);
  } catch {
    return initialStory();
  }
}

export function writeStory(state: StoryV2, storage?: StoryStorage): void {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    target?.setItem(STORY_V2_KEY, JSON.stringify(state));
  } catch { /* private mode / storage disabled: gameplay still works this session */ }
}

export function eraseStory(storage?: StoryStorage): void {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    target?.removeItem(STORY_V2_KEY);
  } catch { /* deletion can fail when storage is unavailable */ }
}

export const storyObjective: Record<Exclude<Phase, "left">, { ko: string; en: string }> = {
  arrival: { ko: "무명사를 둘러보고 이산에게 말을 걸어 보세요.", en: "Explore the shelter and speak to San." },
  recovery: { ko: "이산의 원본이 남은 장치를 찾아보세요.", en: "Find the device containing San's original." },
  origin: { ko: "기억 보관 장치에서 이산을 복원하세요.", en: "Restore San from the memory archive." },
  restored: { ko: "새로 켜진 관리 단말을 조사하세요.", en: "Inspect the newly activated control terminal." },
  discovered: { ko: "이산에게 그가 숨긴 진실을 물어보세요.", en: "Ask San what he has been hiding." },
  confronted: { ko: "지상으로 나가 진실을 확인하거나, 여기서 떠나세요.", en: "Seek the truth aboveground, or leave." },
  crossing: { ko: "대자비의 시선을 피해 중앙 단말로 가세요.", en: "Evade Great Compassion and reach the central terminal." },
  decision: { ko: "지워지는 기록을 확인하고 결정하세요.", en: "Review what will be erased, then decide." },
  kept: { ko: "당신은 기록을 남기기로 했습니다.", en: "You chose to keep the record." },
};