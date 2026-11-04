# DELETE SEOUL — Chase First Playable

Scope: experimental route `/deleteseoul-lab/chase` only. Do not alter the public `/deleteseoul` route.

## Player loop
1. Restore two fuse terminals in a short 2087 Seoul alley.
2. The second repair reveals San to Da Jabi and triggers surveillance.
3. Sprint and hide behind crates to break the scanner's line of sight.
4. Reach the subway gate control, activate it, and stay nearby for 1.9 seconds.
5. Escape beyond the gate to finish. Being detected restarts from the chase checkpoint, retaining repaired fuses.

## Controls
Desktop: WASD, Shift to run, mouse to look, E to interact, Esc to release pointer lock.
Mobile: existing joystick, swipe look, action button.

## Implementation boundaries
- New isolated scene and chase state machine under `src/explore/v3/`.
- The existing public route, legacy city, and v2 lab are untouched.
- Minimal procedural geometry and DPR capped at 1.35 for M1/mobile testing.
- This is a chase prototype, not the complete 10–15 minute story or its endings.

## Playtest criteria
- First objective understood without additional explanation.
- Clear scanner/cover feedback; no unavoidable detection.
- San's movement visibly conveys a companion who waits when the player falls behind.
- Failure restart is quick and does not wipe repairs.
- Smooth performance on M1 MacBook Air and a mobile device.

## Known limitations
- Companion is a lightweight scripted mannequin, not an animated character.
- Scanner uses a sweeping lane and crate occlusion, not a full navmesh/AI.
- No audio pass or final story ending yet.
- Live Vercel browser and device testing are required before treating the prototype as verified.
