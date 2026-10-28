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
  players/{playerId}
    name, role: "line" | "keeper", isMonthly, joinDate
    ratings: { speed, finishing, defense, passing }   # 1-99, used by the draw
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
  weekly: { selectedIds[], keeperIds[], mode, manual }   # the draw in progress
```

The central rule: **stats are derived, never accumulated.** A player's season total is `baseline` plus the events of every finished match. Titles are `baseline.titles` plus the sessions where the player's team is the champion. Editing a finished match only means adding or removing events, and every table updates itself. Don't write per-player counters anywhere.

## 4. Security

Database rules:
- `.read`: public for `futerca/`.
- `.write`: only when `auth.token.email_verified == true` and `futerca/admins/{emailKey}` exists.
- `admins/` is writable only from the Firebase console.

The Firebase web config is public by design and is committed. Rules are the only protection, so they ship in the repo as `database.rules.json`, and a change to them is a change to the app.

## 5. Screens

Bottom tab bar, one page each:

1. **Ranking**: season table with goals, assists, saves, titles and OVR. Sortable.
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

A one-time Node script (`scripts/import-sheet.ts`) reads the old data, either from the Apps Script GET endpoint or from a CSV export. It maps it to `players/` with `baseline` totals, merges duplicate names the way the old app did (accent- and case-insensitive), and prints a dry-run diff before writing anything.

## 9. Phases

Each phase ends with its acceptance test. Don't start a phase until the previous one passes.

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

## 10. Feedback from the group

Collected by Raiad. Each item and where it lands:

1. Standings updated after each match (Mose): phase 5.
2. Choosing team colors (Neithan): phase 4.
3. Leaving the scoreboard while the match keeps running (Xana): phase 5, fixed live bar.
4. Editing the score of a finished match (Xana): phase 5, made simple by derived stats.
5. Exporting the night's results with champion and stats (Xana): phase 6.
6. Separate pages instead of one long page (Xana): phase 0.
7. Keepers in the teams, with a save stat (Neithan): phases 3 and 5.
