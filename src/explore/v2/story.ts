// DELETE SEOUL 3D story lab. Independent of legacy A/B and production save keys.
export const STORY_V2_KEY = "sanlee-delete-seoul-story-v2";

export type Phase =
  | "arrival" | "recovery" | "origin" | "restored"
  | "investigating" | "evidence" | "discovered" | "keeperQuestioned"
  | "confronted" | "crossing" | "decision" | "kept" | "left";

export type MemoryFlag = "r07Friend" | "childDrawing" | "radioHeard" | "monkClue";
export type ClueFlag = "r07" | "child" | "radio";
export type SourceFlag = "about" | "writing" | "works";
export type StoryEvent =
  | "meet-san" | "read-origin" | "restore-san" | "begin-investigation"
  | "review-evidence" | "question-keeper" | "confront-san"
  | "enter-city" | "reach-core" | "keep-record" | "leave";

export type StoryV2 = {
  schema: 2;
  phase: Phase;
  memories: Record<MemoryFlag, boolean>;
  clues: Record<ClueFlag, boolean>;
  sources: Record<SourceFlag, boolean>;
  comparisons: Record<ClueFlag, boolean>;
};

const phases: Phase[] = [
  "arrival", "recovery", "origin", "restored", "investigating",
  "evidence", "discovered", "keeperQuestioned", "confronted",
  "crossing", "decision", "kept", "left",
];
const memoryFlags: MemoryFlag[] = ["r07Friend", "childDrawing", "radioHeard", "monkClue"];
const clueFlags: ClueFlag[] = ["r07", "child", "radio"];
const sourceFlags: SourceFlag[] = ["about", "writing", "works"];

export function initialStory(): StoryV2 {
  return {
    schema: 2,
    phase: "arrival",
    memories: { r07Friend: false, childDrawing: false, radioHeard: false, monkClue: false },
    clues: { r07: false, child: false, radio: false },
    sources: { about: false, writing: false, works: false },
    comparisons: { r07: false, child: false, radio: false },
  };
}

// No timer-based progression: only completed player interactions advance the story.
const transitions: Partial<Record<Phase, Partial<Record<StoryEvent, Phase>>>> = {
  arrival: { "meet-san": "recovery" },
  recovery: { "read-origin": "origin" },
  origin: { "restore-san": "restored" },
  restored: { "begin-investigation": "investigating" },
  // The three witness/record comparisons unlock the source log; not a single button.
  discovered: { "question-keeper": "keeperQuestioned" },
  keeperQuestioned: { "confront-san": "confronted" },
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

// Three independent changes in characters' memories must be inspected before the archive unlocks.
// They do not require friendship or other optional relationship choices.
export function observeClue(state: StoryV2, flag: ClueFlag): StoryV2 {
  if (state.phase !== "investigating" || state.clues[flag]) return state;
  const clues = { ...state.clues, [flag]: true };
  const complete = clueFlags.every(key => clues[key]);
  return { ...state, clues, phase: complete ? "evidence" : "investigating" };
}

export function clueCount(state: StoryV2): number {
  return clueFlags.filter(key => state.clues[key]).length;
}

export function compareClue(state: StoryV2, flag: ClueFlag): StoryV2 {
  if (state.phase !== "evidence" || !state.clues[flag] || state.comparisons[flag]) return state;
  const comparisons = { ...state.comparisons, [flag]: true };
  return { ...state, comparisons, phase: clueFlags.every(k => comparisons[k]) ? "discovered" : "evidence" };
}

export function comparisonCount(state: StoryV2): number {
  return clueFlags.filter(k => state.comparisons[k]).length;
}

export function inspectSource(state: StoryV2, flag: SourceFlag): StoryV2 {
  if (state.phase !== "recovery" || state.sources[flag]) return state;
  return { ...state, sources: { ...state.sources, [flag]: true } };
}
export function sourceCount(state: StoryV2): number {
  return sourceFlags.filter(key => state.sources[key]).length;
}

export function atLeast(state: StoryV2, phase: Phase): boolean {
  if (state.phase === "left") return false;
  return phases.indexOf(state.phase) >= phases.indexOf(phase);
}

const isBoolRecord = (value: unknown, keys: readonly string[]): value is Record<string, boolean> =>
  !!value && typeof value === "object" && keys.every(k => typeof (value as Record<string, unknown>)[k] === "boolean");

export function parseStory(raw: string | null): StoryV2 {
  if (!raw) return initialStory();
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object") return initialStory();
    if (!isBoolRecord(data.memories, memoryFlags)) return initialStory();

    // The previous 5-minute lab has no suspicion scenes. Move those saves back to
    // the restoration milestone instead of silently skipping the new investigation.
    if (data.schema === 1) {
      const legacyPhase = data.phase;
      const phase: Phase = legacyPhase === "kept" || legacyPhase === "left" ? legacyPhase
        : legacyPhase === "crossing" || legacyPhase === "decision" ? legacyPhase
        : legacyPhase === "arrival" || legacyPhase === "recovery" || legacyPhase === "origin" ? legacyPhase
        : "restored";
      return { ...initialStory(), phase, memories: data.memories as StoryV2["memories"] };
    }
    if (data.schema !== 2 || !phases.includes(data.phase as Phase) || !isBoolRecord(data.clues, clueFlags)) return initialStory();
    const comparisons = isBoolRecord(data.comparisons, clueFlags)
      ? Object.fromEntries(clueFlags.map(k => [k, (data.comparisons as Record<string, boolean>)[k]])) as StoryV2["comparisons"]
      : initialStory().comparisons;
    const sources = isBoolRecord(data.sources, sourceFlags)
      ? Object.fromEntries(sourceFlags.map(k => [k, (data.sources as Record<string, boolean>)[k]])) as StoryV2["sources"]
      : initialStory().sources;
    return {
      schema: 2,
      phase: data.phase as Phase,
      memories: Object.fromEntries(memoryFlags.map(k => [k, (data.memories as Record<string, boolean>)[k]])) as StoryV2["memories"],
      clues: Object.fromEntries(clueFlags.map(k => [k, (data.clues as Record<string, boolean>)[k]])) as StoryV2["clues"],
      sources,
      comparisons,
    };
  } catch { return initialStory(); }
}

export type StoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function readStory(storage?: StoryStorage): StoryV2 {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    return parseStory(target?.getItem(STORY_V2_KEY) ?? null);
  } catch { return initialStory(); }
}
export function writeStory(state: StoryV2, storage?: StoryStorage): void {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    target?.setItem(STORY_V2_KEY, JSON.stringify(state));
  } catch { /* local-only games remain usable when storage is unavailable */ }
}
export function eraseStory(storage?: StoryStorage): void {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    target?.removeItem(STORY_V2_KEY);
  } catch { /* handled by caller UI */ }
}

export const storyObjective: Record<Exclude<Phase, "left">, { ko: string; en: string }> = {
  arrival: { ko: "잔상실의 사람들과 이야기하고 이산을 찾아보세요.", en: "Meet the residents of Afterimage and find San." },
  recovery: { ko: "옛 포트폴리오 단말 두 곳에서 이산의 흔적을 찾아보세요.", en: "Find traces of San in two old portfolio terminals." },
  origin: { ko: "기억 보관 장치를 통해 격리를 해제하세요.", en: "Use the memory archive to release the quarantine." },
  restored: { ko: "기록에 이상이 생겼습니다. 관리인에게 물어보세요.", en: "Something is wrong with the records. Ask the caretaker." },
  investigating: { ko: "R-07, 아이, 무전수가 기억하는 일을 비교하세요.", en: "Compare R-07's, the child's and the operator's memories." },
  evidence: { ko: "중앙 단말에서 세 사람의 증언과 저장 기록을 하나씩 대조하세요.", en: "Compare all three testimonies with the saved records at the terminal." },
  discovered: { ko: "기록을 누가 보냈는지 관리인에게 물어보세요.", en: "Ask the caretaker who sent the request." },
  keeperQuestioned: { ko: "이산에게 기록 정리 요청에 대해 따져 물으세요.", en: "Confront San about the memory purge request." },
  confronted: { ko: "대자비 중앙 장치에서 기억 정리 요청을 중단하세요.", en: "Reach Great Compassion to cancel the pending memory purge." },
  crossing: { ko: "대자비를 피해 중앙 장치에 도달해 정리 요청을 중단하세요.", en: "Reach the core and cancel the purge before the next sync." },
  decision: { ko: "기억 정리를 중단하거나, 이 브라우저의 세계를 지우세요.", en: "Cancel the purge or erase this browser's world." },
  kept: { ko: "기억 정리 요청을 중단했습니다.", en: "You canceled the purge and kept the memories." },
};
