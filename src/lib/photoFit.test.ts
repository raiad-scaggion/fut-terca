import { describe, expect, it } from "vitest";
import { confidenceToAlpha, findPerson, fitPerson, keepLargestRegion } from "./photoFit";

describe("confidenceToAlpha", () => {
  it("drops the background and keeps the person", () => {
    expect(confidenceToAlpha(0.1)).toBe(0);
    expect(confidenceToAlpha(0.95)).toBe(255);
  });

  it("softens the edge", () => {
    const edge = confidenceToAlpha(0.6);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(255);
  });
});

describe("findPerson", () => {
  function picture(width: number, height: number, inside: (x: number, y: number) => boolean) {
    return Uint8Array.from({ length: width * height }, (_, index) => (inside(index % width, Math.floor(index / width)) ? 255 : 0));
  }

  it("finds the box around the person", () => {
    const alpha = picture(10, 10, (x, y) => x >= 2 && x <= 6 && y >= 3 && y <= 8);
    expect(findPerson(alpha, 10, 10)).toEqual({ left: 2, top: 3, right: 6, bottom: 8 });
  });

  it("gives up on a photo with nobody in it", () => {
    expect(findPerson(picture(100, 100, () => false), 100, 100)).toBeNull();
    expect(findPerson(picture(100, 100, (x, y) => x === 5 && y === 5), 100, 100)).toBeNull();
  });
});

describe("fitPerson", () => {
  it("centers the person and puts the head near the top", () => {
    const fit = fitPerson({ left: 100, top: 50, right: 299, bottom: 549 }, 400);

    expect(fit.x + 200 * fit.scale).toBeCloseTo(200);
    expect(fit.y + 50 * fit.scale).toBeCloseTo(40);
  });

  it("zooms into the upper body of a full-body photo", () => {
    const close = fitPerson({ left: 0, top: 0, right: 399, bottom: 399 }, 400);
    const full = fitPerson({ left: 0, top: 0, right: 99, bottom: 799 }, 400);

    expect(full.scale).toBeGreaterThan(close.scale);
  });
});

describe("keepLargestRegion", () => {
  it("removes everything but the biggest shape", () => {
    const alpha = Uint8Array.from([
      255, 255, 0, 0, 255,
      255, 255, 0, 0, 0,
      255, 0, 0, 0, 255,
    ]);

    keepLargestRegion(alpha, 5, 3);

    expect(Array.from(alpha)).toEqual([255, 255, 0, 0, 0, 255, 255, 0, 0, 0, 255, 0, 0, 0, 0]);
  });

  it("doesn't wrap a shape around the edge of the picture", () => {
    const alpha = Uint8Array.from([0, 0, 255, 255, 0, 0, 255, 0, 0]);

    keepLargestRegion(alpha, 3, 3);

    expect(Array.from(alpha)).toEqual([0, 0, 0, 255, 0, 0, 255, 0, 0]);
  });
});
