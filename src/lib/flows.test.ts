import { describe, expect, it } from "vitest";

import {
  columnElevation,
  interpolateGlobal,
  interpolateRoutes,
  interpolateTotals,
  routeAlpha,
  routeWidth,
  selectRoutes,
  totalForCountry,
  yearChange,
} from "./flows";
import type { YearModeData } from "@/types/displacement";

const data: YearModeData = {
  year: 2025,
  mode: "hosted",
  global: 60,
  max: 30,
  routes: [[0, 1, 30], [0, 2, 20], [3, 1, 10]],
  origins: [[0, 50], [3, 10]],
  destinations: [[1, 40], [2, 20]],
};

describe("flow selection", () => {
  it("limits the global view", () => {
    expect(selectRoutes(data, null, "outbound", 2, 10)).toHaveLength(2);
  });

  it("filters both focus directions", () => {
    expect(selectRoutes(data, 0, "outbound", 10, 10)).toHaveLength(2);
    expect(selectRoutes(data, 1, "inbound", 10, 10)).toHaveLength(2);
  });

  it("finds totals and scales safely", () => {
    expect(totalForCountry(data.destinations, 1)).toBe(40);
    expect(routeWidth(30, 30)).toBe(5.5);
    expect(routeAlpha(30, 30)).toBe(245);
    expect(columnElevation(30, 30)).toBe(500_000);
    expect(yearChange(150, 100)).toBe(50);
    expect(yearChange(10, 0)).toBeNull();
  });

  it("interpolates annual snapshots without dropping entering or exiting flows", () => {
    const next: YearModeData = {
      ...data,
      year: 2026,
      global: 80,
      routes: [[0, 1, 10], [3, 2, 40]],
      origins: [[0, 10], [3, 40]],
      destinations: [[1, 10], [2, 40]],
    };

    expect(interpolateGlobal(60, 80, 0.5)).toBe(70);
    expect(interpolateTotals(data.destinations, next.destinations, 0.5)).toEqual([
      [2, 30],
      [1, 25],
    ]);
    expect(interpolateRoutes(data, next, 0.5, null, "outbound", 10, 10)).toEqual([
      { origin: 0, destination: 1, value: 20 },
      { origin: 3, destination: 2, value: 20 },
      { origin: 0, destination: 2, value: 10 },
      { origin: 3, destination: 1, value: 5 },
    ]);
  });
});
