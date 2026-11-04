// 대사 장면 재생: 자막을 한 줄씩 띄우고, 마지막 줄이 끝나면 다음 연출로 넘긴다.
// 지금은 자막만 있다. 음성은 아직 없다 (파일·TTS·오디오 시스템 없음).
//
// [음성 연결 지점] 나중에 음성을 붙일 때는 이 파일의 두 곳만 바꾸면 된다.
//   1) startLine: line.id로 음성을 찾아 재생한다 (켜져 있을 때만).
//   2) lineDuration: 음성이 있으면 그 길이(또는 재생 끝 이벤트)를, 없거나 꺼져 있으면 line.ms를 쓴다.
// 음성을 끄거나 파일이 없어도 지금처럼 자막 시간만으로 끝까지 진행된다.
import type { Line } from "./story";

export type LineEvents = {
  // 자막을 띄운다 (null이면 지운다)
  show: (line: Line | null) => void;
  // 연출 타이머. 장면을 중간에 끊을 수 있도록 부르는 쪽이 모아서 관리한다
  later: (ms: number, fn: () => void) => void;
  // Story-heavy scenes may pause on a line until the player chooses to continue.
  // A null value removes the pending advance action (e.g. when the scene finishes).
  waitForAdvance?: (next: (() => void) | null) => void;
};

// 한 줄이 시작될 때. 지금은 아무 소리도 내지 않는다
function startLine(_line: Line) {}

// 한 줄이 화면에 머무는 시간
export function lineDuration(line: Line) {
  return line.ms;
}

// Auto mode is preserved for machinery/camera beats. Manual mode is intended
// for dialogue and record explanations; it never silently skips an unread line.
export function playLines(lines: Line[], ev: LineEvents, done: () => void, gap = 0, mode: "auto" | "manual" = "auto") {
  const manual = mode === "manual" && !!ev.waitForAdvance;
  ev.waitForAdvance?.(null);
  const step = (i: number) => {
    if (i >= lines.length) {
      ev.waitForAdvance?.(null);
      ev.show(null);
      done();
      return;
    }
    const line = lines[i];
    ev.show(line);
    startLine(line);
    const advance = () => {
      ev.waitForAdvance?.(null);
      if (gap && i < lines.length - 1) {
        ev.show(null);
        ev.later(gap, () => step(i + 1));
      } else step(i + 1);
    };
    if (manual) ev.waitForAdvance?.(advance);
    else ev.later(lineDuration(line), advance);
  };
  step(0);
}
