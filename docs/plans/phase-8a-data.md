# Phase 8A: data and logic

Read `AGENTS.md`, then `SPEC.md` §13. Follow this plan exactly. Where it gives a name or signature, use it as written.

## Rules for this batch

- Do not run `git commit`, `git push` or any git command that changes history or the index. Leave all changes in the working tree.
- Do not change anything in Firebase. Do not run a script that writes to the database.
- Do not add npm dependencies.
- Do not change `database.rules.json`, `src/index.css`, `src/match.css`, `src/components/PlayerCard.tsx`, `src/components/RankingCard.tsx` or `src/pages/PartidaPage.tsx`. They are being redesigned separately.
- Never mention an AI, a model or an assistant in code, comments or docs.
- App text is pt-BR. Code and comments are English. Match the surrounding style. Comments explain why, and only when needed.
- Add no CSS. Reuse existing class names. The new look comes later.

## Step 1: clubs and countries

Create `src/lib/clubs.ts`:

```ts
export type Club = { id: string; name: string; file: string };
export const CLUBS: Club[]; // sorted by name, pt-BR
export function getClub(id: string): Club | undefined;
export function crestUrl(club: Club): string; // `${import.meta.env.BASE_URL}crests/${club.file}`
```

The ids and files are the files in `public/crests/` (ignore `CREDITS.md`). Use these display names: athletico Athletico-PR, atletico-mg Atlético-MG, bahia Bahia, botafogo Botafogo, bragantino Bragantino, chapecoense Chapecoense, corinthians Corinthians, coritiba Coritiba, cruzeiro Cruzeiro, flamengo Flamengo, fluminense Fluminense, gremio Grêmio, internacional Internacional, mirassol Mirassol, palmeiras Palmeiras, remo Remo, santos Santos, sao-paulo São Paulo, vasco Vasco, vitoria Vitória.

Create `src/lib/countries.ts`:

```ts
export type Country = { code: string; name: string };
export const DEFAULT_COUNTRY = "br";
export const COUNTRIES: Country[]; // Brasil first, then the rest sorted by name
export function flagUrl(code: string): string; // `${import.meta.env.BASE_URL}flags/${code}.svg`, falling back to br for an unknown code
```

Codes and names: br Brasil, ar Argentina, uy Uruguai, py Paraguai, cl Chile, co Colômbia, pt Portugal, es Espanha, fr França, it Itália, de Alemanha, us Estados Unidos.

## Step 2: player fields

In `src/lib/players.ts`, add to `Player`: `nationality: string` and `club: string`. In `normalizePlayer`, read them: `nationality` lowercased when it is a known code from `COUNTRIES`, otherwise `DEFAULT_COUNTRY`; `club` when `getClub` finds it, otherwise `""`. Add tests in `src/lib/players.test.ts`.

In `src/data/players.ts`, add both to `PlayerInput` as required fields and write them in both branches of `savePlayer`. `applyImport` must not touch them.

In `src/pages/JogadoresPage.tsx`, add both to the draft type and its two builders (new player: `DEFAULT_COUNTRY` and `""`), pass them to `savePlayer`, and add two `<select>` fields to the edit form, labelled "Nacionalidade" and "Time do coração". The club select has a first option "Nenhum" with value `""`. Follow the markup of the nearby form fields. Fix any test fixture type that now needs the new fields.

## Step 3: games and period helpers in `src/lib/stats.ts`

Change:

```ts
export type PlayerStats = PlayerBaseline & { games: number };
export type RankingKey = keyof PlayerBaseline | "contributions";
```

`computeStats` returns `games` too, starting at 0. For each finished match, add 1 to every player of the home and away team (from `session.teams`) and to `match.keepers?.home` and `match.keepers?.away`. Use a `Set` per match so nobody counts twice.

`buildRanking(players, stats, key: RankingKey)`: for `"contributions"` the value is goals + assists. Everything else stays the same. Also export:

```ts
export function zeroBaselines(players: Player[]): Player[];                 // same players, baseline all 0
export function monthOf(date: string): string;                              // "2026-11-03" -> "2026-11"
export function sessionsInMonth(sessions: Session[], month: string): Session[];
export function listMonths(sessions: Session[], today: string): string[];   // the months with sessions plus the month of today, newest first, no repeats
export function previousMonth(month: string): string;                       // "2027-01" -> "2026-12"
export function monthLabel(month: string): string;                          // "2026-11" -> "novembro de 2026"
export function perGame(value: number, games: number): number;              // 0 when games is 0
export function formatAverage(value: number): string;                       // 0.6667 -> "0,67", always two decimals
```

`monthLabel` must parse the parts by hand so no time zone can shift it.

## Step 4: monthly awards in a new `src/lib/awards.ts`

```ts
export type AwardKey = "craque" | "artilheiro" | "garcom" | "paredao";
export const AWARD_ORDER: AwardKey[] = ["craque", "artilheiro", "garcom", "paredao"];
export const AWARD_LABELS: Record<AwardKey, string> = { craque: "Craque do Mês", artilheiro: "Artilheiro", garcom: "Garçom", paredao: "Paredão" };
export type MonthlyAwards = { month: string } & Record<AwardKey, string[]>;

export function getMonthlyAwards(players: Player[], sessions: Session[], month: string): MonthlyAwards;
export function getCurrentAwards(players: Player[], sessions: Session[], today: string): MonthlyAwards; // awards of the month before today's month
export function getPlayerAward(awards: MonthlyAwards, playerId: string): AwardKey | null;              // first match in AWARD_ORDER
```

`getMonthlyAwards` uses `computeStats(zeroBaselines(players), sessionsInMonth(sessions, month))`. Winners are every player tied on the highest value of: goals + assists (craque), goals (artilheiro), assists (garcom), saves (paredao). When the highest value is 0, the list is empty.

Tests in `src/lib/awards.test.ts`: a clear winner of each award; a tie gives two winners; zero gives nobody; matches of another month don't count; a match that isn't finished doesn't count; the baseline doesn't count; a double winner gets the first award in `AWARD_ORDER`; `getCurrentAwards` in January reads December of the year before.

Add tests in `src/lib/stats.test.ts` for: games of a player and of a keeper, a keeper only counted when they defended, `contributions` ranking, `listMonths`, `previousMonth`, `monthLabel`, `perGame` with 0 games, and `formatAverage`.

## Step 5: Ranking page logic

In `src/pages/RankingPage.tsx`:

- Tabs, in this order: Gols, Assistências, G+A (singular "participação", plural "participações"), Defesas (singular "defesa", plural "defesas"), Títulos. Default tab: Gols. `key` becomes `RankingKey`.
- Add `const [scope, setScope] = useState<"season" | "month">("season")` with a `segmented` control labelled "Temporada" and "Mês", using the markup of the `segmented` control in `SorteioPage.tsx`.
- When scope is month, show a `<select>` with `listMonths(sessions, today)` using `monthLabel`, and default to today's month. `today` is `new Date().toLocaleDateString("en-CA")`.
- Season stats: `computeStats(players, sessions)`, as now. Month stats: `computeStats(zeroBaselines(players), sessionsInMonth(sessions, month))`.
- Page subtitle: "Os melhores da temporada", or "Os melhores de {monthLabel}" in month scope.
- Empty state in month scope: "Ninguém tem {plural} em {monthLabel}."
- Keep the "Mostrar goleiros" switch.

## Step 6: player sheet

In `src/pages/JogadoresPage.tsx`, the player sheet shows season numbers through `selectedStats`. Add, in the same block and with the same markup, "Jogos" and three averages labelled "Gols/jogo", "Assist./jogo" and "Defesas/jogo". Compute them from `computeStats(zeroBaselines([selectedPlayer]), sessions)` with `perGame` and `formatAverage`, since the Sheet has no games and season totals include it. When the player has 0 games, show "-" for the averages.

## Done means

Run `npm test`, `npm run lint` and `npm run build`. All must pass with no new warnings. Then reply with the list of files changed, the test count, and anything in this plan you could not follow and why. Do not improvise around a problem. Report it.
