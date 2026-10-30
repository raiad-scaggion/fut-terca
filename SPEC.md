# SPEC: Fut de Terça

This file is the source of truth for what to build. `AGENTS.md` covers how to build it.

## 1. What it is

A phone-first web app for a weekly friendly football game. 18 people play each Tuesday: 16 outfield players split into 4 teams of 4, plus 2 goalkeepers who play for every team. The app keeps the season stats, draws balanced teams, runs the night's cup and shows the live match on everyone's phone.

It replaces the older app (repo `mateuscassis/landing-bot-restaurante`), which kept the stats in a Google Sheet. Mateus authorized importing that data.

Users:
- Anyone with the link can view everything: ranking, teams, the cup and the live match.
- Admins sign in with Google and can change data: players, the draw, scores and stats.

Non-goals for now:
- The WhatsApp bot from the old repo. GitHub Pages can't run a server.
- Native apps. A PWA covers "install on the home screen".
- Accounts for regular players.

## 2. Stack

- Vite, React 19 and TypeScript.
- React Router with `HashRouter`, because GitHub Pages has no rewrite rules for deep links.
- Firebase Realtime Database for all data, and Firebase Auth with Google sign-in for admins. Free Spark plan.
- Vitest for the pure logic (draw, cup, stats).
- Plain CSS with design tokens on `:root`. Dark theme with gold accent (`#f5c842`), like the old app.
- GitHub Pages, deployed by a GitHub Actions workflow on every push to `main`.

## 3. Data model (Realtime Database)

Everything lives under the root `futerca/`. The old app's path `fut-terca/live` belongs to the old app and must not be touched.

```
futerca/
  admins/{emailKey}: true            # email with "." replaced by ","
  players/{playerId}                 # "p" + Sheet id for imported players, push() keys for new ones
    name, role: "line" | "keeper", isMonthly, joinDate, active, createdAt
    legacyId?                        # the Sheet's numeric id, for re-imports
    linePosition: "ataque" | "meio" | "defesa"
    ratings: { speed, finishing, defense, passing }   # 1-10, used by the draw
    baseline: { goals, assists, saves, titles }       # totals imported from the Sheet
  sessions/{sessionId}               # one Tuesday night
    date, createdAt, status: "draft" | "live" | "finished"
    teams/{teamId}: { name, color, playerIds[] }
    keeperIds[]
    matches/{matchId}
      number, stage: "group" | "semi" | "third" | "final", label?
      homeId, awayId
      keepers: { home: playerId, away: playerId }
      status: "pending" | "live" | "finished"
      timer: { durationSec, running, startedAt, elapsedMs }
      winnerId?                      # only for a tied knockout match (penalties)
      events/{eventId}: { type: "goal" | "assist" | "save", playerId, teamId, at }
    championId?
  live: { sessionId, matchId }       # what every phone shows right now
  weekly: { selectedIds[], keeperIds[], mode: "auto" | "manual", teams[]: { color, playerIds[] } }   # the draw in progress
```

The central rule: **stats are derived, never accumulated.** A player's season total is `baseline` plus the events of every finished match. Titles are `baseline.titles` plus the sessions where the player's team is the champion. The keeper who defended the champion in the final gets the title too. Editing a finished match only means adding or removing events, and every table updates itself. Don't write per-player counters anywhere.

## 4. Security

Database rules:
- `.read`: public for `futerca/`.
- `.write`: only when `auth.token.email_verified == true` and `futerca/admins/{emailKey}` exists.
- `admins/` is writable only from the Firebase console.
- The first admin is Raiad (`raiadscaggion@gmail.com`). He'll add the others later.

The Firebase web config is public by design and is committed. Rules are the only protection, so they ship in the repo as `database.rules.json`, and a change to them is a change to the app.

## 5. Screens

Bottom tab bar, one page each:

1. **Ranking**: three rankings to pick from (Títulos, Gols, Assistências). Each one shows player cards in order, with OVR, position and that number on the card. Players at zero stay out, ties share a position, and a switch shows or hides the keepers.
2. **Jogadores**: player list and cards. Admins can add or edit players and ratings.
3. **Sorteio**: pick the week's 16 outfield players and 2 keepers. Balanced draw or manual teams ("picking sides"). A color picker on each team. Export teams image. Confirm creates the session.
4. **Copa**: round robin, then standings, semis (1st vs 4th, 2nd vs 3rd), 3rd place match and final. Standings update when each match ends. Champion banner and an end-of-day export.
5. **Partida**: the live match.

A fixed bar above the tab bar shows the live score and clock on every page while a match runs. Tapping it opens Partida.

## 6. Live match

- Starting a match asks which keeper defends each side. It preselects the previous match's choice.
- Timer with a chosen length. It uses Firebase's server clock offset, so every phone shows the same time. When time runs out, the phone whistles and vibrates and the clock keeps counting in red.
- Each side lists its 4 players and its keeper with "+ Gol" and "+ Assist.". The keeper also has "+ Defesa".
- The event log is shown with undo.
- A tied knockout match asks who went through.
- Finished matches can be reopened by an admin to fix events.
- The screen stays awake (Wake Lock) while open.

## 7. Exports

Canvas images at 1080x1350 for WhatsApp, shared with `navigator.share` and falling back to a download:
- **Teams**: the 4 teams, keepers, a random caption and a background photo (freely licensed Wikimedia Commons photos with credit lines, carried over from the old app), or a photo from the phone.
- **Night summary**: the champion and its players, every result, and the night's top scorers, assists and saves.

## 8. Import from the Sheet

An admin-only screen imports the CSV exported from the Sheet. It runs in the browser with the admin's own login, so it needs no service key. The CSV stays outside the repo.

The CSV columns are `id, name, goals, assists, championships, speed, finishing, defense, passing, linePosition, role, isMonthly, joinDate`:
- `role` is `linha` or `goleiro`, and maps to `line` or `keeper`.
- `goals`, `assists` and `championships` become `baseline.goals`, `baseline.assists` and `baseline.titles`. `baseline.saves` starts at 0, since the Sheet never tracked saves.
- `isMonthly` is `TRUE` or `FALSE`. `joinDate` may be empty.

The screen parses the file, merges duplicate names (ignoring accents and case), shows a preview, and writes only after the admin confirms.

## 9. Phase 2 in detail: players and import

Phase 2 delivers the Jogadores page and the CSV import. It doesn't include the Ranking page (phase 3) or anything from the draw.

### 9.1 Player model and OVR (`src/lib/players.ts`, pure, tested)

The `Player` type mirrors §3. When reading from Firebase, a `normalizePlayer` function fills defaults: ratings 5, `linePosition` "meio", `role` "line", `isMonthly` false, `joinDate` "", `active` true, baseline values 0. It clamps every rating to the 1 to 10 range.

OVR is copied from the old app, so the numbers the group knows stay the same. Each rating is weighted by role and position:

| Profile | speed | finishing | defense | passing |
|---|---|---|---|---|
| keeper | 0.24 | 0.10 | 0.52 | 0.14 |
| ataque | 0.30 | 0.55 | 0.00 | 0.15 |
| defesa | 0.32 | 0.07 | 0.48 | 0.13 |
| meio | 0.30 | 0.26 | 0.06 | 0.38 |

- `levelScore(player)` is the weighted sum, on a 1 to 10 scale. The draw in phase 4 balances teams on this value.
- `displayOvr(player)` is `min(99, round(levelScore * 10))`. To avoid floating point surprises like 85.4999, round `levelScore * 10` to 6 decimals before the final `Math.round`.
- `displayStat(rating)` is `min(99, rating * 10)`, used for the card's four stats.
- `cardTier(player)` is "gold" from 75, "silver" from 51 to 74, and "bronze" up to 50.
- `positionCode(player)` returns "GOL" for keepers and otherwise "ATA", "MEI" or "DEF".
- `normalizeName(name)` trims, lowercases and strips accents (NFD, then removes combining marks). Duplicate names are detected with it.

Required test cases, all from the real CSV:
- Neto (meio, 7/6/8/8 for speed/finishing/defense/passing) has OVR 72, silver.
- JP Canhoto (defesa, 6/7/8/8) has OVR 73, silver.
- Tier boundaries: 50 is bronze, 51 silver, 74 silver, 75 gold.

### 9.2 CSV import logic (`src/lib/importCsv.ts`, pure, tested)

**Parsing:**
- The parser handles a UTF-8 BOM, CRLF or LF line endings, quoted fields with commas and doubled quotes, and blank lines. Write it by hand (about 40 lines) rather than adding a dependency.
- The header must contain every column listed in §8, in any order. If one is missing, the import stops with a message naming it.

**Mapping each row:**
- `name` is trimmed. A row with an empty name is skipped and reported.
- `id` becomes `legacyId`. The Firebase key is `p` + id, as in `p69`. Numeric keys would make Realtime Database return an array, so the prefix is required.
- The four ratings are numbers clamped to 1 to 10. Non-numbers fall back to 5 and are reported as warnings.
- `goals`, `assists` and `championships` become `baseline.goals`, `baseline.assists` and `baseline.titles`. Non-numbers become 0 with a warning, and `baseline.saves` is 0.
- `role` maps "goleiro" to "keeper" and anything else to "line". `linePosition` must be "ataque", "meio" or "defesa", otherwise it falls back to "meio" with a warning.
- `isMonthly` is true only for "TRUE" or "true". `joinDate` must match YYYY-MM-DD, otherwise it's "".

**Duplicate names in the file (same `normalizeName`):** merge them the way the old app did and report each merge.
- Baseline values are summed and ratings take the highest value.
- The player is a keeper if either row is, and a mensalista if either row is.
- The earliest non-empty `joinDate` wins, and so does the first row's id.

**Planning against what's already in the database:** `planImport(rows, existingPlayers)` matches each row to an existing player by `legacyId` first, then by `normalizeName`, and returns:
- `create`: rows with no match.
- `update`: matched rows whose name, role, position, ratings, mensalista flag, join date or baseline differ. The update overwrites those fields.
- `unchanged`: matched rows with no differences.
- Plus the warnings and the totals of the file: players, keepers, mensalistas, and the sums of goals, assists and titles.

The import never deletes or deactivates anyone, and never touches `active` or `createdAt` on existing players. Running it twice in a row must give 0 creates and 0 updates.

### 9.3 Data access (`src/data/players.ts`)

- `usePlayers()` subscribes to `futerca/players` and returns `{ players, loading, error }`. The list is normalized and sorted by name, using pt-BR collation.
- `savePlayer(player)`: creates with `push()` when there's no id, otherwise updates. New players get `createdAt: serverTimestamp()` and `active: true`.
- `setPlayerActive(id, active)`.
- `applyImport(plan)` writes all creates and updates in a single multi-path `update()`, so a failure leaves nothing half-written.

`deletePlayer(id)` exists only for players who appear in no session. Sessions and match events point to players, so anyone who has played can only be deactivated, which hides them from the draw.

### 9.4 Jogadores page (`/jogadores`)

For everyone:
- A search field (accent- and case-insensitive) and filter chips: Todos, Mensalistas, Goleiros, Inativos. Inactive players show only under Inativos.
- A grid of cards, 2 columns at 360px and more on wider screens. Each card follows the old app's style: tier colors (gold, silver, bronze), OVR and position code at the top, initials in a circle, the name, and the four stats VEL, PAS, FIN and DEF (`displayStat`). A small "Mensalista" badge shows when it applies.
- Tapping a card opens a bottom sheet with the full card and the baseline totals: Gols, Assistências, Títulos and Defesas (the last for keepers only). Label it "Totais até a importação". Phase 3 will replace this with the derived totals.

For admins only:
- A "+ Jogador" button at the top.
- An "Editar" button in the sheet.
- An "Importar planilha" link to `/jogadores/importar`.

**Edit form** (the same form for new players):
- Fields: name (required), Linha/Goleiro toggle, position (Defesa, Meio, Ataque; hidden for keepers), the four ratings (a 1 to 10 stepper each, with a live OVR preview and tier), Mensalista switch, join date, and Ativo switch (edit only).
- Saving a name that matches another player by `normalizeName` is blocked with "Já existe um jogador com esse nome."
- Baseline totals don't appear in the form. They only change through the import.

### 9.5 Import screen (`/jogadores/importar`)

- Non-admins see "Só admins podem importar." and a link back.
- A file picker that accepts `.csv`. After choosing a file, the screen shows:
  - The file totals: jogadores, goleiros, mensalistas, gols, assistências, títulos.
  - The plan: N novos, N atualizados, N sem mudança, with the names under each group (collapsed).
  - Warnings and merges, if any.
- An "Importar" button writes the plan, then shows "Importação concluída" with a link to Jogadores. It's disabled while writing and when there's nothing to create or update.
- Any error message says what failed and what to do. For example: "A coluna 'finishing' não está no arquivo. Exporte a aba players da planilha de novo."

### 9.6 Phase 2 acceptance

Using `C:\dev\personal\sandbox\futerca\Fut Terça - players.csv`. Never commit this file:

1. `npm test` passes and covers §9.1 and §9.2: OVR cases, tiers, parsing edge cases, mapping, merge and the second-import case.
2. The preview shows 48 jogadores, 2 goleiros (Baguete and Xester), 20 mensalistas, 496 gols, 305 assistências and 76 títulos, with 48 novos on the first run.
3. After importing, `futerca/players` has 48 entries keyed `p<id>`, and the Jogadores page shows 48 cards. Neto shows 72 and silver.
4. Importing the same file again shows 0 novos, 0 atualizados and 48 sem mudança.
5. An admin can add a player, edit them, and deactivate them. The player then shows only under Inativos.
6. Logged out, or logged in as a non-admin: no edit or import controls are visible, and the import route shows the admin message.
7. `npm run lint` and `npm run build` pass, and every screen works at 360px wide.

## 10. Phases

Each phase ends with its acceptance test. Don't start a phase until the previous one passes. Phases 0 to 4 are done. Phase 2 is detailed in §9.

| # | Phase | Acceptance |
|---|-------|------------|
| 0 | Skeleton: routes, tab bar, theme, Vitest, Pages deploy | The Pages URL loads on a phone and every tab opens |
| 1 | Firebase and auth: config, rules, Google login, admin check | A non-admin can read but every write fails. An admin can write |
| 2 | Players and import | The imported players and totals match the Sheet |
| 3 | Derived stats and Ranking | Unit tests cover baseline plus events. Ranking shows correct totals |
| 4 | Sorteio | The draw balances by OVR, manual mode works, colors persist, confirm creates a session |
| 5 | Copa and live match | The full night flow works on two phones: keepers, saves, playoffs, editing a finished match, the fixed live bar |
| 6 | Exports | Both images share to WhatsApp from a phone |
| 7 | Polish and cutover | PWA install works and a real Tuesday runs on the new app |

## 11. Feedback from the group

Collected by Raiad. Each item and where it lands:

1. Standings updated after each match (Mose): phase 5.
2. Choosing team colors (Neithan): phase 4.
3. Leaving the scoreboard while the match keeps running (Xana): phase 5, fixed live bar.
4. Editing the score of a finished match (Xana): phase 5, made simple by derived stats.
5. Exporting the night's results with champion and stats (Xana): phase 6.
6. Separate pages instead of one long page (Xana): phase 0.
7. Keepers in the teams, with a save stat (Neithan): phases 3 and 5.
