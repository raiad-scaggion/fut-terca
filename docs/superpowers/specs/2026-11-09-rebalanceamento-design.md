# Rebalanceamento, six stats, Legends and Glossário (version 2.2)

Date: 2026-11-09. Owner approval: given in chat for all four parts.

## Why

The group thinks the player ratings are off and the draw suffers for it. Raiad asked the guys for a "rebalancing": every admin rates every player in private, Raiad works out the averages, the group checks them on WhatsApp, and Raiad publishes them in one go. The same release adds two outfield stats (Drible and Físico), gives keepers their own six stats, moves every stat to a 0 to 100 scale, adds Legends for players who left the group, and adds a Glossário page.

Success: the 12 admins each rate the players on their phones in one sitting, nobody sees anyone else's ratings, and Raiad publishes the new stats with one tap after the group agrees.

Failure even if it works: an admin can see another admin's ratings or the averages; an admin rates their own player; publishing half-writes the stats; an admin loses ratings they typed.

## 1. Stats on a 0 to 100 scale

Outfield players have six stats: VEL Velocidade, FIN Finalização, PAS Passe, DRI Drible, DEF Defesa, FIS Físico.

Keepers have six different stats (descriptions are Raiad's, used as written in the Glossário):
- PAC Ritmo / Velocidade: arranque para sair do gol em bolas enfiadas ou fechar o ângulo do atacante.
- PAS Passe / Chute: precisão dos tiros de meta, lançamentos longos com os pés e reposições de bola.
- SAL Salto / Elasticidade: capacidade de se esticar para alcançar chutes difíceis e bolas nos ângulos.
- MNE Manejo / Confiabilidade: firmeza ao segurar a bola, evitando rebotes perigosos na área.
- POS Posicionamento: posicionar-se em relação à bola e às traves, facilitando a defesa.
- REF Reflexos: velocidade de reação para defesas de puro instinto à queima-roupa.

Every stat is a whole number from 0 to 100 (Raiad's wording: "I would like to be able to write like 83"). The card shows the number as stored.

### Storage and migration (builder's call, recorded here)

Players get a new `stats` object. The old `ratings` object (1 to 10) is left in place and never written again.
- `stats.line`: `{ vel, fin, pas, dri, def, fis }` (outfield set).
- `stats.keeper`: `{ pac, pas, sal, mne, pos, ref }` (keeper set).
- Reading a player without `stats` derives them, so no migration script is needed: outfield VEL/FIN/PAS/DEF = old rating × 10, DRI = FIS = 50; keepers get 99 on all six (Raiad: "the keepers can start with 99 for all the stats, and the outfielders can have 50 for their new two stats").
- Each set derives on its own when missing, so a role switch never loses numbers: a missing keeper set is all 99, a missing outfield set comes from old `ratings` (× 10, DRI and FIS 50). The card, OVR, edit form and rebalancing use the set for the player's current role; the other set is kept untouched.
- Every write (edit form, CSV import, publish) writes `stats`, never `ratings`.

### OVR and the draw

OVR = weighted sum of the role's stats, rounded, capped at 99. Weights (builder may tune, must sum to 1):

| | VEL | FIN | PAS | DRI | DEF | FIS |
|---|---|---|---|---|---|---|
| Ataque | .20 | .35 | .10 | .20 | .00 | .15 |
| Meio | .15 | .15 | .30 | .25 | .05 | .10 |
| Defesa | .15 | .05 | .10 | .05 | .45 | .20 |

Keeper: PAC .05, PAS .05, SAL .25, MNE .20, POS .20, REF .25.

The draw keeps using the same weighted score (`levelScore`), now on the new scale. Card tiers keep their OVR cut-offs (gold ≥ 75, silver ≥ 51).

### Where it shows

- Player card: six stats in three rows of two, like FIFA, for both roles.
- Edit form in Jogadores: six number inputs (0 to 100) for the player's role, replacing the 1 to 10 steppers.
- Change log: `diffPlayer` labels the new keys (VEL, FIN, PAS, DRI, DEF, FIS, and PAC, SAL, MNE, POS, REF for keepers). Old entries with 1 to 10 keys still read correctly.
- CSV import: the sheet's 1 to 10 values become × 10, DRI and FIS 50, keepers 99.

## 2. Legends

- A player gets `legend: true`. "Tornar Legend" is a button in the edit sheet in Jogadores (admin only), with a confirm. "Voltar ao elenco" undoes it. Both go through `writeWithLog` (new actions `player.legend` / `player.unlegend`).
- Legends leave the main Jogadores list ("Todos", "Mensalistas", "Goleiros") and get their own "Legends" filter chip.
- Sorteio: legends can be picked by search, in the slot sheet and the main picker, in their own group after the regular players. They are never added by "Completar com mensalistas".
- Legends are not rated in the Rebalanceamento.
- Their history stays: Ranking, awards and stats still count them.
- Card: a special Legend look (builder's design call, distinct from gold/silver/bronze, white and gold in the spirit of FIFA icons, without copying FIFA artwork or the word "Icon").

## 3. Rebalanceamento

### Who

- Only signed-in admins see the page (`/rebalanceamento`, link in the account menu and on Início while a round is open). Everyone else gets a short message.
- Each admin rates every player who is active and not a Legend, keepers included, **except their own player** (Raiad: "they must be able to rate ALL players BUT them, they can't rate themselves").
- The link from admin to player is a map `futerca/adminPlayers/{emailKey} = playerId`. Today 12 of them are known (Raiad is Xana). An admin with no link can't vote yet and sees a message asking the owner to link them, so nobody can rate themselves by accident. The owner edits the map in the page's owner panel (pick a player for each admin e-mail); this is how the 13th admin gets linked later. The seed for the 12 goes in `C:\dev\personal\sandbox\futerca\admin-players-import.json` (never in the repo, e-mails stay out of it) for Raiad to import at that node.

### Privacy

- An admin sees only their own ratings: not other admins', not the averages, not who has sent (Raiad: "one admin can't see other's ratings. And not even the final average, only their vote").
- Enforced by the database rules, not just the UI: votes at `futerca/rebalance/votes/{emailKey}/{playerId}` are readable and writable only by that admin, and readable by owners.

### Flow for an admin

1. The page shows a counter at the top, "12/38", that counts the players they finished.
2. A grid of the players to rate (cards or rows, with photo and name, split into Linha and Goleiros). Finished ones are marked.
3. Tapping a player opens a sheet with that player's six stats as number inputs, filled with the player's current stats (Raiad's choice: "they can start filled, otherwise it's gonna take way too much time"). "Salvar" saves to the database immediately (no losing work if the phone locks). A player counts as finished once the admin saved them, even with no number changed.
4. When the counter reaches N/N, "Enviar avaliações" appears at the bottom. Sending stamps `futerca/rebalance/sent/{emailKey}` with the server time.
5. Until Raiad publishes, an admin can still open and change any rating, even after sending. Changes after sending are kept; they stay "sent" as long as everything is still finished.
6. If a player is added, made inactive, made a Legend or deleted, the list and counter update live. A sent admin who now has an unrated new player shows as "faltam N" to the owner and sees the counter drop; the button comes back.

### Flow for the owner (Raiad only, `futerca/owners`)

On the same page, below the owner's own voting, an owner panel:
- Progress: each admin by player name, with "enviou", "x/N" or "não começou".
- "Calcular médias": works at any time. For each player, the average of every saved complete rating of that player (all six filled), rounded to a whole number, with the number of votes. Players with no votes keep their current stats and are marked.
- Export: "Copiar texto" puts a WhatsApp-friendly text on the clipboard (one line per player, Linha then Goleiros, e.g. `Xana (MEI) 74: VEL 80 · FIN 72 · PAS 85 · DRI 70 · DEF 55 · FIS 60`), plus share via the phone's share sheet where available.
- "Publicar": confirm, then one multi-path write of every averaged player's `stats` plus one change-log entry (`rebalance.publish`, with the count), the same pattern as `applyImport`. After publishing the round is closed.
- Opening a new round ("Abrir rebalanceamento") clears the old votes and sent marks. The first round is open as soon as the release goes live, with no step from Raiad.

### Data

```
futerca/adminPlayers/{emailKey}: playerId              read: that admin and owners; write: owners
futerca/rebalance/round: { status: "open"|"closed", openedAt, publishedAt? }   read: admins; write: owners
futerca/rebalance/votes/{emailKey}/{playerId}: { <six stat keys>: 0..100, at }  read/write: that admin while the round is not closed (a missing round counts as open); read: owners
futerca/rebalance/sent/{emailKey}: timestamp           read/write: that admin; read: owners
```
Rules also refuse a vote where `playerId` equals the admin's own `adminPlayers` entry, and any stat outside 0 to 100 or not an integer. `$section` must exclude `adminPlayers` and `rebalance`. Votes are not written to the change log (they are private and change no app data); publishing is.

## 4. Glossário

A page at `/glossario`, open to everyone, linked from the account menu and from the "i" tips that list abbreviations. Sections:
- Notas da linha: VEL, FIN, PAS, DRI, DEF, FIS with a one-line meaning.
- Notas do goleiro: PAC, PAS, SAL, MNE, POS, REF with Raiad's descriptions.
- Cartinha: OVR, ATA, MEI, DEF, GOL, Ouro/Prata/Bronze/Legend.
- Ranking: T, G, A, G+A, J, GC, G/N, A/N, T/N, D, D/J, GS, GS/J, SG, FR (taken from `RankingPage.tsx`).

All pt-BR copy goes through the humanizer skill.

## Release

Version 2.2 with a "what's new" sheet. Update SPEC.md (data model, rules, screens) and AGENTS.md (decision log). New rules go in `database.rules.json` for Raiad to paste; the app must work for players and Sorteio before the rules are pasted, and the rebalancing page may show "aguardando regras" until then.

## Non-goals

- No anonymity from the owner: Raiad can read raw votes in the database. The app never shows raw votes to anyone, only averages.
- No weighting of votes, no trimming of outliers (plain average).
- No vote history after a new round opens.
- No change to how goals, assists, awards or the cup work.

## Testing

- Unit: stat derivation from old data, OVR weights, averages (complete votes only, rounding, no-vote players), export text, legend filtering in lists and Sorteio.
- Rules in the emulator: admin reads own votes but not another's; admin can't read averages-relevant paths (`votes` root, `sent` of others); non-admin denied; self-vote denied; out-of-range denied; owner reads all; publish passes the player `logId` rule.
- Full app against the emulator: two admins vote, owner calculates, exports and publishes; cards show the new stats; a player made inactive leaves the counter.
