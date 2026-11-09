import { cardTier, positionCode, type CardTier } from "../lib/players";
import { roleDefs, type Average } from "../lib/rebalance";
import { displayFont, fitText, font, GOLD, HEIGHT, renderImage, roundRect, WIDTH } from "./canvas";

const TIER_COLORS: Record<CardTier, string> = { gold: GOLD, silver: "#c9d1de", bronze: "#cd8a4f" };

const MARGIN = 40;
const GAP = 24;
const TOP = 196;
const BOTTOM = HEIGHT - 48;
const COLUMN_WIDTH = (WIDTH - MARGIN * 2 - GAP) / 2;
const MAX_ROW = 56;
const STAT_WIDTH = 36;

type Item = { kind: "head"; title: string; shorts: string[] } | { kind: "row"; average: Average };

function items(averages: Average[]): Item[] {
  const line = averages.filter((average) => average.player.role !== "keeper");
  const keepers = averages.filter((average) => average.player.role === "keeper");
  const list: Item[] = [];
  for (const [title, group] of [
    ["Linha", line],
    ["Goleiros", keepers],
  ] as const) {
    if (group.length) {
      list.push({ kind: "head", title, shorts: roleDefs(group[0].player).map(({ short }) => short) });
      list.push(...group.map((average): Item => ({ kind: "row", average })));
    }
  }
  return list;
}

function drawStats(ctx: CanvasRenderingContext2D, values: (string | number)[], right: number, y: number) {
  ctx.textAlign = "center";
  values.forEach((value, index) => {
    ctx.fillText(String(value), right - STAT_WIDTH * (values.length - index) + STAT_WIDTH / 2, y);
  });
}

function drawItem(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number, height: number) {
  const middle = y + height / 2 + 1;
  const right = x + COLUMN_WIDTH - 12;
  const size = Math.max(14, Math.round(height * 0.42));
  ctx.textBaseline = "middle";

  if (item.kind === "head") {
    ctx.fillStyle = GOLD;
    ctx.textAlign = "left";
    ctx.font = displayFont(700, Math.round(height * 0.7));
    ctx.fillText(item.title.toUpperCase(), x + 12, middle);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = font(700, Math.max(12, Math.round(size * 0.75)));
    drawStats(ctx, item.shorts, right, middle);
    return;
  }

  const { player, values, ovr, votes } = item.average;
  roundRect(ctx, x, y + 2, COLUMN_WIDTH, height - 4, 10);
  ctx.fillStyle = "rgba(10, 12, 20, 0.8)";
  ctx.fill();

  const badge = Math.round(height * 0.95);
  roundRect(ctx, x + 6, y + 5, badge, height - 10, 8);
  ctx.fillStyle = TIER_COLORS[cardTier(ovr)];
  ctx.fill();
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = displayFont(700, Math.round(size * 1.15));
  ctx.fillText(String(ovr), x + 6 + badge / 2, middle);

  const statsLeft = right - STAT_WIDTH * 6;
  const nameLeft = x + badge + 16;
  ctx.textAlign = "left";
  ctx.fillStyle = votes === 0 ? "rgba(242,244,250,0.6)" : "#f2f4fa";
  ctx.font = font(700, size);
  const code = positionCode(player);
  const codeWidth = 44;
  ctx.fillText(fitText(ctx, player.name, statsLeft - nameLeft - codeWidth - 6), nameLeft, middle);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = font(600, Math.round(size * 0.75));
  ctx.textAlign = "right";
  ctx.fillText(code, statsLeft - 6, middle);

  ctx.fillStyle = "#f2f4fa";
  ctx.font = font(600, size);
  drawStats(
    ctx,
    roleDefs(player).map(({ key }) => values[key]),
    right,
    middle,
  );
}

// The published averages in two columns: outfield first, then keepers, filling left to right.
export function renderRebalanceImage(averages: Average[], photo: File | null): Promise<Blob | null> {
  const list = items(averages);
  const perColumn = Math.max(1, Math.ceil(list.length / 2));
  const rowHeight = Math.min(MAX_ROW, (BOTTOM - TOP) / perColumn);

  return renderImage("Rebalanceamento", photo, (ctx) => {
    list.forEach((item, index) => {
      const column = Math.floor(index / perColumn);
      const x = MARGIN + column * (COLUMN_WIDTH + GAP);
      const y = TOP + (index % perColumn) * rowHeight;
      drawItem(ctx, item, x, y, rowHeight);
    });
  });
}
