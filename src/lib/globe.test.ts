import { describe, expect, it } from "vitest";

import { interpolateArcPosition, routePhaseOffset, wrapLongitude } from "./globe";

describe("globe arc interpolation", () => {
  it("keeps particles at route endpoints and raises them at mid-route", () => {
    expect(interpolateArcPosition([0, 0], [90, 0], 0, 0.5)).toEqual([0, 0, 0]);
    expect(interpolateArcPosition([0, 0], [90, 0], 1, 0.5)).toEqual([90, 0, 0]);
    const midpoint = interpolateArcPosition([0, 0], [90, 0], 0.5, 0.5);
    expect(midpoint[0]).toBeCloseTo(45);
    expect(midpoint[1]).toBeCloseTo(0);
    expect(midpoint[2]).toBeGreaterThan(2_000_000);
  });

  it("assigns a stable animation phase to each corridor", () => {
    expect(routePhaseOffset(12, 48)).toBe(routePhaseOffset(12, 48));
    expect(routePhaseOffset(12, 48)).not.toBe(routePhaseOffset(48, 12));
  });

  it("wraps an automatically rotating globe across the antimeridian", () => {
    expect(wrapLongitude(181)).toBe(-179);
    expect(wrapLongitude(-181)).toBe(179);
  });
});
