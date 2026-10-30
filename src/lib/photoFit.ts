export type Bounds = { left: number; top: number; right: number; bottom: number };
export type Fit = { scale: number; x: number; y: number };

const MIN_CONFIDENCE = 0.45;
const FULL_CONFIDENCE = 0.75;
const VISIBLE_ALPHA = 128;
const MIN_PERSON_SHARE = 0.03;
const SOFT_EDGE_WIDTH = 4;

// A soft ramp instead of a hard cut, so hair and shoulders don't get a jagged edge.
export function confidenceToAlpha(confidence: number): number {
  const ramp = (confidence - MIN_CONFIDENCE) / (FULL_CONFIDENCE - MIN_CONFIDENCE);
  return Math.round(Math.min(1, Math.max(0, ramp)) * 255);
}

// Keeps the biggest connected shape, which removes people in the background and stray specks.
export function keepLargestRegion(alpha: Uint8ClampedArray | Uint8Array, width: number, height: number): void {
  const regions = new Int32Array(width * height);
  const stack = new Int32Array(width * height);
  let best = 0;
  let bestSize = 0;
  let region = 0;

  for (let start = 0; start < alpha.length; start += 1) {
    if (alpha[start] < VISIBLE_ALPHA || regions[start] !== 0) {
      continue;
    }
    region += 1;
    regions[start] = region;
    stack[0] = start;
    let depth = 1;
    let size = 0;

    while (depth > 0) {
      depth -= 1;
      const index = stack[depth];
      size += 1;
      const x = index % width;
      const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, index - width, index + width];
      for (const next of neighbors) {
        if (next >= 0 && next < alpha.length && alpha[next] >= VISIBLE_ALPHA && regions[next] === 0) {
          regions[next] = region;
          stack[depth] = next;
          depth += 1;
        }
      }
    }

    if (size > bestSize) {
      bestSize = size;
      best = region;
    }
  }

  // The soft edge of the kept shape stays. The faint edge of anything removed must go with it, or a
  // ghost outline of the other person remains on the card.
  const keep = Uint8Array.from(regions, (value) => (value === best ? 1 : 0));
  for (let round = 0; round < SOFT_EDGE_WIDTH; round += 1) {
    const grown = keep.slice();
    for (let index = 0; index < keep.length; index += 1) {
      const x = index % width;
      if (
        keep[index] === 1 ||
        (x > 0 && keep[index - 1] === 1) ||
        (x < width - 1 && keep[index + 1] === 1) ||
        keep[index - width] === 1 ||
        keep[index + width] === 1
      ) {
        grown[index] = 1;
      }
    }
    keep.set(grown);
  }

  for (let index = 0; index < alpha.length; index += 1) {
    if (keep[index] === 0 || (regions[index] !== 0 && regions[index] !== best)) {
      alpha[index] = 0;
    }
  }
}

// Returns null when too little of the picture is a person, which usually means a wrong or dark photo.
export function findPerson(alpha: ArrayLike<number>, width: number, height: number): Bounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let visible = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alpha[y * width + x] >= VISIBLE_ALPHA) {
        visible += 1;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  return visible / (width * height) < MIN_PERSON_SHARE ? null : { left, top, right, bottom };
}

// Frames head and shoulders as on a FIFA card: the head near the top and the torso running off the
// bottom. A full-body photo would otherwise shrink the face to a dot.
export function fitPerson(person: Bounds, stage: number): Fit {
  const width = person.right - person.left + 1;
  const height = person.bottom - person.top + 1;
  const shoulders = Math.min(width, height * 0.62);
  const scale = (stage * 0.86) / shoulders;

  return {
    scale,
    x: stage / 2 - ((person.left + person.right + 1) / 2) * scale,
    y: stage * 0.1 - person.top * scale,
  };
}
