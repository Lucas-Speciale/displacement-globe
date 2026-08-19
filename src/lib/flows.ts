import type {
  FocusDirection,
  RouteView,
  TotalTuple,
  YearModeData,
} from "@/types/displacement";

export function selectRoutes(
  data: YearModeData,
  selectedCountry: number | null,
  direction: FocusDirection,
  globalLimit: number,
  focusLimit: number,
): RouteView[] {
  const routes = selectedCountry === null
    ? data.routes.slice(0, globalLimit)
    : data.routes
        .filter((route) => route[direction === "outbound" ? 0 : 1] === selectedCountry)
        .slice(0, focusLimit);
  return routes.map(([origin, destination, value]) => ({ origin, destination, value }));
}

function interpolateValue(start: number, end: number, progress: number): number {
  return start + (end - start) * Math.max(0, Math.min(1, progress));
}

export function interpolateTotals(
  start: TotalTuple[],
  end: TotalTuple[],
  progress: number,
): TotalTuple[] {
  const values = new Map<number, [number, number]>();
  start.forEach(([country, value]) => values.set(country, [value, 0]));
  end.forEach(([country, value]) => {
    const current = values.get(country) ?? [0, 0];
    current[1] = value;
    values.set(country, current);
  });
  return [...values.entries()]
    .map(([country, [startValue, endValue]]) => [
      country,
      interpolateValue(startValue, endValue, progress),
    ] as TotalTuple)
    .filter(([, value]) => value > 0.01)
    .sort((a, b) => b[1] - a[1]);
}

export function interpolateRoutes(
  start: YearModeData,
  end: YearModeData,
  progress: number,
  selectedCountry: number | null,
  direction: FocusDirection,
  globalLimit: number,
  focusLimit: number,
): RouteView[] {
  const candidateLimit = Math.max(globalLimit * 4, 180);
  const routeIndex = direction === "outbound" ? 0 : 1;
  const candidates = selectedCountry === null
    ? [start.routes.slice(0, candidateLimit), end.routes.slice(0, candidateLimit)]
    : [
        start.routes.filter((route) => route[routeIndex] === selectedCountry),
        end.routes.filter((route) => route[routeIndex] === selectedCountry),
      ];
  const values = new Map<string, [number, number, number, number]>();
  candidates[0].forEach(([origin, destination, value]) => {
    values.set(`${origin}:${destination}`, [origin, destination, value, 0]);
  });
  candidates[1].forEach(([origin, destination, value]) => {
    const current = values.get(`${origin}:${destination}`) ?? [origin, destination, 0, 0];
    current[3] = value;
    values.set(`${origin}:${destination}`, current);
  });
  const limit = selectedCountry === null ? globalLimit : focusLimit;
  return [...values.values()]
    .map(([origin, destination, startValue, endValue]) => ({
      origin,
      destination,
      value: interpolateValue(startValue, endValue, progress),
    }))
    .filter((route) => route.value > 0.01)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function interpolateGlobal(start: number, end: number, progress: number): number {
  return interpolateValue(start, end, progress);
}

export function totalForCountry(totals: TotalTuple[], country: number): number {
  return totals.find(([index]) => index === country)?.[1] ?? 0;
}

export function routeWidth(value: number, maximum: number): number {
  if (maximum <= 0 || value <= 0) return 0.55;
  return 0.55 + Math.sqrt(value / maximum) * 4.95;
}

export function routeAlpha(value: number, maximum: number): number {
  if (maximum <= 0 || value <= 0) return 80;
  return Math.round(80 + Math.sqrt(value / maximum) * 165);
}

export function columnElevation(value: number, maximum: number): number {
  if (maximum <= 0 || value <= 0) return 0;
  return 45_000 + Math.sqrt(value / maximum) * 455_000;
}

export function yearChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
