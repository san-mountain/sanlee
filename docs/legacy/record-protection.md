# Bell and record protection (`/deleteseoul`)

> **Legacy.** Feature of the published `/deleteseoul` work. Does not apply directly to the chase prototype (`/deleteseoul-lab/chase`).

A small bell in the bunker (`[-5, 0, -9]`) that briefly stops citizen activity records. Uses the city bell-tower geometry; does not overlap San's old wander path. Above-ground bell, surveillance, lasers, endings, poems and diary are unchanged.

## Rules
- PC: E or click near the bell. Mobile: tap it or use the action button.
- `recordProtection.ts`: protection 8,000 ms, cooldown 20,000 ms counted from activation (about 12 s after protection ends). Pressing again does not extend either.
- A final action is protected if `start <= action time < end`. Protection is not reserved when a panel opens.
- Timing uses the monotonic clock `performance.timeOrigin + performance.now()`, not frames; time passes in settings and other tabs.
- Only the bunker device activates protection. `sfx.gong()` alone does not.
- Start: bell, green status and remaining time. End: short tone and an explicit "off" state. Muted audio behaves the same.

## Data
| Data | Storage |
| --- | --- |
| Game progress | Existing keys such as `sanlee-visited`. Progress is still saved during protection. |
| Resume/backup | `sanlee-backup` format unchanged; no protection state or activity added. |
| Citizen activity | `sanlee-citizen-records-v1`, schema 1. `pending` = offline bunker records, `synced` = records sent to the in-world centre. |
| Protection state | In-memory only. Usage, protected actions and gaps are never stored. |

Nothing is sent to a server; "sync" moves `pending` to `synced` on entering the city, without duplicates. Citizen records are never rebuilt from progress or backups, so protected actions cannot reappear.

Actions currently recorded through `recordCitizenActivity` (checked in `ExploreClient.tsx`):
- `terminal.open` — opening a terminal that passed the lock check
- `face.authenticate` — Puzzle A final choice (with `requireProtection` when protection was intended)
- `audit.extract` — Puzzle B original cassette ejected

New actions should call the same interface at their final execution point; progress saving stays on a separate path.

`forgetCityRecords()` clears city records, the citizen-record key, its cache and protection memory, and keeps language/sound/control settings. `wipeBackup()` is unchanged.

## Debug
`/deleteseoul?debug` adds (`fx=off` is only a quality comparison option):

```js
__neo.recordProtection.snapshot()
__neo.citizenRecords.read()
__neo.citizenRecords.commit("manual-final-action")
```

The last call simulates a final action and returns `recorded`, `protected`, `unregistered` or `full` without changing progress.

Manual check order (only when changing this feature): open a terminal outside protection → strike the bell (no extension on a second press) → open another terminal within 8 s (progress saved, no record) → run the test action after protection ends (recorded) → go up normally (only unprotected records sync) → reload (no protected records) → footer deletion (records and memory cleared, settings kept).

Related tests: `tests/*.test.mjs`, optional browser check `tests/bell-protection.browser.cjs` (`BELL_TEST_BASE_URL`, `CHROMIUM_PATH`). These were the original verification for this feature, not a required step for other work.

## Limits
- Protection and cooldown live in page memory and reset on reload. Not server authority or anti-cheat.
- Single-tab only; multi-tab consistency needs further design.
- Capacity 512 records in total. When full, new records return `full`; old records are not dropped.
- If storage is blocked or full, it keeps working in memory without persistence.
- Real mobile audio policy and heat/frame rate need device checks.
