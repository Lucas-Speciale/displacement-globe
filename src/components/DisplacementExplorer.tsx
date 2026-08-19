"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CountryFocus } from "@/components/CountryFocus";
import { DisplacementGlobe } from "@/components/DisplacementGlobe";
import { DisplacementGuide } from "@/components/DisplacementGuide";
import { DisplacementTimeline } from "@/components/DisplacementTimeline";
import { ModeDock } from "@/components/ModeDock";
import {
  interpolateGlobal,
  interpolateRoutes,
  interpolateTotals,
  totalForCountry,
  yearChange,
} from "@/lib/flows";
import { formatCompact, formatPeople } from "@/lib/format";
import type {
  CountryGeometry,
  CountryIndex,
  DataMode,
  DisplacementManifest,
  FocusDirection,
  MapLabelDensity,
  RouteView,
  TotalTuple,
  YearModeData,
} from "@/types/displacement";

interface AppData {
  manifest: DisplacementManifest;
  countryIndex: CountryIndex;
  geometry: CountryGeometry;
}

interface LoadedModeData {
  mode: DataMode;
  partitions: Map<number, YearModeData>;
}

const MODE_COPY: Record<DataMode, { eyebrow: string; headline: string; legend: string; low: string; high: string }> = {
  hosted: {
    eyebrow: "End-of-year population",
    headline: "Where refuge accumulated",
    legend: "A slow pulse traces origin → host; width and bars show year-end population",
    low: "Smaller corridor",
    high: "Larger corridor",
  },
  claims: {
    eyebrow: "Applications during the year",
    headline: "Where protection was sought",
    legend: "Pulsing blue arcs show new first-instance asylum applications",
    low: "Fewer applications",
    high: "More applications",
  },
  returns: {
    eyebrow: "Recorded movement during the year",
    headline: "Where return became possible",
    legend: "Green arcs travel from asylum countries back toward origins",
    low: "Fewer returns",
    high: "More returns",
  },
  resettlement: {
    eyebrow: "Arrivals during the year",
    headline: "Where resettlement opened a path",
    legend: "Violet arcs connect origins to final resettlement countries",
    low: "Fewer arrivals",
    high: "More arrivals",
  },
};

const MODE_FIRST_YEAR: Record<DataMode, number> = {
  hosted: 2000,
  claims: 2006,
  returns: 2000,
  resettlement: 2000,
};

async function loadJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.json() as Promise<T>;
}

export function DisplacementExplorer() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [loadedMode, setLoadedMode] = useState<LoadedModeData | null>(null);
  const [mode, setMode] = useState<DataMode>("hosted");
  const [time, setTime] = useState(2000);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<number | null>(null);
  const [direction, setDirection] = useState<FocusDirection>("outbound");
  const [labelDensity, setLabelDensity] = useState<MapLabelDensity>("essential");
  const [selectedRoute, setSelectedRoute] = useState<RouteView | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const cacheRef = useRef(new Map<string, Promise<YearModeData>>());
  const timeRef = useRef(time);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      loadJson<DisplacementManifest>("/data/displacement/manifest.json", controller.signal),
      loadJson<CountryIndex>("/data/displacement/countries.json", controller.signal),
      loadJson<CountryGeometry>("/data/displacement/geometry.geojson", controller.signal),
    ])
      .then(([manifest, countryIndex, geometry]) => {
        setAppData({ manifest, countryIndex, geometry });
        setTime(manifest.years[0]);
        if (window.localStorage.getItem("displacement-guide-seen") !== "1") setGuideOpen(true);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "The globe could not load.");
      });
    return () => controller.abort();
  }, []);

  const loadPartition = useCallback((targetYear: number, targetMode: DataMode): Promise<YearModeData> => {
    const key = `${targetYear}-${targetMode}`;
    const cached = cacheRef.current.get(key);
    if (cached) return cached;
    const request = loadJson<YearModeData>(`/data/displacement/years/${targetYear}/${targetMode}.json`)
      .catch((loadError) => {
        cacheRef.current.delete(key);
        throw loadError;
      });
    cacheRef.current.set(key, request);
    return request;
  }, []);

  useEffect(() => {
    if (!appData) return;
    let cancelled = false;
    const years = appData.manifest.years.filter((candidate) => candidate >= MODE_FIRST_YEAR[mode]);
    Promise.all(years.map((candidate) => loadPartition(candidate, mode)))
      .then((partitions) => {
        if (cancelled) return;
        setLoadedMode({ mode, partitions: new Map(partitions.map((partition) => [partition.year, partition])) });
        setSelectedRoute(null);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "The selected year could not load.");
      });
    return () => { cancelled = true; };
  }, [appData, loadPartition, mode]);

  useEffect(() => { timeRef.current = time; }, [time]);

  useEffect(() => {
    if (!playing || !appData || loadedMode?.mode !== mode) return;
    const finalYear = appData.manifest.years.at(-1)!;
    let animationFrame = 0;
    let previousFrame = performance.now();
    const animate = (now: number) => {
      const elapsed = Math.min(now - previousFrame, 80);
      previousFrame = now;
      const next = Math.min(finalYear, timeRef.current + elapsed / 1250);
      timeRef.current = next;
      setTime(next);
      if (next >= finalYear) {
        setPlaying(false);
        return;
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [appData, loadedMode, mode, playing]);

  const partitions = loadedMode?.mode === mode ? loadedMode.partitions : null;
  const firstYear = MODE_FIRST_YEAR[mode];
  const finalYear = appData?.manifest.years.at(-1) ?? 2025;
  const lowerYear = Math.max(firstYear, Math.floor(time));
  const upperYear = Math.min(finalYear, Math.ceil(time));
  const lowerPartition = partitions?.get(lowerYear) ?? null;
  const upperPartition = partitions?.get(upperYear) ?? lowerPartition;
  const progress = upperYear === lowerYear ? 0 : (time - lowerYear) / (upperYear - lowerYear);

  const visibleRoutes = useMemo(() => {
    if (!lowerPartition || !upperPartition) return [];
    return interpolateRoutes(lowerPartition, upperPartition, progress, selectedCountry, direction, 72, 40);
  }, [direction, lowerPartition, progress, selectedCountry, upperPartition]);

  const origins = useMemo(
    () => lowerPartition && upperPartition
      ? interpolateTotals(lowerPartition.origins, upperPartition.origins, progress)
      : [],
    [lowerPartition, progress, upperPartition],
  );
  const destinations = useMemo(
    () => lowerPartition && upperPartition
      ? interpolateTotals(lowerPartition.destinations, upperPartition.destinations, progress)
      : [],
    [lowerPartition, progress, upperPartition],
  );
  const globalTotal = lowerPartition && upperPartition
    ? interpolateGlobal(lowerPartition.global, upperPartition.global, progress)
    : 0;
  const loading = !partitions;

  const columns = useMemo<TotalTuple[]>(() => {
    if (mode !== "hosted") return [];
    if (selectedCountry === null) return destinations.slice(0, 38);
    if (direction === "inbound") {
      const value = totalForCountry(destinations, selectedCountry);
      return value > 0 ? [[selectedCountry, value]] : [];
    }
    const totals = new Map<number, number>();
    visibleRoutes.forEach((route) => totals.set(route.destination, (totals.get(route.destination) ?? 0) + route.value));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28) as TotalTuple[];
  }, [destinations, direction, mode, selectedCountry, visibleRoutes]);

  if (error) return <main className="fatal-state"><h1>Displacement Globe could not start.</h1><p>{error}</p></main>;
  if (!appData || !loadedMode) return <main className="loading-state"><span /><p>Preparing the displacement record…</p></main>;

  const copy = MODE_COPY[mode];
  const selectedMeta = selectedCountry === null ? null : appData.countryIndex.countries[selectedCountry];
  const selectedTotal = selectedCountry === null
    ? globalTotal
    : totalForCountry(direction === "outbound" ? origins : destinations, selectedCountry);
  const previousTime = Math.max(firstYear, time - 1);
  const previousLowerYear = Math.floor(previousTime);
  const previousUpperYear = Math.ceil(previousTime);
  const previousLower = partitions?.get(previousLowerYear) ?? null;
  const previousUpper = partitions?.get(previousUpperYear) ?? previousLower;
  const previousProgress = previousUpperYear === previousLowerYear ? 0 : previousTime - previousLowerYear;
  const previousTotals = previousLower && previousUpper
    ? interpolateTotals(
        direction === "outbound" ? previousLower.origins : previousLower.destinations,
        direction === "outbound" ? previousUpper.origins : previousUpper.destinations,
        previousProgress,
      )
    : [];
  const previousTotal = selectedCountry === null
    ? previousLower && previousUpper
      ? interpolateGlobal(previousLower.global, previousUpper.global, previousProgress)
      : 0
    : totalForCountry(previousTotals, selectedCountry);
  const currentChange = time <= firstYear ? null : yearChange(selectedTotal, previousTotal);
  const displayYear = String(Math.floor(time + 0.001));
  const routeSummary = selectedRoute
    ? `${appData.countryIndex.countries[selectedRoute.origin]?.name} → ${appData.countryIndex.countries[selectedRoute.destination]?.name}`
    : null;

  const closeGuide = () => {
    window.localStorage.setItem("displacement-guide-seen", "1");
    setGuideOpen(false);
  };

  return (
    <main className={`displacement-app mode-${mode}`}>
      <DisplacementGlobe
        geometry={appData.geometry}
        countries={appData.countryIndex.countries}
        mode={mode}
        routes={visibleRoutes}
        columns={columns}
        labelDensity={labelDensity}
        selectedCountry={selectedCountry}
        onCountrySelect={(country) => {
          setPlaying(false);
          setSelectedCountry(country);
          setSelectedRoute(null);
        }}
        onRouteSelect={(route) => {
          setPlaying(false);
          setSelectedRoute(route);
        }}
      />

      <header className="brand-overlay">
        <p className="eyebrow">The forced displacement study</p>
        <h1>Displacement<br /><em>Globe</em></h1>
        <p>{copy.headline}</p>
      </header>

      <div className="year-overlay"><span>{copy.eyebrow}</span><strong>{displayYear}</strong></div>

      <ModeDock
        mode={mode}
        direction={direction}
        labelDensity={labelDensity}
        hasSelection={selectedCountry !== null}
        onModeChange={(nextMode) => {
          setPlaying(false);
          setMode(nextMode);
          setTime((current) => {
            const next = Math.max(current, MODE_FIRST_YEAR[nextMode]);
            timeRef.current = next;
            return next;
          });
          setSelectedRoute(null);
        }}
        onDirectionChange={(nextDirection) => {
          setPlaying(false);
          setDirection(nextDirection);
          setSelectedRoute(null);
        }}
        onLabelDensityChange={setLabelDensity}
        onOpenGuide={() => setGuideOpen(true)}
      />

      {selectedMeta && (
        <CountryFocus
          country={selectedMeta}
          countries={appData.countryIndex.countries}
          mode={mode}
          direction={direction}
          value={selectedTotal}
          change={currentChange}
          routes={visibleRoutes}
          onClose={() => { setSelectedCountry(null); setSelectedRoute(null); }}
        />
      )}

      {selectedRoute && (
        <div className="route-readout">
          <button type="button" onClick={() => setSelectedRoute(null)} aria-label="Close route details">×</button>
          <span>{routeSummary}</span>
          <strong>{formatPeople(selectedRoute.value)}</strong>
          <small>{appData.manifest.definitions[mode]}</small>
        </div>
      )}

      <div className="global-readout">
        <span>{selectedCountry === null ? "Global recorded total" : direction === "outbound" ? "From selected origin" : "At selected destination"}</span>
        <strong>{formatCompact(selectedTotal)}</strong>
      </div>

      <div className="map-legend">
        <span>{copy.legend}</span>
        <div className="legend-line"><i /><i /><i /></div>
        <div><small>{copy.low}</small><small>{copy.high}</small></div>
      </div>

      <DisplacementTimeline
        time={time}
        firstYear={firstYear}
        finalYear={finalYear}
        playing={playing}
        loading={loading}
        sourceUrl={appData.manifest.sourceUrl}
        onTimeChange={(nextTime) => {
          setPlaying(false);
          timeRef.current = nextTime;
          setTime(nextTime);
        }}
        onTogglePlaying={() => {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          if (!playing && time >= finalYear) {
            timeRef.current = firstYear;
            setTime(firstYear);
          }
          setPlaying((current) => !current);
        }}
      />

      <DisplacementGuide
        mode={mode}
        open={guideOpen}
        methodologyUrl={appData.manifest.methodologyUrl}
        onClose={closeGuide}
      />
    </main>
  );
}
