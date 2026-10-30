import { cardTier, displayOvr, positionCode, type CardTier, type Player } from "../lib/players";
import { displayFont, fitText, font, GOLD, HEIGHT, renderImage, roundRect, WIDTH } from "./canvas";

export type TeamsImageData = {
  teams: { name: string; color: string; players: Player[] }[];
  keepers: Player[];
  day: string;
};

const CAPTIONS = [
  "Escalação aprovada pelo VAR",
  "Sorteio 100% honesto (confia)",
  "Quem perder paga a cerveja",
  "Reclamação só depois do primeiro gol",
  "Hoje tem caneta, chapéu e resenha",
  "Nenhum time foi ajudado. Talvez um",
  "Joga bonito ou joga no gol",
];

const TIER_COLORS: Record<CardTier, string> = { gold: GOLD, silver: "#c9d1de", bronze: "#cd8a4f" };

const MARGIN = 48;
const GAP = 32;
const CARDS_TOP = 200;
const CARD_HEIGHT = 430;
const CARD_WIDTH = (WIDTH - MARGIN * 2 - GAP) / 2;
const BAND_HEIGHT = 96;

function teamOvr(players: Player[]): number {
  return Math.round(players.reduce((sum, player) => sum + displayOvr(player), 0) / Math.max(1, players.length));
}

function drawTeamCard(ctx: CanvasRenderingContext2D, team: TeamsImageData["teams"][number], x: number, y: number) {
  roundRect(ctx, x, y, CARD_WIDTH, CARD_HEIGHT, 28);
  ctx.fillStyle = "rgba(10, 12, 20, 0.84)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = team.color;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, x, y, CARD_WIDTH, CARD_HEIGHT, 28);
  ctx.clip();
  ctx.fillStyle = team.color;
  ctx.fillRect(x, y, CARD_WIDTH, BAND_HEIGHT);
  ctx.restore();

  ctx.fillStyle = "#111111";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = displayFont(700, 68);
  ctx.fillText(team.name.toUpperCase(), x + 28, y + BAND_HEIGHT / 2 + 2);
  ctx.textAlign = "right";
  ctx.font = font(700, 28);
  ctx.fillText(`OVR ${teamOvr(team.players)}`, x + CARD_WIDTH - 28, y + BAND_HEIGHT / 2 + 2);

  const rowHeight = (CARD_HEIGHT - BAND_HEIGHT - 24) / 4;
  team.players.forEach((player, index) => {
    const rowY = y + BAND_HEIGHT + 12 + rowHeight * index + rowHeight / 2;

    roundRect(ctx, x + 24, rowY - 26, 72, 52, 12);
    ctx.fillStyle = TIER_COLORS[cardTier(player)];
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.font = displayFont(700, 42);
    ctx.textAlign = "center";
    ctx.fillText(String(displayOvr(player)), x + 60, rowY + 2);

    ctx.fillStyle = "#f2f4fa";
    ctx.font = font(700, 34);
    ctx.textAlign = "left";
    ctx.fillText(fitText(ctx, player.name, CARD_WIDTH - 220), x + 116, rowY + 2);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = font(600, 24);
    ctx.textAlign = "right";
    ctx.fillText(positionCode(player), x + CARD_WIDTH - 28, rowY + 2);
  });
}

export function renderTeamsImage(data: TeamsImageData, photo: File | null): Promise<Blob | null> {
  const caption = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];

  return renderImage(`Times da semana · ${data.day}`, photo, (ctx) => {
    data.teams.forEach((team, index) => {
      const x = MARGIN + (index % 2) * (CARD_WIDTH + GAP);
      const y = CARDS_TOP + Math.floor(index / 2) * (CARD_HEIGHT + GAP);
      drawTeamCard(ctx, team, x, y);
    });

    const footerY = CARDS_TOP + CARD_HEIGHT * 2 + GAP;
    ctx.textAlign = "center";
    if (data.keepers.length) {
      ctx.fillStyle = "#ffffff";
      ctx.font = font(700, 34);
      ctx.fillText(`Goleiros: ${data.keepers.map((player) => player.name).join(" e ")}`, WIDTH / 2, footerY + 50);
    }

    ctx.fillStyle = GOLD;
    ctx.font = displayFont(700, 60);
    ctx.fillText(fitText(ctx, `"${caption}"`, WIDTH - MARGIN * 2), WIDTH / 2, HEIGHT - 84);
  });
}
