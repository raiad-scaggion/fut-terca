# Design: Fut de Terça

## 1. Direction

The visual direction is "Noite de estádio". Screens sit on near-black turf-tinted surfaces (`#0a0d0c` to `#1a1f1c`) separated by thin 1px lines (`#262c28`). Interface chrome stays quiet so the metallic and award player cards stand out as the only bright objects on the screen.

## 2. Color

All tokens live on `:root` in `src/index.css` with `color-scheme: dark`:

| Token | Value | Job |
|---|---|---|
| `--bg` | `#0a0d0c` | Page background and goal button ink |
| `--surface` | `#131715` | Primary surface for panels, bottom sheets, inputs, live bar and team cards |
| `--surface-2` | `#1a1f1c` | Secondary surface for ghost buttons, active segmented buttons, stat blocks and previews |
| `--border` | `#262c28` | 1px borders, table row dividers, underline tracks and dashed empty states |
| `--text` | `#f3f1ea` | Primary off-white text, active filter labels and goal button background |
| `--muted` | `#8e948f` | Subtitles, table headers, inactive tabs, secondary labels and empty states |
| `--brand` | `#dcc27e` | Gold accent for the brand wordmark, active states, clocks, OVR highlights, focus outlines and primary buttons |
| `--brand-ink` | `#1a1500` | Dark text on `--brand` primary buttons |
| `--danger` | `#e05060` | Live match dot, overtime clock, undo actions, delete buttons and error borders/text |
| `--success` | `#3dd68c` | Write-check confirmation and import success banners |
| `--radius` | `8px` | Standard outer corner radius for panels, sheets and cards |
| `--gutter` | `16px` | Page horizontal padding (`max-width: 720px`) |
| `--tab-bar-height` | `64px` | Fixed bottom tab bar height |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | Bottom safe-area offset for phones |
| `--font-display` | `"Sofia Sans Extra Condensed", "Arial Narrow", sans-serif` | Condensed display font stack |

## 3. Type

Interface copy uses `"Sofia Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` with `line-height: 1.5`:

- `0.65rem` to `0.78rem` (600): player position tags, table headers, OVR preview labels and rating short codes.
- `0.8125rem` (600): bottom tab bar items, match and cup labels, live counts, mark buttons and undo buttons.
- `0.875rem` (400/600): filter chips, search and pick chips, standings cells, event log items, live bar text and form errors.
- `0.9375rem` to `0.95rem`: page subtitles and team card names.

Titles, scores, timers, big stats and player card text use `--font-display` (`Sofia Sans Extra Condensed`):

- `1.1rem` to `1.35rem` (600): baseline section titles (`1.1rem`), match team headings and team OVR (`1.15rem`), import section titles, stepper values, standings points (`1.25rem`, weight 700), live bar score and clock (`1.25rem`), top bar brand and draw section titles (`1.35rem`).
- `1.5rem` to `1.8rem` (600): bottom sheet titles, baseline and import totals (`1.5rem`), cup match scores (`1.6rem`), match clock and minutes stepper (`1.75rem`), OVR form preview (`1.8rem`).
- `2rem` to `5.5rem` (600): ranking card values (`2rem`), page titles (`2.75rem`, `line-height: 1.02`), champion banner team name (`3rem`), live match scoreboard (`4.6rem`) and ranking lead value (`5.5rem`, `line-height: 0.95`).
- Inside the SVG player card (`viewBox="-14 -6 598 930"`): award stamp `30px` (600), position `54px` (500), stats `64px` (700 for values, 400 for labels), player name `80px` (700) and OVR `138px` (600).

## 4. Shape and lines

- Containers, bottom sheets, team cards, form alerts and photo stages use `--radius` (`8px`). Bottom sheets round only the top corners (`8px 8px 0 0`).
- Buttons, inputs, segmented controls, pick chips, inner stat tiles, the live bar and mark buttons use `6px` corners.
- Avatars, color swatches, the live bar dot and the sheet drag handle (`999px`) are circular or fully rounded.
- Surfaces are separated by `1px solid var(--border)` lines on headers, bottom bars, table rows, player lists, cup match rows and panels. Empty states use `1px dashed var(--border)`.
- Panels, cards and buttons have no box shadows. Only floating overlays and artwork use depth: the bottom sheet (`0 -12px 32px rgb(0 0 0 / 0.5)`), the SVG player card (`drop-shadow(0 8px 12px rgb(0 0 0 / 0.5))`) and club crests on dark cards (`drop-shadow(0 0 2px rgb(255 255 255 / 0.7))`).

## 5. Player card

The card (`src/components/PlayerCard.tsx`, `src/components/cardTheme.ts`, `src/components/cardArt.tsx`) is an SVG shield on a `570x910` coordinate grid (`CARD_PATH`) with curved top shoulders and a pointed bottom tip at `(285, 910)`, framed by an inner rule (`scale(.952 .958)`) and a 4px metallic rim gradient.

Layout:
- Upper left column: OVR at `(126, 182)`, position code (`GOL`, `ATA`, `MEI`, `DEF`) at `(126, 234)`, a horizontal rule, the nationality flag (`84x59`) and, when set, a second rule and the club crest (`96x96`).
- Upper right area (`x="170" y="96" width="390" height="390"`): the cutout player photo (`futerca/photos/{playerId}`), or the default shaded bust silhouette (`#fc-bust-on-light` or `#fc-bust-on-dark`) masked with a bottom fade.
- Lower half: uppercase player name centered at `y="556"` (compressed to `textLength="440"` when longer than 13 characters), a horizontal divider, two stat columns separated by a vertical rule (`VEL` and `FIN` on the left, `PAS` and `DEF` on the right), and either the uppercase award stamp (`AWARD · MONTH`) or a short bottom rule.

Seven themes are defined in `CARD_THEMES`:
- **gold** (OVR 75+): warm gold 6-stop metallic gradient (`#fff3c4` to `#a67f2e`), dark brown ink (`#2b1f07`), light tone.
- **silver** (OVR 51-74): cool silver gradient (`#ffffff` to `#7f878f`), charcoal ink (`#191d22`), light tone.
- **bronze** (OVR up to 50): copper gradient (`#f3cfa8` to `#6e4326`), espresso ink (`#23130a`), light tone.
- **craque** (Craque do Mês, most goals + assists): near-black and gold gradient (`#2c2616` to `#050403`), gold ink and glow (`#f3d98a`), dark tone, engraved with 16 concentric circles centered behind the bust (`#fc-engrave-craque`).
- **artilheiro** (Artilheiro, most goals): deep red gradient (`#d8392b` to `#2c040b`), warm cream ink (`#fff0d8`), orange glow (`#ff9a4d`), dark tone, engraved with 13 diagonal speed streaks (`#fc-engrave-artilheiro`).
- **garcom** (Garçom, most assists): emerald gradient (`#16a583` to `#032523`), mint ink (`#e9fff6`) and glow (`#7cf0c8`), dark tone, engraved with 9 sweeping cubic-bezier passing curves (`#fc-engrave-garcom`).
- **paredao** (Paredão, most saves): royal blue gradient (`#4663d8` to `#0b0a38`), ice-blue ink (`#eef1ff`) and glow (`#9db8ff`), dark tone, engraved with an 11-row staggered brick wall pattern (`#fc-engrave-paredao`).

All gradients, diagonal line patterns, sheen overlays, clip paths, bust silhouettes and award engravings are rendered once in a hidden `<CardArtDefs />` SVG at the top of `App` (`src/components/cardArt.tsx`) and referenced via `url(#...)` and `<use href="#..." />`. A screen can render up to 47 cards at once, so sharing one `<defs>` block keeps phones from repainting thousands of duplicate SVG nodes.

## 6. Components

- **Underline tabs** (`.filter-chips`, `.filter-chip`): a horizontal scrolling strip with a `1px solid var(--border)` bottom line and `22px` gaps. Buttons have no background or border (`min-height: 44px`), use `--muted` when inactive, and switch to `--text` with a 2px gold bottom bar (`box-shadow: inset 0 -2px var(--brand)`) when active.
- **Segmented control** (`.segmented`, `.segmented__btn`): equal-width columns (`grid-auto-flow: column; grid-auto-columns: 1fr`) inside a `--surface` box with a 1px border and `6px` radius. The active option switches to `--surface-2` and `--text`.
- **Mark buttons** (`.mark-btn`): 44px-tall buttons inside a 2-column grid under each player in a live or edited match. Default buttons (`+ Assist.`, `+ Defesa`) are transparent with a subtle `#ffffff24` border; `+ Gol` (`.mark-btn--goal`) is inverted with `--text` background and `--bg` ink; `+ Defesa` (`.mark-btn--save`) spans both columns (`grid-column: 1 / -1`).
- **Scoreboard** (`.match__header`, `.match__scoreboard`): full-bleed strip (`margin: 0 calc(-1 * var(--gutter)) 16px`) with a vertical gradient from `--surface-2` to `--surface` and 1px top and bottom borders. A 4-column grid places the two team names around `4.6rem` tabular scores, with the `1.75rem` gold clock (red `.is-over` when time expires) centered below.
- **Home hero** (`.home-hero`): full-bleed strip under the top bar with a turf radial gradient (`#2c4a3a` to `--bg`, the same as the app icon) and a center-circle line at the bottom right. The page title is the state of the night at `4.5rem`, with at most one primary button.
- **Team color bars** (`.cup-dot`, `.match__bar`): 4px-wide vertical bars (`4x15px` in standings and cup rows, `4x18px` in the match scoreboard) painted with the team's chosen hex color. In Sorteio, the team color trigger is a `22x22px` circle expanded to a 44px hit area via a `::after` pseudo-element (`inset: -11px`).

## 7. Rules

- No emojis anywhere in the UI.
- No pill-shaped tabs or filter badges; tabs use bottom underlines and controls use `6px` or `8px` corners.
- `--brand` gold is reserved for active states, key numbers (clocks, lead ranking figure, team OVR), small accents, focus rings and at most one primary action button (`.button--primary`) per view.
- Numeric columns, scores, clocks, ratings and counters use tabular numerals (`font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum"`).
- Every interactive control meets a `44px` minimum tap target (`min-height: 44px` or `44x44px`).
- On the match screen, goalkeepers keep all three event buttons (`+ Gol`, `+ Assist.` and `+ Defesa`), since keepers can also score and assist.
