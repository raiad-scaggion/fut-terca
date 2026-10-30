# Phase 8C: load pages on demand and document the design

Read `AGENTS.md` first.

## Rules for this batch

- Only edit `src/App.tsx`, and create `DESIGN.md` at the repo root. Touch nothing else.
- Do not run `git commit` or stage anything. Do not write to Firebase. Do not add dependencies.
- Never mention an AI, a model or an assistant anywhere.
- Other files may change while you work. Leave them alone.

## Step 1: load pages on demand in `src/App.tsx`

Use `React.lazy` with dynamic imports for `ImportarJogadoresPage`, `JogadoresPage`, `SorteioPage`, `CopaPage` and `PartidaPage`. The pages are named exports, so map them: `lazy(() => import("./pages/CopaPage").then((module) => ({ default: module.CopaPage })))`. Keep `RankingPage` as a normal import, because it is the landing page.

Wrap `<Routes>` in `<Suspense fallback={<EmptyState>Carregando...</EmptyState>}>`, importing `EmptyState` from `./components/Page`. Do not change routes, `LiveBar`, `TabBar` or `CardArtDefs`.

## Step 2: write `DESIGN.md`

Read `src/index.css`, `src/match.css`, `src/photo.css`, `src/components/cardArt.tsx`, `src/components/cardTheme.ts` and `SPEC.md` §13. Describe only what the code really contains. Use plain, direct English, sentence-case headings, no em dashes, no emojis. Sections:

1. **Direction**: "Noite de estádio". Near-black surfaces, thin lines, and the player card as the only bright thing on a screen.
2. **Color**: every token in `:root` with its value and its job.
3. **Type**: Sofia Sans for interface text, Sofia Sans Extra Condensed for titles, scores, timers and card text, with sizes in use.
4. **Shape and lines**: corner radii, 1px separators, no shadows on panels.
5. **Player card**: silhouette, layout, the seven themes and their engravings, and why all art is shared in one SVG block.
6. **Components**: underline tabs, segmented control, mark buttons, scoreboard, team color bars.
7. **Rules**: no emoji, no pills, gold only for active state, small accents and one primary button per screen, tabular numbers in data, 44px tap targets, keepers keep Gol, Assist. and Defesa.

## Done means

Run `npm test`, `npm run lint` and `npm run build`. All must pass with no new warnings. Reply with the files changed and anything you could not follow. Do not improvise around a problem. Report it.
