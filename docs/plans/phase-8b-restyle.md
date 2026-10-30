# Phase 8B: restyle the remaining screens

Read `AGENTS.md` first. This batch changes how the app looks and never what it does.

The tokens in `:root` of `src/index.css`, the fonts and the player card are already done. Do not change them. Use `var(--...)` tokens instead of raw colors, except team colors, which come from data.

## Rules for this batch

- Only edit `src/index.css`, `src/match.css`, `src/components/TabBar.tsx`, `src/components/LiveBar.tsx`, `src/components/TeamCard.tsx`, `src/components/Page.tsx`, `src/pages/PartidaPage.tsx` and `src/pages/CopaPage.tsx`.
- Do not touch `src/pages/JogadoresPage.tsx`, `src/pages/RankingPage.tsx` (their CSS classes may change, their files may not), `src/data/`, `src/lib/`, `src/exports/`, `src/components/PlayerCard.tsx`, `cardArt.tsx`, `cardTheme.ts` or `RankingCard.tsx`.
- In TSX, change only markup and class names. Do not change state, handlers, props, effects, conditions or text, except where a step below says so.
- Keep every existing feature and every `aria-label`. Tap targets stay at least 44px tall.
- Do not run `git commit` or stage anything. Do not write to Firebase. Do not add dependencies.
- Never mention an AI, a model or an assistant anywhere.

## Design language

Premium means restraint: flat near-black surfaces, thin 1px lines, little color. Follow these everywhere:

- Corners: 6px on buttons and inputs, 8px on panels. Replace every `border-radius: 999px` with 6px, except color swatches, dots and the sheet handle.
- Separate things with a 1px `var(--border)` line or one step of surface. Remove `box-shadow` from panels. The sheet may keep its shadow.
- `var(--brand)` is for the active state and small accents only, never for large fills, except the single primary button of a screen.
- Display type: `font-family: var(--font-display)`, weight 600. Use it for page titles, section titles, scores, timers and table points. Never use uppercase tracking on body text.
- All numbers in tables, scores and timers use `font-feature-settings: "tnum"`.
- No emoji anywhere in the interface.

## Step 1: page header (`index.css`, `Page.tsx` if needed)

Page title: display font, 2.75rem, line height 1.02, no extra margin below beyond 4px. Subtitle: `var(--muted)`, 0.9375rem.

## Step 2: tab bar (`TabBar.tsx`, `index.css`)

Remove the `icon` field and the emoji. Each tab is its label only, 0.8125rem, weight 600, `var(--muted)`, and `var(--brand)` when active, centered in its 44px or taller target. Background `var(--bg)` at 95% with `border-top: 1px solid var(--border)`.

## Step 3: filter tabs (`.filter-chips`, `.filter-chip` in `index.css`)

Turn them into underline tabs: one row that never wraps and scrolls sideways with a hidden scrollbar, `border-bottom: 1px solid var(--border)`, gap 22px. Each item has no background and no border, `var(--muted)`, weight 600, min height 44px. Active item: `var(--text)` with `box-shadow: inset 0 -2px var(--brand)`.

## Step 4: segmented, switch and inputs

`.segmented`: one panel with `var(--surface)`, 1px border, 6px corners, no gap, and equal buttons with no border. Active button: `var(--surface-2)`, `var(--text)`, and no gold fill. `.switch-row`: no panel, just the label and the control with a bottom line. Add `margin-bottom: 12px` so it never touches its neighbors. Inputs and selects: `var(--surface)`, 1px border, 6px corners.

## Step 5: Copa (`CopaPage.tsx`, `match.css`)

- Standings as flat rows: no zebra, 1px bottom lines, numbers centered, muted, points in `var(--text)` weight 700.
- Replace the round `.cup-dot` with a 4x15px bar, square corners.
- `.cup-match`: no card background, 1px bottom line, 10px vertical padding. `.cup-match__label` is muted 0.8125rem weight 600, with no uppercase. Score in display font, 1.6rem.
- `.cup-match__line`: three columns, `1fr 70px 1fr`, the last one right-aligned.
- Champion banner: a thin 1px border in `var(--border)`, not the team color; keep the name in the team color, in display font, 3rem.

## Step 6: match screen (`PartidaPage.tsx`, `match.css`)

- Scoreboard: full-width panel, `linear-gradient(var(--surface-2), var(--surface))`, top and bottom 1px lines, no rounded corners. Match label muted on the left, timer on the right in display font, 1.75rem, `var(--brand)`. Below, one row: team name with its 4x18px color bar, the home score, the away score, team name. Scores in display font, 4.6rem, line height 1.
- Replace the emoji counters in `PlayerRow` with plain text: `{goals} G`, `{assists} A`, `{saves} D`, muted, 0.8125rem. Keep their `aria-label`s.
- `.mark-btn`: 1px border `#ffffff24`, no background, 6px corners, weight 600, 0.8125rem, min height 44px. The goal button is the filled one: add a `mark-btn--goal` class in the markup, with `var(--text)` background and `var(--bg)` text. `.mark-btn--save`: same as the plain button.
- Button text: keep "+ Gol", "+ Assist." and "+ Defesa". Keepers keep all three buttons. This matters: do not remove any.
- Players sit in two columns as today, with 1px bottom lines and no card around each player.
- The golden goal banner keeps its role with 1px `var(--brand)` border, no fill and `var(--brand)` text.
- Timer overtime stays `var(--danger)`.

## Step 7: Sorteio (`TeamCard.tsx`, `index.css`)

- `.pick-chip`: `var(--surface)`, 1px border, 6px corners. Selected: `var(--surface-2)` with `border-color: var(--brand)`.
- Team cards: `var(--surface)`, 1px border, 8px corners, a 3px top line in the team color with square corners (put it on an inner element or use `box-shadow: inset 0 3px <color>` so it doesn't clash with the rounded corners).
- `.draw-counter`: plain muted text, `var(--brand)` when full, no pill.

## Step 8: everything else

Apply the language to the live bar, delete dialog, import screen, sheet and baseline stats, in CSS only. Fix the two rules the checker reports: `border-top: 4px solid` on a rounded card in `index.css` and in `match.css`, using the inset shadow from step 7.

Delete CSS rules that no longer match anything. Do not delete rules for classes you can't confirm are unused.

## Done means

Run `npm test`, `npm run lint` and `npm run build`. All must pass with no new warnings. Reply with the files changed and anything you could not follow, and why. Do not improvise around a problem. Report it.
