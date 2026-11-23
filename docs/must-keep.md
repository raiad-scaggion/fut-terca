# What a rebuild must keep

Everything Fut de Terça does today, as of version 2.4 (commit `54eaa66`, 2026-11-17). A rebuild is done when every item here still works. `SPEC.md` has the detail behind most items. Where the two differ, this list follows the code.

## Hard rules

- Stats are derived, never accumulated. A season total is `baseline` plus the events of every finished match. Titles are `baseline.titles` plus the nights the player's team won, and the keeper of the final gets the title too.
- All data lives under `futerca/` in Firebase Realtime Database. Never touch the old app's `fut-terca/live`, and keep its rules block open.
- Anyone can read. Only admins with a verified Google e-mail listed at `futerca/admins/{emailKey}` can write. `database.rules.json` is the real protection, and every write path has a rule.
- Anything that reads and then writes shared state (events, timer, finishing a match) uses `runTransaction`, since two admins can tap at the same time.
- The match clock uses the server time offset, not `Date.now()`.
- Firebase drops empty arrays and can return arrays as objects, so the app normalizes on read.
- Free to run: GitHub Pages plus Firebase Spark. No Firebase Storage and no paid service.
- Phone first: 360px wide, tap targets of at least 44px, high contrast, `prefers-reduced-motion` respected, visible keyboard focus.
- App text in Brazilian Portuguese, code and docs in English. Errors and empty states say what happened and what to do.

## Platform

- Vite, React 19, TypeScript in strict mode, plain CSS with tokens on `:root`, Vitest.
- `HashRouter`, because Pages has no rewrites. Vite `base` is `/fut-terca/` in production.
- Every push to `main` deploys to Pages through GitHub Actions.
- Installable PWA with its own manifest and icon. Firebase sits in its own chunk, so a deploy doesn't make phones download it again.
- Google sign-in by popup, falling back to a redirect when the browser blocks popups.
- Fonts Sofia Sans and Sofia Sans Extra Condensed. Real Série A crests (Ferroviária included), real flags and freely licensed background photos in `public/`.

## Roles and security

- Admins are added by hand in the Firebase console. The `admins` list is readable only by owners. A signed-in person can read only their own entry.
- Owners (`futerca/owners`) can read the change log and run the Rebalanceamento.
- `adminPlayers` links each admin's e-mail to their player, so nobody rates themselves.
- The change log is append-only. Each entry carries the admin's e-mail, uid and server time. Player writes and new match events must carry a `logId` pointing to a log entry written in the same update. Only owners read the log.
- Rebalanceamento votes are private to their author and the owners. Votes are integers from 0 to 100, accepted only while the round is open and never for the voter's own player.
- Admin e-mails never go in the repo.

## Screens

Bottom tab bar, one page per tab. A fixed live bar above the tab bar shows the score and clock of the running match on every page except Início, and opens Partida.

### Início (`/`)

- The top changes with the moment: countdown to Tuesday at 20:15 down to the second, the cup in progress, or the live score.
- Last month's special cards, or the season leaders when there are none, and the last champion.
- A banner for any admin who hasn't sent their Rebalanceamento votes while a round is open.
- Links to the Glossário.

### Ranking (`/ranking`)

- Temporada or Mês, with a month picker. The month view counts only that month, with no baseline.
- Tabs: Gols, Assistências, G+A, Defesas, Títulos and Tabela. Card tabs show player cards in order, with OVR, position and the number. Players at zero stay out, ties share a position, and a switch shows or hides keepers.
- Tabela has Linha and Goleiros views, a fixed name column, sideways scrolling, sorting by tapping a header (highest first, "-" last), a note on which columns include the Sheet, and a legend.
  - Linha: T, G, A, G+A (with the Sheet), J, GC, G/N, A/N, T/N.
  - Goleiros: J, D, D/J, GS, GS/J, SG, FR, GC, T, T/N. A player can appear in both views.
- Goals, assists and titles are averaged per night. Saves and goals conceded are averaged per game in goal.

### Jogadores (`/jogadores`)

- Search that ignores accents and case. Filters: Todos, Mensalistas, Goleiros, Inativos. Inactive players show only under Inativos.
- A grid of FIFA Ultimate Team style cards: OVR, position code, flag, club crest, cut-out photo or the grey "John Doe" placeholder, name, stats, and gold, silver or bronze by OVR (gold from 75, silver from 51).
- Special cards: Craque do Mês, Artilheiro, Garçom, Paredão, and the Legend card in white marble and gold.
- A bottom sheet with the full card and the derived totals.
- Admins can add, edit, deactivate and delete players. Delete works only for players who never played a match. Names are unique, ignoring accents and case ("Já existe um jogador com esse nome.").
- Player fields: name, usual role (line or keeper), position (ataque, meio, defesa), six stats from 0 to 100, mensalista, join date, active, nationality (ISO code, default `br`), club, Legend.
- Photos: the admin picks a phone photo, MediaPipe cuts the person out in the browser, and the result is saved as WebP at `futerca/photos/{playerId}`, apart from the player record.

### Import (`/jogadores/importar`)

- Admin only. Imports the CSV exported from the old Sheet, in the browser with the admin's login.
- A hand-written parser handles a BOM, CRLF or LF, quoted fields and blank lines. A missing column stops the import with a message naming it.
- Duplicate names are merged (baseline summed, highest rating kept). Rows match existing players by `legacyId`, then by name.
- The screen previews totals and the plan (novos, atualizados, sem mudança) with warnings, then writes everything in one multi-path update. Importing the same file twice gives 0 creates and 0 updates. The import never deletes or deactivates anyone.

### Sorteio (`/sorteio`)

- Pick the week's 16 outfield players and 2 keepers. "Completar com mensalistas" fills the list and skips Legends. Legends appear only when searched by name.
- Anyone can play out of their usual role for the night ("+ Outro jogador no gol", "+ Goleiro na linha"), tagged "no gol" or "na linha", and the draw rates them for the slot they play.
- Balanced draw by OVR, or manual teams. A color picker per team. The draw in progress is shared at `futerca/weekly`. "Limpar" clears it.
- Export the teams image. Confirm creates the night's session.

### Copa (`/copa`)

- Round robin among the 4 teams, then semis (1st vs 4th, 2nd vs 3rd), 3rd place match and final. Standings update when each match ends.
- Tiebreaks: points, then confronto direto, victories, goal difference and goals scored.
- No penalties. A tied semi or 3rd place match goes to the team placed higher in the group stage.
- A night picker opens any past night, kept in the URL as `?noite=<sessionId>`.
- An admin can fix a finished match in place. "Concluir correção" re-syncs the cup: pending knockout matches follow the new result, rounds already started keep their matchups (the screen says so), and a fixed final changes the champion.
- Champion banner and the night summary export.

### Partida (`/partida`, `/partida/:sessionId/:matchId`)

- No tab of its own. Opens from Início, the Copa or the live bar.
- Starting a match asks which keeper defends each side, preselecting the previous match's choice.
- A timer with a chosen length. It opens stopped and an admin starts it on the whistle. Every phone shows the same time. When time runs out, the phone whistles and vibrates, and the clock keeps counting in red.
- Each side lists its 4 players and keeper with "+ Gol" and "+ Assist.". Keepers also get "+ Defesa" and "+ Frango".
- "Gol contra" under each side: counts for the other side and goes to the player's own-goal stat, not against their goals.
- "Frango" marks a goal the keeper should have saved and doesn't change the score.
- Event log with undo.
- The final can't end tied: it goes to "Gol de ouro", and an admin ends the match after the first goal.
- Wake Lock keeps the screen on.

### Rebalanceamento (`/rebalanceamento`)

- Admins rate every active, non-Legend player except their own. The sheet starts from current stats, shows the OVR the admin's numbers would give, and lists what each abbreviation means at the top.
- Nobody sees other votes or averages. The admin sees a counter and who is still missing, then taps "Enviar avaliações".
- The owner panel shows each admin's progress and linked player (including who has voted), links players to e-mails, and "Calcular médias" averages each stat, shows the vote count, and exports the result as WhatsApp text and as an image.
- Publicar writes the averaged stats, the log entry and the closed round in one update. Players with no votes keep their stats. "Abrir rebalanceamento" clears the votes and opens a new round.

### Histórico (`/historico`)

- The change log, grouped by day, readable only by owners.

### Glossário (`/glossario`)

- Every abbreviation in the app: stats, positions, OVR, card colors, special cards, Legend, Rebalanceamento and the Ranking table columns. Linked from the account menu, Início and the "i" tips.

## Rules of the game and the numbers

- OVR is the plain average of the role's six stats, capped at 99. Outfield stats: VEL, FIN, PAS, DRI, DEF, FIS. Keeper stats: PAC, PAS, SAL, MNE, POS, REF.
- Old 1 to 10 ratings convert × 10. Drible and Físico start at 50. Keeper stats start at 99 until someone sets them.
- A game is a finished match. Outfield players count their team's finished matches. Keepers count the matches they defended. A night counts when the player took part in at least one finished match that night.
- Games, averages, own goals and howlers use only matches played in the app. Season totals still include the Sheet's baseline.
- Monthly awards come from that month's matches and show during the next month: Craque do Mês (most G+A), Artilheiro (goals), Garçom (assists), Paredão (saves). Ties all win, nobody wins with zero, a player with several awards shows the highest one in that order, and a special card never changes the OVR.

## Exports

- Canvas images at 1080x1350 for WhatsApp. The preview has "Trocar fundo", "Foto do celular" and "Compartilhar", which uses `navigator.share` and falls back to a download. Anyone can export.
- Teams image: the 4 teams, keepers, a random caption and a background photo with its credit line, or a phone photo.
- Night summary: champion, its players and the keeper of the final, every result, and each player's goals, assists and saves, best numbers first.
- Rebalanceamento result image and WhatsApp text.

## Help and release notes

- Tap-to-open "i" tips (phones have no hover) on Jogadores, next to Início's special cards, on the Copa standings, above the Ranking table and on Partida.
- "Novidades do app" opens once per version. `VERSION` in `WhatsNew.tsx` sets the localStorage key, and each release rewrites the list.

## Data that must survive

- 47 real players with stats, baselines, photos, nationalities and clubs.
- Every session from 2026-11-03 on, with teams, matches and events.
- The change log, the admin, owner and `adminPlayers` maps, and any Rebalanceamento round.
- A rebuild keeps the shape of `futerca/` described in `SPEC.md` §3, or ships a migration that the owner approves first.

## Tests

- 177 Vitest tests across 16 files in `src/lib/`, all passing on 2026-11-23. They cover the draw, cup, standings, stats, clock, awards, countdown, CSV import, players, photo fit, Rebalanceamento, weekly draw, home screen, change log and night summary. A rebuild keeps or replaces each of them.
