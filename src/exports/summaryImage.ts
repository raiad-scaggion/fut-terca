import type { NightPlayer, NightResult, NightSummary, ResultSide } from "../lib/nightSummary";
import { displayFont, fitText, font, GOLD, renderImage, roundRect, WIDTH } from "./canvas";

const MARGIN = 40;
const PANEL_WIDTH = WIDTH - MARGIN * 2;
const COLUMN_GAP = 40;
const COLUMN_WIDTH = (PANEL_WIDTH - 56 - COLUMN_GAP) / 2;
const LOSER_COLOR = "rgba(255,255,255,0.6)";

function drawPanel(ctx: CanvasRenderingContext2D, y: number, height: number, border?: string) {
  roundRect(ctx, MARGIN, y, PANEL_WIDTH, height, 24);
  ctx.fillStyle = "rgba(10, 12, 20, 0.86)";
  ctx.fill();
  if (border) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = border;
    ctx.stroke();
  }
}

function drawSectionTitle(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = GOLD;
  ctx.font = font(800, 26);
  ctx.textAlign = "left";
  ctx.fillText(text.toUpperCase(), x, y);
}

function drawChampion(ctx: CanvasRenderingContext2D, champion: NightSummary["champion"], y: number) {
  drawPanel(ctx, y, 196, champion.color);
  const center = WIDTH / 2;
  const names = champion.players.join(", ");

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = font(800, 26);
  ctx.fillText("CAMPEÃO DA NOITE", center, y + 34);
  ctx.fillStyle = champion.color;
  ctx.font = displayFont(700, 86);
  ctx.fillText(champion.name.toUpperCase(), center, y + 90);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(700, 30);
  ctx.fillText(fitText(ctx, names, PANEL_WIDTH - 48), center, y + 138);
  if (champion.keeper) {
    ctx.fillStyle = LOSER_COLOR;
    ctx.font = font(600, 26);
    ctx.fillText(`Goleiro: ${champion.keeper}`, center, y + 172);
  }
}

function drawSide(ctx: CanvasRenderingContext2D, side: ResultSide, x: number, y: number, align: CanvasTextAlign) {
  const direction = align === "left" ? 1 : -1;
  ctx.beginPath();
  ctx.arc(x + direction * 9, y, 9, 0, Math.PI * 2);
  ctx.fillStyle = side.color;
  ctx.fill();

  ctx.fillStyle = side.winner ? "#ffffff" : LOSER_COLOR;
  ctx.font = font(side.winner ? 800 : 600, 28);
  ctx.textAlign = align;
  ctx.fillText(side.name, x + direction * 26, y);
}

function drawResult(ctx: CanvasRenderingContext2D, result: NightResult, x: number, y: number) {
  const center = x + COLUMN_WIDTH / 2;
  drawSide(ctx, result.home, x, y, "left");
  drawSide(ctx, result.away, x + COLUMN_WIDTH, y, "right");

  ctx.fillStyle = "#ffffff";
  ctx.font = displayFont(700, 40);
  ctx.textAlign = "center";
  ctx.fillText(`${result.home.goals} x ${result.away.goals}`, center, y);
}

function drawResults(ctx: CanvasRenderingContext2D, results: NightResult[], y: number) {
  const left = MARGIN + 28;
  const right = left + COLUMN_WIDTH + COLUMN_GAP;
  drawPanel(ctx, y, 372);

  drawSectionTitle(ctx, "Fase de grupos", left, y + 34);
  results
    .filter((result) => result.stage === "group")
    .forEach((result, index) => drawResult(ctx, result, left, y + 88 + index * 52));

  drawSectionTitle(ctx, "Mata-mata", right, y + 34);
  results
    .filter((result) => result.stage !== "group")
    .forEach((result, index) => {
      const rowY = y + 74 + index * 75;
      ctx.fillStyle = LOSER_COLOR;
      ctx.font = font(600, 22);
      ctx.textAlign = "left";
      ctx.fillText(result.decidedByTable ? `${result.label} · pela classificação` : result.label, right, rowY);
      drawResult(ctx, result, right, rowY + 33);
    });
}

function drawPlayerColumn(ctx: CanvasRenderingContext2D, players: NightPlayer[], x: number, y: number) {
  const numberX = (index: number) => x + COLUMN_WIDTH - 104 + index * 52;

  ctx.fillStyle = LOSER_COLOR;
  ctx.font = font(700, 24);
  ctx.textAlign = "center";
  ["G", "A", "D"].forEach((label, index) => ctx.fillText(label, numberX(index), y));

  players.forEach((player, row) => {
    const rowY = y + 44 + row * 42;
    ctx.fillStyle = "#ffffff";
    ctx.font = font(600, 28);
    ctx.textAlign = "left";
    ctx.fillText(fitText(ctx, player.name, COLUMN_WIDTH - 150), x, rowY);

    ctx.textAlign = "center";
    [player.goals, player.assists, player.saves].forEach((value, index) => {
      ctx.fillStyle = value > 0 ? "#ffffff" : "rgba(255,255,255,0.35)";
      ctx.font = font(value > 0 ? 800 : 500, 28);
      ctx.fillText(String(value), numberX(index), rowY);
    });
  });
}

function drawPlayers(ctx: CanvasRenderingContext2D, players: NightPlayer[], y: number) {
  const left = MARGIN + 28;
  const half = Math.ceil(players.length / 2);
  drawPanel(ctx, y, 464);

  drawSectionTitle(ctx, "Jogadores da noite", left, y + 34);
  drawPlayerColumn(ctx, players.slice(0, half), left, y + 34);
  drawPlayerColumn(ctx, players.slice(half), left + COLUMN_WIDTH + COLUMN_GAP, y + 34);
}

export function renderSummaryImage(summary: NightSummary, day: string, photo: File | null): Promise<Blob | null> {
  return renderImage(`Resumo da noite · ${day}`, photo, (ctx) => {
    drawChampion(ctx, summary.champion, 192);
    drawResults(ctx, summary.results, 404);
    drawPlayers(ctx, summary.players, 792);
  });
}
