import { describe, expect, it } from "vitest";

import { interpolateArcPosition } from "./globe";

describe("globe arc interpolation", () => {
  it("keeps particles at route endpoints and raises them at mid-route", () => {
    expect(interpolateArcPosition([0, 0], [90, 0], 0, 0.5)).toEqual([0, 0, 0]);
    expect(interpolateArcPosition([0, 0], [90, 0], 1, 0.5)).toEqual([90, 0, 0]);
    const midpoint = interpolateArcPosition([0, 0], [90, 0], 0.5, 0.5);
    expect(midpoint[0]).toBeCloseTo(45);
    expect(midpoint[1]).toBeCloseTo(0);
    expect(midpoint[2]).toBeGreaterThan(2_000_000);
  });
});
