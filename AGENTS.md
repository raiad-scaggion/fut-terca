# AGENTS.md: Fut de Terça

How to work in this repo. Read it before changing anything. `SPEC.md` says what to build. This file says how. When they disagree, follow `SPEC.md` for scope and point out the conflict.

## Working agreement

- Plan before code. For anything bigger than a small fix, propose the approach first and wait for an OK.
- Work phase by phase (`SPEC.md` §10, with the details of the current phase in its own section). A phase is done when its acceptance test passes. Don't build ahead.
- Ask when the spec leaves a real choice open. When you go ahead on an assumption, say what it is.
- Don't invent scope. New features need the owner's OK, even small ones.
- Keep this file current. Durable decisions go in the decisions log at the bottom.
- Ask before anything destructive or hard to undo: deleting data in Firebase, changing database rules, rewriting git history.

## Rules that matter most

- **Stats are derived, never accumulated.** Season totals come from `baseline` plus match events. Never write a counter like `player.goals += 1`. This is what makes editing a finished match safe.
- **Rules protect the data, not the UI.** Hiding a button from non-admins is convenience. The real check is in `database.rules.json`. Every new write path needs a rule.
- **Never touch `fut-terca/live`.** It belongs to the old app, which may still be in use. This app writes only under `futerca/`.
- **Phone first.** Design for a 360px wide screen, used outdoors, often one-handed. Tap targets are at least 44px. Test every screen at phone width before calling it done.
- **Shared state goes through transactions.** Two admins can tap at the same time on match night. Use `runTransaction` for anything that reads and then writes, like events, the timer or finishing a match.

## Code conventions

- TypeScript everywhere, `strict` on.
- Keep logic pure and testable in `src/lib/` (draw, cup, standings, stats, clock). Components render and call these. If a function decides something, it has a test.
- Firebase access lives in `src/data/`. Components don't import `firebase/*` directly.
- Comments explain why, not what.
- App text is in Brazilian Portuguese. Code, comments, commits and docs are in English.
- Errors and empty states say what happened and what to do: "Nenhuma partida em andamento. Comece uma na Copa."
- Respect `prefers-reduced-motion`. Keep keyboard focus visible.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173, add --host to test on a phone on the same Wi-Fi
npm test             # Vitest, once
npm run test:watch   # Vitest in watch mode
npm run lint
npm run build        # typecheck and production build
```

Deploy: every push to `main` runs the GitHub Actions workflow that publishes to GitHub Pages.

When you add or change a script, update this block in the same commit.

## Git

- The owner works alone here, so commits go straight to `main`. Push after each finished piece of work.
- Small commits with a short imperative subject.
- No AI attribution in commits, pull requests or any text that leaves the machine.

## Firebase

- `database.rules.json` is the copy of record for the database rules. The project has no Firebase CLI deploy, so after changing the file, paste it into the console (Realtime Database → Rules) in the same session, and say so.
- The rules also keep the old app's `fut-terca/live` open. Leave that block alone while the old app is in use.
- Admins live at `futerca/admins/{emailKey}: true`, added by hand in the console (Realtime Database → Data). `emailKey` lowercases the email and swaps every "." for ",".
- Auth uses a Google popup and falls back to a redirect when the browser blocks popups. `raiad-scaggion.github.io` is in the authorized domains.

## Secrets

- The Firebase web config is public and is committed in `src/data/firebaseConfig.ts`.
- Anything else secret (service account keys for the import script, tokens) stays out of the repo. `.env*` files are git-ignored. Keep `.env.example` with placeholder values only.

## Easy to get wrong

- Accumulating stats instead of deriving them.
- Writing outside `futerca/`, or to the old app's `fut-terca/live`.
- Adding a write path without a database rule.
- Using `BrowserRouter`. Deep links break on Pages, so use `HashRouter`.
- Forgetting Vite's `base` for the Pages subpath, which makes assets 404 in production.
- Using `Date.now()` for the match clock. Use the server time offset from `.info/serverTimeOffset`.
- Firebase drops empty arrays and can return arrays as objects. Normalize when reading.

## Decisions log

Newest first. Format: date, decision, one-line reason.

- 2026-10-30: A title goes to the champion team's 4 players and to the keeper who defended that team in the final. The Ranking has a switch to hide keepers, who would otherwise pile up titles.
- 2026-10-30: Players can be deleted only if they appear in no session, with a confirmation step. Anyone who has played can only be deactivated, because sessions point to them.
- 2026-10-30: Ranking uses player cards with one tab per stat instead of a table, by request. Inactive players with numbers stay in, players at zero are left out, and ties share a position. Saves have no tab yet; they show on the player sheet.

- 2026-10-30: Imported rows with an invalid id get the key `p_row_N` and no `legacyId`, so a bad cell doesn't stop the import. Such rows can only match by name on a later import.
- 2026-10-28: Writes are allowed per section under `futerca/` (`$section`), never on `futerca/` itself. In Realtime Database rules a grant on a parent can't be revoked by a child, so a parent grant would let admins edit `admins/`.
- 2026-10-28: The account panel has a "Testar permissão de gravação" button that writes `futerca/meta/writeCheck`. It checks the rules from a real login without touching real data.

- 2026-10-28: The Sheet import is an admin screen in the app that reads the CSV, not a Node script. It uses the admin's login, so there's no service key to manage.
- 2026-10-28: Vite `base` is `/fut-terca/` for builds only, so dev stays on `/`. The deploy workflow runs the tests before building.

- 2026-10-28: Reuse the Firebase project `personal-bc014` under a new root `futerca/`. It's already set up, and the old app's path stays isolated.
- 2026-10-28: Realtime Database instead of Firestore. It has transactions, the server clock offset, and the live match code from the old app already works on it.
- 2026-10-28: Stats derived from events plus an imported baseline. Editing finished matches (group feedback) then needs no special handling.
- 2026-10-28: Goalkeepers are chosen per match, one per side, and get a "save" stat. Group feedback.
- 2026-10-28: Standings update when a match ends, not while it's being played. Clarified with the group.
- 2026-10-28: GitHub Pages from a public repo, with `HashRouter`. Free hosting, and the repo has no secrets.
