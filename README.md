# sanlee.kr

San Lee's portfolio site (Next.js).

## Routes

| Route | Role |
| --- | --- |
| `/` `/about` `/works` `/writing` | Portfolio pages. `/contact` redirects to `/about#contact`. |
| `/deleteseoul` | Published DELETE SEOUL work (3D city). Maintenance only. `/explore` redirects here. |
| `/deleteseoul-lab` | Previous v2 experiment (unlisted). |
| `/deleteseoul-lab/erase` | Reset screen for the v2 experiment only. |
| `/deleteseoul-lab/chase` | Chase prototype currently in development (unlisted). |

## Chase prototype (current work)

Default scope: `src/explore/v3/chase/` and `src/app/deleteseoul-lab/chase/page.tsx`.

| File | Role |
| --- | --- |
| `ChaseGame.tsx` | Screens, HUD, sfx wiring, quality, debug |
| `Scene.tsx` | R3F scene; reads game state only |
| `logic.ts` | Pure game rules and state (`stepGame`), detection tuning |
| `nav.ts` | San's collision radius, node graph, pathfinding, patrol prediction |
| `level.ts` | Map geometry, lights, cover, checkpoints |
| `input.ts` | Keyboard, mouse and touch input for this route only |
| `chase.module.css` | HUD styles |

The chase reuses shared code from `src/explore/` (`sfx.ts`, `parts.tsx`, `textures.ts`, `atmosphere.tsx`, `towerMaterial.ts`). Do not treat `src/explore/` or `src/explore/v2/` as unused code.

Read first: [docs/delete-seoul-chase-first-playable.md](docs/delete-seoul-chase-first-playable.md) and the files above.
Open `docs/legacy/` (published `/deleteseoul` features) or `docs/archive/` (historical v2 notes) only when changing those features or when asked.

## Editing content

- About, works, contact: `src/data/site.ts` (Korean/English pairs)
- Poems: `src/data/poems.ts` (original Korean)
- Statue story and lines: `src/explore/story.ts`
- Work images: put them in `public/works/` and set the path in `image` in `site.ts`

## Run

```bash
npm install
npm run dev
```
