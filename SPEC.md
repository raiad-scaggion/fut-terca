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
  owners/{emailKey}: true            # who can read the change log and run the rebalanceamento
  adminPlayers/{emailKey}: playerId  # which player each admin is, so they don't rate themselves
  log/{pushId}: { by, name, uid, at, action, playerId?, sessionId?, matchId?, eventType?, changes?, count? }
  players/{playerId}                 # "p" + Sheet id for imported players, push() keys for new ones
    name, role: "line" | "keeper", isMonthly, joinDate, active, createdAt   # role = usual position
    legacyId?                        # the Sheet's numeric id, for re-imports
    linePosition: "ataque" | "meio" | "defesa"
    stats: { line: { vel, fin, pas, dri, def, fis }, keeper: { pac, pas, sal, mne, pos, ref } }   # 0-100
    ratings?: { speed, finishing, defense, passing }  # before 2.2, 1-10; read only when stats is missing
    legend?: true                    # out of the lists, the monthly fill and the rebalanceamento
    baseline: { goals, assists, saves, titles }       # totals imported from the Sheet
  sessions/{sessionId}               # one Tuesday night
    date, createdAt, status: "draft" | "live" | "finished"
    teams/{teamId}: { name, color, playerIds[] }
    keeperIds[]                      # who keeps goal tonight, whatever their role
    matches/{matchId}
      number, stage: "group" | "semi" | "third" | "final", label?
      homeId, awayId
      keepers: { home: playerId, away: playerId }
      status: "pending" | "live" | "finished"
      timer: { durationSec, running, startedAt, elapsedMs }
      events/{eventId}: { type: "goal" | "assist" | "save" | "ownGoal" | "howler", playerId, teamId, at }   # teamId = the player's own side
    championId?
  live: { sessionId, matchId }       # what every phone shows right now
  weekly: { selectedIds[], keeperIds[], mode: "auto" | "manual", teams[]: { color, playerIds[] } }   # the draw in progress
  rebalance/
    round: { status: "open" | "closed", openedAt, publishedAt? }
    votes/{emailKey}/{playerId}: { <six stats of the player's role>, at }
    sent/{emailKey}: timestamp       # the admin tapped "Enviar avaliações"
```

The central rule: **stats are derived, never accumulated.** A player's season total is `baseline` plus the events of every finished match. Titles are `baseline.titles` plus the sessions where the player's team is the champion. The keeper who defended the champion in the final gets the title too. Editing a finished match only means adding or removing events, and every table updates itself. Don't write per-player counters anywhere.

## 4. Security

Database rules:
- `.read`: public for every section of `futerca/` except `admins`, so nobody can list the admins' e-mails. A signed-in person can read only their own entry there.
- `.write`: only when `auth.token.email_verified == true` and `futerca/admins/{emailKey}` exists.
- `admins/` and `owners/` are writable only from the Firebase console.
- `log/` is append-only: an admin can add an entry signed with their own e-mail and uid at the server's time, and nobody can edit or delete one. Only owners can read it.
- Player writes and new match events must carry a `logId` that points to a log entry created in the same write, so a change can't skip the log. Deletes can't be forced this way, so deleting a player or undoing an event is logged by the app but not enforced by the rules.
- `admins/` is readable only by owners. The app reads a person's own entry to know whether they are an admin.
- `adminPlayers/`: owners read and write the whole map. An admin reads only their own entry.
- `rebalance/votes/{emailKey}` and `rebalance/sent/{emailKey}`: readable only by that admin and the owners. An admin writes votes only while the round isn't closed, never for their own player, with integers from 0 to 100. `rebalance/round` is readable by admins and writable by owners. Under the old rules all of this would be public, so the app probes `rebalance/probe` and keeps voting closed until the probe is denied.
- Admin e-mails never go in this public repo. They are added in the Firebase console.

The Firebase web config is public by design and is committed. Rules are the only protection, so they ship in the repo as `database.rules.json`, and a change to them is a change to the app.

## 5. Screens

Bottom tab bar, one page each:

0. **Início**: the landing screen. The top changes with the moment: countdown to Tuesday, cup in progress or live score. Below it, last month's special cards (or the season's leaders when there are none) and the last champion.
1. **Ranking**: three rankings to pick from (Títulos, Gols, Assistências). Each one shows player cards in order, with OVR, position and that number on the card. Players at zero stay out, ties share a position, and a switch shows or hides the keepers.
2. **Jogadores**: player list and cards. Admins can add or edit players and ratings.
3. **Sorteio**: pick the week's 16 outfield players and 2 keepers. Anyone can play out of their usual role for the night: "+ Outro jogador no gol" and "+ Goleiro na linha" open a list of the other role, and the chip gets a "no gol" or "na linha" tag. The draw rates them with the weights of the slot they play. Balanced draw or manual teams ("picking sides"). A color picker on each team. Export teams image. Confirm creates the session.
4. **Copa**: round robin, then standings, semis (1st vs 4th, 2nd vs 3rd), 3rd place match and final. Standings update when each match ends. Teams level on points are separated by confronto direto, then victories, goal difference and goals scored. Champion banner and an end-of-day export.
5. **Partida**: the live match. It has no tab of its own: it opens from Início, the Copa or the live bar.

Help sits behind a tap-to-open "i" (`components/InfoTip.tsx`), since phones never show a `title`. There is one on Jogadores (OVR, card colors and special cards), next to Início's special cards, on the Copa standings (points and tiebreak), above the Ranking table (column legend) and on Partida for whoever marks the match (own goal and howler).

On entry, a "Novidades do app" sheet lists what changed in the release. It shows once per version: `VERSION` in `components/WhatsNew.tsx` sets the localStorage key, so each release bumps it and rewrites `NEWS`.

A fixed bar above the tab bar shows the live score and clock on every page but Início, which already leads with them, while a match runs. Tapping it opens Partida.

## 6. Live match

- Starting a match asks which keeper defends each side. It preselects the previous match's choice.
- Timer with a chosen length. A started match opens with the clock stopped, and an admin starts it on the whistle. It uses Firebase's server clock offset, so every phone shows the same time. When time runs out, the phone whistles and vibrates and the clock keeps counting in red.
- Each side lists its 4 players and its keeper with "+ Gol" and "+ Assist.". The keeper also has "+ Defesa" and "+ Frango".
- "Gol contra" under each side opens that side's players and keeper. The own goal counts for the other side and is the player's own stat, apart from their goals.
- "Frango" marks a goal the keeper should have saved. It's marked next to the goal or own goal and doesn't change the score.
- The event log is shown with undo.
- There are no penalties. A tied semi or 3rd place match goes to the team that finished higher in the group stage.
- The final can't end tied. If it's level when time runs out, it goes on with "Gol de ouro": the first goal wins, and an admin then ends the match.
- An admin can fix a finished match in place: its events change while it stays finished, and "Concluir correção" re-syncs the cup. Pending knockout matches follow the new result. Rounds already started keep their matchups, and the screen says so. A fixed final changes the champion.
- The screen stays awake (Wake Lock) while open.

## 7. Exports

Canvas images at 1080x1350 for WhatsApp. Exporting opens a preview with "Trocar fundo", "Foto do celular" and "Compartilhar", which uses `navigator.share` and falls back to a download. Anyone can export, since it writes nothing:
- **Teams**: the 4 teams, keepers, a random caption and a background photo (freely licensed Wikimedia Commons photos with credit lines, carried over from the old app), or a photo from the phone. Available once the teams are complete.
- **Night summary**: the champion, its players and the keeper of the final, every result, and the goals, assists and saves of every player of the night, best numbers first. Available once the cup has a champion.

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

Each phase ends with its acceptance test. Don't start a phase until the previous one passes. Phases 0 to 6 and the build of phase 8 are done. Phase 7 waits for a real Tuesday. Phase 2 is detailed in §9.

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
| 8 | Premium look, FIFA cards, photos, monthly awards | See §13 |

## 11. Cutover checklist

Before the first real Tuesday on this app:

1. Add the other admins at `futerca/admins`, so the night doesn't depend on one phone.
2. If the Sheet changed after the import of 2026-10-28, export the CSV again and import it. Leave out the night of 2026-11-03: it's already in the app, and it would count twice. From this night on, stats live here and the Sheet stops being updated.
3. Tap "Limpar" in Sorteio to clear test picks.
4. Share the link and the install steps from the README with the group.

After that night: if it went well, the old app can be retired. Removing the `fut-terca/live` block from the rules is a separate decision, made only once nobody uses the old app.

## 12. Feedback from the group

Collected by Raiad. Each item and where it lands:

1. Standings updated after each match (Mose): phase 5.
2. Choosing team colors (Neithan): phase 4.
3. Leaving the scoreboard while the match keeps running (Xana): phase 5, fixed live bar.
4. Editing the score of a finished match (Xana): phase 5, made simple by derived stats.
5. Exporting the night's results with champion and stats (Xana): phase 6.
6. Separate pages instead of one long page (Xana): phase 0.
7. Keepers in the teams, with a save stat (Neithan): phases 3 and 5.

## 13. Phase 8: premium look, cards and monthly awards

Direction: "Noite de estádio", premium version. The approved reference is `C:\dev\personal\sandbox\futerca\board\ui-board.png`, outside the repo.

### 13.1 Player fields

- `nationality`: lowercase ISO code, default `br`. `club`: a club id from `src/lib/clubs.ts`, or empty.
- Photos live at `futerca/photos/{playerId}`, apart from `players`, so the player list stays light.

### 13.2 Stats

- A game is a finished match. Outfield players count the finished matches of their team. A keeper counts the matches they defended.
- The Sheet has no games, so games and averages use only matches played in the app. Season totals still include the baseline.
- A night counts when the player took part in at least one finished match of that session. Goals, assists and titles are averaged per night, since a player has many short games in a night and a per-game number would always look tiny. A keeper's saves and goals conceded are averaged per game in goal.
- Keepers can score and assist, so the match screen keeps giving them the same buttons as everyone, plus the save.
- Own goals and howlers ("frangos") only exist in the app, like games. An own goal never takes a goal away from the player.

### 13.3 Ranking

- Temporada or Mês, with a month picker when Mês is on.
- Tabs: Gols, Assistências, G+A, Defesas, Títulos and Tabela.
- The month view counts only that month, with no baseline.
- Tabela shows every number in one table, with a Linha or Goleiros switch. The name column stays fixed while the numbers scroll sideways, and tapping a header sorts by that column (highest first, "-" last). A note under it says which columns include the Sheet, and a legend spells out each abbreviation.
  - Linha: usual outfield players plus anyone who played outfield in the app. T, G, A, G+A (with the Sheet), J (outfield games), GC, G/N, A/N, T/N.
  - Goleiros: usual keepers plus anyone who kept goal in the app, so a player can be in both. J (games in goal), D (with the Sheet for usual keepers), D/J, GS (the other side's score), GS/J, SG (games without conceding), FR, GC (own goals while in goal), T (titles won in goal, plus the Sheet's titles for usual keepers), T/N (per night in goal).

### 13.4 Monthly awards

The awards of a month come from the matches of that month and show on the cards during the next month.

| Award | Criterion | Card |
|---|---|---|
| Craque do Mês | most goals + assists | black and gold, concentric lines |
| Artilheiro | most goals | red, speed streaks |
| Garçom | most assists | green, passing curves |
| Paredão | most saves | blue, brick wall |

Ties all win. Nobody wins with zero. A player who wins more than one shows the highest card, in the order above. A special card never changes the overall.

## 14. Version 2.2: stats, Legends and Rebalanceamento

Design: `docs/superpowers/specs/2026-11-09-rebalanceamento-design.md`.

### 14.1 Stats

- Six stats on a 0 to 100 scale. Outfield: VEL, FIN, PAS, DRI, DEF, FIS. Keepers: PAC, PAS, SAL, MNE, POS, REF. Labels and hints live in `LINE_STATS` and `KEEPER_STATS` in `src/lib/players.ts`.
- Old ratings convert × 10. Drible and Físico start at 50. Keeper stats start at 99 until someone sets them.
- OVR is the weighted average of the role's six stats, capped at 99. Weights per position are `LINE_WEIGHTS` and `KEEPER_WEIGHTS`, shown in the Glossário.

### 14.2 Legends

- An admin can make a player a Legend from Jogadores. Legends get their own card, leave the default lists, are never added by "Completar com mensalistas" and are left out of the rebalanceamento. Their numbers stay in the Ranking. In Sorteio they show only when searched by name.

### 14.3 Rebalanceamento (`/rebalanceamento`)

- Admins only. Each admin rates every active, non-Legend player except their own (`adminPlayers`). The sheet starts from the current stats and shows the OVR the admin's numbers would give.
- Nobody sees anyone else's votes or any average. The admin sees a counter and which players are still missing, then taps "Enviar avaliações".
- The owner panel lists each admin with their progress and linked player, and links a player to an e-mail. "Calcular médias" averages each stat over the votes received (rounded), shows the vote count per player, and exports the result as WhatsApp text and as an image.
- Publicar writes every averaged player's stats, the log entry and the closed round in one write. Players with no votes keep their stats. "Abrir rebalanceamento" clears votes and `sent` and opens a new round.
- The home screen shows a banner to an admin who hasn't sent yet while a round is open.

### 14.4 Glossário (`/glossario`)

- Every abbreviation in the app: stats, positions, OVR weights, card colors, special cards, Legend, Rebalanceamento and the Ranking table columns. Linked from the account menu, the home screen and the "i" tips.
