import { nextBackground } from "./backgrounds";

export const WIDTH = 1080;
export const HEIGHT = 1350;
export const GOLD = "#f5c842";

const FONT_FAMILY = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function font(weight: number, size: number): string {
  return `${weight} ${size}px ${FONT_FAMILY}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
}

// Offline, or with a broken file from the phone, the image still works on a plain gradient.
function drawFallback(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#050914");
  sky.addColorStop(0.55, "#0c1f17");
  sky.addColorStop(1, "#0f3a22");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

async function drawBackground(ctx: CanvasRenderingContext2D, photo: File | null): Promise<string> {
  const stock = photo ? null : nextBackground();
  const src = photo ? URL.createObjectURL(photo) : stock!.src;
  let credit = "";

  try {
    drawCover(ctx, await loadImage(src));
    credit = stock?.credit ?? "";
  } catch {
    drawFallback(ctx);
  } finally {
    if (photo) {
      URL.revokeObjectURL(src);
    }
  }

  // Darkens the top and bottom so text stays readable on any photo.
  const shade = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  shade.addColorStop(0, "rgba(0,0,0,0.7)");
  shade.addColorStop(0.25, "rgba(0,0,0,0.25)");
  shade.addColorStop(0.8, "rgba(0,0,0,0.25)");
  shade.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  return credit;
}

function drawHeader(ctx: CanvasRenderingContext2D, subtitle: string) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = GOLD;
  ctx.font = font(900, 92);
  ctx.fillText("FUT DE TERÇA", WIDTH / 2, 84);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(600, 32);
  ctx.fillText(subtitle, WIDTH / 2, 156);
}

function drawCredit(ctx: CanvasRenderingContext2D, credit: string) {
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = font(500, 18);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(credit, WIDTH - 24, HEIGHT - 20);
}

// Shared frame of both images: background, header, the image's own content, then the photo credit.
export async function renderImage(
  subtitle: string,
  photo: File | null,
  drawContent: (ctx: CanvasRenderingContext2D) => void,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const credit = await drawBackground(ctx, photo);
  drawHeader(ctx, subtitle);
  drawContent(ctx);
  if (credit) {
    drawCredit(ctx, credit);
  }

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
