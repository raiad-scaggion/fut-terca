import { confidenceToAlpha, findPerson, keepLargestRegion, type Bounds, type Fit } from "../lib/photoFit";

const TASKS_VERSION = "1.2.0";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

const MAX_INPUT = 1024;
export const CARD_PHOTO_SIZE = 380;
const FALLBACK_PHOTO_SIZE = 260;
const WEBP_QUALITY = 0.82;

export type Cutout = {
  canvas: HTMLCanvasElement;
  person: Bounds;
};

type Segmenter = Awaited<ReturnType<typeof createSegmenter>>;

let segmenter: Promise<Segmenter> | null = null;

async function createSegmenter() {
  const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
    runningMode: "IMAGE",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
}

// Only admins adding a photo ever load this, and the download stays out of the main bundle.
function getSegmenter(): Promise<Segmenter> {
  segmenter ??= createSegmenter().catch((error) => {
    segmenter = null;
    throw error;
  });
  return segmenter;
}

export async function decodeImage(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_INPUT / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

// Runs on the phone, so a player's photo never leaves it before the admin saves the result.
export async function cutOutPerson(source: HTMLCanvasElement): Promise<Cutout | null> {
  const model = await getSegmenter();
  const { width, height } = source;
  const context = source.getContext("2d");
  if (!context) {
    return null;
  }

  const pixels = context.getImageData(0, 0, width, height);
  const alpha = new Uint8ClampedArray(width * height);

  model.segment(source, (result) => {
    const masks = result.confidenceMasks ?? [];
    const person = masks[masks.length - 1]?.getAsFloat32Array();
    if (person) {
      for (let index = 0; index < alpha.length; index += 1) {
        alpha[index] = confidenceToAlpha(person[index]);
      }
    }
    masks.forEach((mask) => mask.close());
  });

  keepLargestRegion(alpha, width, height);
  const person = findPerson(alpha, width, height);
  if (!person) {
    return null;
  }

  for (let index = 0; index < alpha.length; index += 1) {
    pixels.data[index * 4 + 3] = alpha[index];
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.putImageData(pixels, 0, 0);
  return { canvas, person };
}

function renderFrame(image: HTMLCanvasElement, fit: Fit, stage: number, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const ratio = size / stage;
  context?.drawImage(image, fit.x * ratio, fit.y * ratio, image.width * fit.scale * ratio, image.height * fit.scale * ratio);
  return canvas;
}

// iPhones can't encode WebP and silently hand back a PNG. A PNG is far heavier, so those photos go
// out smaller, because every photo is sent to every phone.
export function exportCardPhoto(image: HTMLCanvasElement, fit: Fit, stage: number): string {
  const photo = renderFrame(image, fit, stage, CARD_PHOTO_SIZE).toDataURL("image/webp", WEBP_QUALITY);
  return photo.startsWith("data:image/webp") ? photo : renderFrame(image, fit, stage, FALLBACK_PHOTO_SIZE).toDataURL("image/png");
}
