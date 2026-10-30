# Fut de Terça

The app for our Tuesday football game. It keeps the season stats, draws balanced teams, runs the night's cup and puts the live match on everyone's phone.

Every Tuesday 18 people play: 16 outfield players in 4 teams of 4, and 2 goalkeepers who play for every team. The night is a small cup. Everyone plays everyone, then come the semis (1st vs 4th, 2nd vs 3rd), the 3rd place match and the final.

## What it does

- **Ranking**: goals, assists, goals + assists, saves and titles, for the season or for one month.
- **Jogadores**: FIFA-style cards with ratings, flag, club crest and a photo, whose background is removed on the phone. Each month, the previous month's Craque, Artilheiro, Garçom and Paredão get a special card.
- **Sorteio**: pick who's playing, then let the app balance the teams or build them by hand. Choose the team colors and send the teams to WhatsApp as an image.
- **Copa**: group stage table, playoffs and the champion.
- **Partida**: timer, score, and goals, assists and saves marked per player. Every phone shows the same match live.
- At the end of the night, an image with the champion and the night's stats.

Anyone with the link can follow along. Only admins, who sign in with Google, can change anything.

## Installing on the phone

Open https://raiad-scaggion.github.io/fut-terca/ and add it to the home screen. On Android, use Chrome's menu and "Instalar app" or "Adicionar à tela inicial". On iPhone, use Safari's share button and "Adicionar à Tela de Início".

## Stack

Vite, React and TypeScript, Firebase Realtime Database and Auth (free plan), Vitest, hosted on GitHub Pages.

## Running locally

Requires Node 20 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev -- --host  # also reachable from a phone on the same Wi-Fi
npm test
npm run build
```

## Deploy

Every push to `main` publishes the site to GitHub Pages through GitHub Actions.

## Docs

- [`SPEC.md`](./SPEC.md): what we're building, the data model and the phases.
- [`AGENTS.md`](./AGENTS.md): how we work in this repo and the decisions made so far.

## Credits

The background photos in the exported images come from Wikimedia Commons under free licenses, and each image prints its author's credit. The full list lives in `public/backgrounds/CREDITS.md`.

Club crests belong to their clubs and are used in this non-commercial friends' app. Sources are in `public/crests/CREDITS.md`, and flags in `public/flags/CREDITS.md`.

## History

This app replaces the first version, made by Mateus (`mateuscassis/landing-bot-restaurante`), whose Google Sheet has held the stats until now. The season stats come from that Sheet, with his permission.
