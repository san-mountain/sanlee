# Puzzle A — Face restoration (`/deleteseoul`)

> **Legacy.** Feature of the published `/deleteseoul` work. Does not apply directly to the chase prototype (`/deleteseoul-lab/chase`).

A mechanical face-restoration device next to San's frozen statue in the bunker (B-7). Solving the picture puzzle triggers the city's "standard smile" correction and a choice.

## Rules
- Three wooden drums (top: hair/forehead, middle: eyes/nose, bottom: mouth/chin), three faces each, one correct face per drum.
- Start `START = [1,2,1]`, answer `[0,0,0]`, minimum 5 turns. Wrong faces are shifted versions of San's face or a wide/narrow wrong face; no other combination joins both seams.
- A correct seam between neighbours lights a gold outline and plays a tone. No numbers or check marks.
- When all three match, the device locks, the city adds the pink standard smile, and two controls appear:
  - Pink button 「표준 미소 적용」 → `method: "standard"`
  - Wooden lever 「원본 얼굴 보존」 → `method: "exception"`
  - Either completes the puzzle. `faceConsequences()` returns `additionalReview` and `expressionConstrained`.
- After the choice (about 19 s) the camera turns to San, who lifts his head; face, torso and arms regain colour, legs stay stone. Standard = fixed symmetric smile, original = unsmiling slightly crooked mouth with a left dimple.
- **After A, there is no end card.** The audit machine next to it becomes available and Puzzle B follows when the player approaches it (see [record-audit-puzzle.md](record-audit-puzzle.md)). The prototype end card appears after B. The bunker blast door stays locked for the new path.

## Controls
- PC: look at a drum, E or click (pointer locked). The targeted drum's rim and handle glow.
- Mobile: tap a drum or handle directly, or use the action button 「돌리기」 for the drum at screen centre.
- Choice: look at the button or lever, E / tap.

## Bell protection
- Uses the existing bell (8 s protection, 20 s cooldown from activation; see [record-protection.md](record-protection.md)).
- The final action is the button/lever press. If protection is active then, no `face.authenticate` citizen record is created.
- If the bell was struck after solving (before choosing), protection is treated as intended: if it expired, a "범종의 보호가 끝났습니다" confirmation appears and nothing runs until 「그대로 실행」 is chosen (also checked via `requireProtection` in the record API).

## Save (`sanlee-face-auth-v1`, schema 2)
- `drums`, `solved`, `method`, `legacy`. Protection usage is not saved.
- Leaving mid-puzzle keeps drum positions; solved-but-unchosen returns to the choice; chosen returns to the awakened San.
- Schema 1 saves that finished authentication keep only `method`.
- `legacy`: saves that had already opened all three terminals when this key was first created. They keep the old path (HUD n/3, terminals wake San, go up to the city). New players do not become legacy later.
- Progress reset and the site's city-record deletion also clear this key.

## Files
- `faceAuth.ts` rules/save, `faceRuntime.ts` phases, `faceArt.ts` canvas face art, `FaceMachine.tsx` 3D device.
- `ExploreClient.tsx` flow, `zones.ts` interaction targets (`when` per phase), `Statue.tsx` awakening, `Player.tsx` target filtering.
- Tests: `tests/face-auth.test.mjs`, browser play `tests/face-auth.browser.cjs`.

## Lines and future voice
- Spoken lines: `faceLines` in `story.ts` (ID, speaker, `ko`, `en`, `ms`); order per scene in `faceScenes`. ID format `a.<speaker>.<name>`.
- Non-spoken UI text: `faceUi`.
- `playLines` in `dialogue.ts` shows one line at a time and advances only after the last line.
- Voice hooks: `startLine` (play by ID) and `lineDuration` (replace `ms` with clip length) in `dialogue.ts`. No audio files or TTS exist yet. Subtitle elements carry `data-line`.
