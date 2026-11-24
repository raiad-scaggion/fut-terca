// Corner `index` of a regular polygon with `count` corners, starting at the top and going clockwise.
// `value` is a stat on the 0 to 100 scale, so 100 reaches the full radius.
export function radarPoint(index: number, count: number, value: number, radius: number, center: number): [number, number] {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  const distance = (radius * Math.min(100, Math.max(0, value))) / 100;
  return [center + distance * Math.cos(angle), center + distance * Math.sin(angle)];
}

// The `points` attribute of an SVG polygon through every value.
export function radarPolygon(values: number[], radius: number, center: number): string {
  return values
    .map((value, index) => radarPoint(index, values.length, value, radius, center).map((n) => n.toFixed(1)).join(","))
    .join(" ");
}
