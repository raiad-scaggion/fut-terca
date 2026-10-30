# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A group of about 48 friends who play football together, with 18 on the pitch on any Tuesday: 16 outfield players in 4 teams and 2 keepers who play for every team. Admins run the night from a phone at the pitch, one-handed, outdoors, at night under floodlights and on mobile data. Everyone else follows the live match, checks the table and sends images to the WhatsApp group.

## Product Purpose

Fut de Terça keeps the group's season stats, draws balanced teams, runs the night's cup and puts the live match on every phone. It replaces a slow spreadsheet and a first version of the app. Success is a Tuesday that runs entirely on the app, and players who care about their numbers and their card.

## Positioning

This is the group's own game turned into a real competition. Every player has a card, an overall and a place in the ranking, and the app is the only record of who actually won, scored and assisted.

## Operating Context

The night's ritual: pick who plays, draw the teams, send the image to WhatsApp, play the round robin, then semis, 3rd place match and final, then send the night's summary. Screens are used between and during matches, often while standing on the sideline.

## Capabilities and Constraints

- Free to run: GitHub Pages and Firebase Spark, with no paid services. Firebase Storage is not available on Spark.
- Anyone can read. Only admins, signed in with Google, can write.
- Stats are derived from match events plus a baseline from the old spreadsheet, never accumulated.
- App text is in Brazilian Portuguese.
- Group terms: Ranking, Jogadores, Sorteio, Copa, Partida, mensalista, Gol de ouro, mata-mata, fase de grupos, confronto direto.

## Brand Commitments

- Name: Fut de Terça.
- Player cards must be almost identical to FIFA Ultimate Team cards, because that look has real meaning for the participants: overall, position, flag, club crest, photo cut out on the card, name, stats. The app uses 4 stats (VEL, PAS, FIN, DEF) instead of 6.
- Each player has a nationality and a favorite club, mostly Brazilian clubs. Cards use the real crests of the Série A clubs and the real Brazilian flag, by the owner's decision: the app is a non-commercial friends app.
- Players without a photo show a grey "John Doe" placeholder.
- Monthly special cards for the previous month's player of the month, top scorer, top assist player and top keeper, each with its own design.

## Evidence on Hand

- 47 real players with ratings and season totals in Firebase.
- Example card: `C:\dev\personal\sandbox\futerca\fifa-player-card-example.jpg`, outside the repo.
- Player photos don't exist yet. Raiad plans to take them on a coming Tuesday.
- Freely licensed background photos in `public/backgrounds/`.

## Product Principles

- The card is the prize. Everything that makes a card feel earned is worth the effort.
- The night comes first. Nothing fancy may slow down marking a goal.
- Numbers are always true, and fixing a mistake is easy.
- Adding a player or a photo must take seconds, on a phone, with no editing skill.

## Accessibility & Inclusion

Used outdoors at night and one-handed: large tap targets, high contrast, and support for reduced motion.
