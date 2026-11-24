import { describe, expect, it } from "vitest";
import { radarPoint, radarPolygon } from "./radar";

describe("radarPoint", () => {
  it("puts the first stat at the top, at full radius for 100", () => {
    const [x, y] = radarPoint(0, 6, 100, 100, 150);
    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(50);
  });

  it("goes clockwise and scales by the value", () => {
    const [x, y] = radarPoint(3, 6, 50, 100, 150);
    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(200);
  });

  it("keeps out-of-range values inside the chart", () => {
    expect(radarPoint(0, 6, 140, 100, 150)[1]).toBeCloseTo(50);
    expect(radarPoint(0, 6, -10, 100, 150)[1]).toBeCloseTo(150);
  });
});

describe("radarPolygon", () => {
  it("lists one corner per value", () => {
    expect(radarPolygon([100, 100, 100, 100], 10, 10)).toBe("10.0,0.0 20.0,10.0 10.0,20.0 0.0,10.0");
  });
});
