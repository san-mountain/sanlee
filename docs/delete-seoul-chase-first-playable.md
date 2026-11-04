# DELETE SEOUL — Chase prototype (current)

Route: `/deleteseoul-lab/chase` (unlisted, `noindex`). Code: `src/explore/v3/chase/` and `src/app/deleteseoul-lab/chase/page.tsx`.
The published `/deleteseoul` and its input code are not touched by this work.

## Scope
Implemented: intro → first meeting → zone power → chase → subway stairs. Reaching the stairs is the **end of the implemented section**, not the story's ending.

Not implemented (later story): the underground archive with 2026 development records and San's original NPC role, the reveal of San's identity, and the final choice with its endings.

## Flow
Lines and labels live in `logic.ts` and `Scene.tsx`; only their intent is listed here.
1. **intro** — Alone in dark dead-end passage B-2. San is not visible, silent and inactive. A small local-power box by the passage door has thin cables to the door, the passage lights and the inner shutter panel.
2. **First device (local power)** — Hold to restore. Only the passage door and lights come on; the shutter panel goes from off to amber (locked).
3. **meet** — San is revealed crouching in a niche past the door. They are strangers; he needs to pass the same shutter, which is the reason for travelling together.
4. **approach** — San opens the shutter from its panel. The HUD never tells the player to follow San.
5. **relay (zone power)** — At the junction San says the main-street gate has no power. The zone-power device's thick cable visibly runs to the watch tower and the gate panel (off until restored). While the player holds it, San notices the cable leads to the tower (a discovered risk, not a ban); if the player lets go, San confirms there is no other way.
6. **surge** — Lamps come on, then the giant searchlight sweeps up the street and catches San (camera follows the beam), the system flags an unregistered entity, San shouts to run. No player detection during this scene.
7. **chase** — Three sections, three decisions (`level.ts` `LIGHTS`, `COVERS`):
   - L1: one readable sweep across the street with sure cover north of the bus shelter. San hides first to demonstrate.
   - L2: one sweep across two routes (van to the west, kiosk to the east); each route has a gap while the light is on the other side. Between L1 and L2 is a band no light reaches.
   - Gate (L3): the giant light, mounted beside the gate so the closed gate's occlusion matches the view, passes the panel periodically. The player alternates between the shade east of the truck and the panel (3.2 s cumulative hold).
8. **escape** — Through the gate to the Euljiro 3-ga exit 2 stairs → completion screen marked as the end of the implemented section.

Failure retries from a checkpoint (chase start / after the gate). The intro and first meeting never repeat; 처음부터 restarts from the intro. San's memory line plays only on the first retry.

## Design intent: detection, cover, San
Tuning values are constants at the top of the detection section in `logic.ts` (`RATE_CORE`, `RATE_EDGE`, `TRACK_AFTER`, `DECAY_*`, `LOSE_AFTER`, `SEARCH_TIME`, `GRACE`). Initial targets, not verified by play:
- The meter means "how sure the city is of your position". About 3 s to fail at a light's core, about 5 s at the edge; overlapping lights never add up.
- A light starts tracking only after about 0.8 s of continuous exposure. A brief graze recovers. When sight breaks, the light searches the last-seen spot briefly, then resumes patrol.
- The grace period at chase start and after retries blocks both meter rise and tracking build-up.
- "Covered" means inside a light's radius but with the line of sight blocked by cover, buildings or a closed door. The HUD shows it only then, and shows rising (exposed) vs fading (covered / out of sight).
- Light colour states: patrol (white) → noticing the player (amber) → tracking (red) → searching (orange).
- San obeys the same lights (lower chest when crouched). His exposure never adds to the player's meter; a light tracks whoever it actually saw.
- San (`nav.ts`) has a body radius and collides with buildings, cover and closed doors, checks each movement segment, replans when blocked, waits when no path exists, never teleports, and follows stair height.
- In the chase San waits in cover that is safe for the light layout, leaves only when the player is near and the next leg is predicted clear, waits again at the next cover, and runs for the nearest shade when exposed.
- San's warnings are decided after detection, from the current frame's positions and predicted patrols with occlusion; with no evidence he stays silent. Urgent warnings (exposed, gate danger) are never overridden by normal ones, and warnings are withdrawn when their condition ends. Exact conditions are in `stepCallouts` in `logic.ts`.

## Files
- `input.ts` — the only input system for this route (keyboard, mouse + pointer lock, touch). Independent of `src/explore/input.ts`.
- `level.ts` — geometry and numbers shared by rules and rendering.
- `nav.ts` — San's collision radius, node graph (closed doors cut links), A* path, patrol prediction.
- `logic.ts` — pure TS state and `stepGame()`. All timers use simulation time, so pause freezes everything.
- `Scene.tsx` — R3F scene; reads only `gameRef`.
- `ChaseGame.tsx` — screens, HUD (React state ≤10×/s, only on change), sfx, quality, debug.
- Shared code from `src/explore/`: `sfx.ts`, `parts.tsx`, `textures.ts`, `atmosphere.tsx`, `towerMaterial.ts`.

## Input rules (keep these)
An earlier start button requested pointer lock on touch devices, which locked the page, broke `setPointerCapture`, and turned every tap into "interact". To prevent a repeat:
- Request pointer lock only for `pointerType === "mouse"`.
- Split touch pointers by `pointerId`: first finger on the left 45% moves, others look.
- No `setPointerCapture`; listen for move/up on `window`.
- Release everything on `pointerup`/`pointercancel`, blur, resize, orientation change and hidden visibility. The touch action hold is tied to its `pointerId` and released when the action button disappears.
- Mount only one joystick; overlays must not cover the start button.

## Controls
- Desktop: WASD/arrows, Shift to run, mouse look (click to lock), hold E/Space/left-click to interact, Esc/P to pause.
- Mobile: press and drag on the left to move (push to the edge to run), drag on the right to look, hold the action button.

## Performance
- No shadows, no postprocessing, at most 3 real lights; light pools and beams are additive meshes.
- `low` (DPR 1, no AA, no rain, fewer skyline towers) is the default on touch; `high` (DPR ≤1.5, AA, rain) on desktop. Auto-drops to `low` after 5 s under 40 fps. Override with `?q=low|high`; the choice is remembered.

## Debug
`?debug` shows input, player position, phase, meter and trend, light modes and San's state, and exposes `window.__chase`.

## Verification status
- The chase rules, San's navigation and warnings have only been reviewed statically. No tests, build, type check or browser run were done after those changes; felt difficulty is unverified.
- `tests/delete-seoul-chase.test.mjs` still assumes the old flow (game starting at `approach`) and must be updated before it is run again.
