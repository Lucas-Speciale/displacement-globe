"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArcLayer, ColumnLayer, PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer, PickingInfo } from "@deck.gl/core";
import * as maplibregl from "maplibre-gl";
import type { FilterSpecification, Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";

import { columnElevation, routeAlpha, routeWidth } from "@/lib/flows";
import { interpolateArcPosition, routePhaseOffset, wrapLongitude } from "@/lib/globe";
import type {
  CountryGeometry,
  CountryMeta,
  DataMode,
  MapLabelDensity,
  RouteView,
  TotalTuple,
} from "@/types/displacement";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const MAPLIBRE_WORKER_URL = "https://unpkg.com/maplibre-gl@6.4.0/dist/maplibre-gl-worker.mjs";
const COUNTRY_SOURCE = "displacement-countries";
const COUNTRY_FILL = "displacement-country-fill";
const COUNTRY_OUTLINE = "displacement-country-outline";
const COUNTRY_SELECTED = "displacement-country-selected";
const COUNTRY_HOVER = "displacement-country-hover";
const SHOWCASE_START_CENTER: [number, number] = [-95, 20];
const SHOWCASE_ZOOM = 1.85;
const GLOBE_MASK_CELLS: Array<Array<[number, number]>> = Array.from({ length: 36 }, (_, latitudeIndex) => {
  const south = -90 + latitudeIndex * 5;
  return Array.from({ length: 72 }, (_, longitudeIndex) => {
    const west = -180 + longitudeIndex * 5;
    return [[west, south], [west + 5, south], [west + 5, south + 5], [west, south + 5]] as Array<[number, number]>;
  });
}).flat();

const MODE_COLORS: Record<DataMode, { source: [number, number, number]; target: [number, number, number] }> = {
  hosted: { source: [217, 111, 71], target: [217, 168, 63] },
  claims: { source: [90, 126, 145], target: [102, 183, 209] },
  returns: { source: [97, 150, 129], target: [54, 119, 92] },
  resettlement: { source: [128, 118, 168], target: [196, 149, 205] },
};

interface ColumnDatum {
  country: number;
  value: number;
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
}

interface MapLabelLayer {
  id: string;
  filter: FilterSpecification | undefined;
  visibility: "visible" | "none" | undefined;
}

interface DisplacementGlobeProps {
  showcase?: boolean;
  geometry: CountryGeometry;
  countries: CountryMeta[];
  mode: DataMode;
  labelDensity: MapLabelDensity;
  routes: RouteView[];
  columns: TotalTuple[];
  selectedCountry: number | null;
  hasSelectedRoute: boolean;
  onCountrySelect: (country: number) => void;
  onRouteSelect: (route: RouteView) => void;
}

function featureIso3(feature: MapGeoJSONFeature | undefined): string | null {
  const iso3 = feature?.properties?.iso3;
  return typeof iso3 === "string" ? iso3 : null;
}

function applyLabelDensity(map: MapLibreMap, layers: MapLabelLayer[], density: MapLabelDensity) {
  layers.forEach((layer) => {
    if (!map.getLayer(layer.id)) return;
    if (density === "detailed") {
      map.setLayoutProperty(layer.id, "visibility", layer.visibility ?? "visible");
      map.setFilter(layer.id, layer.filter);
      return;
    }
    const isCountry = layer.id.startsWith("place_country");
    const isCapital = layer.id === "place_city" || layer.id === "place_city_large";
    map.setLayoutProperty(layer.id, "visibility", isCountry || isCapital ? "visible" : "none");
    if (isCapital) {
      const capitalFilter = layer.filter
        ? (["all", layer.filter, ["==", ["get", "capital"], 2]] as FilterSpecification)
        : (["==", ["get", "capital"], 2] as FilterSpecification);
      map.setFilter(layer.id, capitalFilter);
    }
  });
}

export function DisplacementGlobe({
  showcase = false,
  geometry,
  countries,
  mode,
  labelDensity,
  routes,
  columns,
  selectedCountry,
  hasSelectedRoute,
  onCountrySelect,
  onRouteSelect,
}: DisplacementGlobeProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const labelLayersRef = useRef<MapLabelLayer[]>([]);
  const indexByIso3 = useMemo(() => new Map(countries.map((country, index) => [country.iso3, index])), [countries]);
  const routesRef = useRef(routes);
  const columnsRef = useRef(columns);
  const modeRef = useRef(mode);
  const onCountrySelectRef = useRef(onCountrySelect);
  const onRouteSelectRef = useRef(onRouteSelect);
  const selectedCountryRef = useRef(selectedCountry);
  const hasSelectedRouteRef = useRef(hasSelectedRoute);
  const registerInteractionRef = useRef(() => {});
  const hasInteractedRef = useRef(false);
  const lastInteractionRef = useRef(0);
  const showcaseReadyRef = useRef(false);
  const showcaseStartRequestedRef = useRef(false);
  const showcaseStartedAtRef = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => { routesRef.current = routes; }, [routes]);
  useEffect(() => { columnsRef.current = columns; }, [columns]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { onCountrySelectRef.current = onCountrySelect; }, [onCountrySelect]);
  useEffect(() => { onRouteSelectRef.current = onRouteSelect; }, [onRouteSelect]);
  useEffect(() => { selectedCountryRef.current = selectedCountry; }, [selectedCountry]);
  useEffect(() => { hasSelectedRouteRef.current = hasSelectedRoute; }, [hasSelectedRoute]);

  useEffect(() => {
    if (!showcase) return;
    const requestStart = () => {
      showcaseStartRequestedRef.current = true;
      if (showcaseReadyRef.current && showcaseStartedAtRef.current === null) {
        showcaseStartedAtRef.current = performance.now();
      }
    };
    const startShowcase = (event: MessageEvent) => {
      if (
        event.source === window.parent
        && event.data?.type === "showcase-start"
        && event.data.app === "displacement-globe"
      ) {
        requestStart();
      }
    };
    if (window.parent === window) requestStart();
    window.addEventListener("message", startShowcase);
    return () => {
      window.removeEventListener("message", startShowcase);
      showcaseReadyRef.current = false;
      showcaseStartRequestedRef.current = false;
      showcaseStartedAtRef.current = null;
    };
  }, [showcase]);

  const makeLayers = useCallback((pulseTime: number): Layer[] => {
    const activeRoutes = routesRef.current;
    const activeMode = modeRef.current;
    const colors = MODE_COLORS[activeMode];
    const maximum = activeRoutes[0]?.value ?? 1;
    const arcHeight = activeMode === "hosted" ? 0.32 : 0.5;
    const arcLayer = new ArcLayer<RouteView>({
      id: `displacement-arcs-${activeMode}`,
      data: activeRoutes,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 253, 247, 180],
      greatCircle: true,
      getSourcePosition: (route) => countries[route.origin]?.center ?? [0, 0],
      getTargetPosition: (route) => countries[route.destination]?.center ?? [0, 0],
      getSourceColor: (route) => [
        ...colors.source,
        Math.round(routeAlpha(route.value, maximum) * route.visibility),
      ] as [number, number, number, number],
      getTargetColor: (route) => [
        ...colors.target,
        Math.round(routeAlpha(route.value, maximum) * route.visibility),
      ] as [number, number, number, number],
      getWidth: (route) => routeWidth(route.value, maximum),
      widthUnits: "pixels",
      widthMinPixels: 0.55,
      widthMaxPixels: 5.5,
      getHeight: arcHeight,
      opacity: activeMode === "hosted" ? 0.82 : 0.72,
      parameters: { cullMode: "none" },
      onClick: (info: PickingInfo<RouteView>) => {
        if (info.object) {
          registerInteractionRef.current();
          onRouteSelectRef.current(info.object);
        }
      },
    });

    const globeDepthMask = new PolygonLayer<Array<[number, number]>>({
      id: "globe-depth-mask",
      data: GLOBE_MASK_CELLS,
      getPolygon: (polygon) => polygon,
      getFillColor: [0, 0, 0, 0],
      filled: true,
      stroked: false,
      pickable: false,
      parameters: {
        blend: false,
        depthCompare: "less-equal",
        depthWriteEnabled: true,
      },
    });

    const layers: Layer[] = [globeDepthMask, arcLayer];
    if (activeMode === "hosted" && columnsRef.current.length > 0) {
      const columnData: ColumnDatum[] = columnsRef.current.map(([country, value]) => ({ country, value }));
      const columnMaximum = columnData[0]?.value ?? 1;
      layers.splice(1, 0, new ColumnLayer<ColumnDatum>({
        id: "host-columns",
        data: columnData,
        diskResolution: 10,
        radius: 42_000,
        extruded: true,
        pickable: false,
        getPosition: (column) => countries[column.country]?.center ?? [0, 0],
        getElevation: (column) => columnElevation(column.value, columnMaximum),
        getFillColor: [217, 111, 71, 155],
        getLineColor: [255, 214, 164, 120],
        lineWidthMinPixels: 0.5,
      }));
    }

    if (activeRoutes.length > 0) {
      const particles = activeRoutes.map((route) => {
        const duration = activeMode === "hosted" ? 6800 : 4200;
        const progress = (pulseTime / duration + routePhaseOffset(route.origin, route.destination)) % 1;
        return {
          position: interpolateArcPosition(
            countries[route.origin]?.center ?? [0, 0],
            countries[route.destination]?.center ?? [0, 0],
            progress,
            arcHeight,
          ),
          value: route.value,
          visibility: route.visibility,
        };
      });
      layers.push(new ScatterplotLayer<{ position: [number, number, number]; value: number; visibility: number }>({
        id: `flow-particles-${activeMode}`,
        data: particles,
        pickable: false,
        radiusUnits: "pixels",
        getPosition: (particle) => particle.position,
        getRadius: (particle) => (activeMode === "hosted" ? 1.2 : 1.6) + Math.sqrt(particle.value / maximum) * 2.4,
        radiusMinPixels: activeMode === "hosted" ? 1.2 : 1.5,
        radiusMaxPixels: 4,
        getFillColor: (particle) => [
          ...colors.target,
          Math.round((activeMode === "hosted" ? 190 : 235) * particle.visibility),
        ],
        stroked: true,
        getLineColor: (particle) => [255, 253, 247, Math.round(190 * particle.visibility)],
        lineWidthMinPixels: 0.5,
      }));
    }
    return layers;
  }, [countries]);

  useEffect(() => {
    if (!frameRef.current || mapRef.current) return;
    let rotationFrame = 0;
    let showcaseReadyTimer = 0;
    let previousRotationFrame = performance.now();
    const registerInteraction = () => {
      hasInteractedRef.current = true;
      lastInteractionRef.current = performance.now();
    };
    registerInteractionRef.current = registerInteraction;
    maplibregl.setWorkerUrl(MAPLIBRE_WORKER_URL);
    const map = new maplibregl.Map({
      container: frameRef.current,
      style: MAP_STYLE,
      center: showcase ? SHOWCASE_START_CENTER : [8, 18],
      zoom: showcase ? SHOWCASE_ZOOM : 1.25,
      minZoom: 0.65,
      maxZoom: 6,
      pitch: 0,
      bearing: 0,
      renderWorldCopies: false,
      canvasContextAttributes: { antialias: true },
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;
    map.on("dragstart", registerInteraction);
    map.on("rotatestart", registerInteraction);
    map.on("zoomstart", registerInteraction);
    map.on("pitchstart", registerInteraction);

    map.on("style.load", () => {
      map.setProjection({ type: "globe" });
      map.setSky({
        "sky-color": "#050a08",
        "horizon-color": "#17231f",
        "fog-color": "#0d1714",
        "fog-ground-blend": 0.72,
        "horizon-fog-blend": 0.42,
        "atmosphere-blend": 0.34,
      });
    });

    map.on("load", () => {
      const symbolLayer = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
      labelLayersRef.current = (map.getStyle().layers ?? [])
        .filter((layer) => layer.type === "symbol" && layer.layout && "text-field" in layer.layout)
        .map((layer) => ({
          id: layer.id,
          filter: map.getFilter(layer.id) || undefined,
          visibility: map.getLayoutProperty(layer.id, "visibility") as "visible" | "none" | undefined,
        }));
      applyLabelDensity(map, labelLayersRef.current, "essential");
      map.addSource(COUNTRY_SOURCE, { type: "geojson", data: geometry });
      map.addLayer({
        id: COUNTRY_FILL,
        type: "fill",
        source: COUNTRY_SOURCE,
        paint: {
          "fill-color": "rgba(34, 55, 48, 0.26)",
          "fill-opacity": 0.42,
        },
      }, symbolLayer);
      map.addLayer({
        id: COUNTRY_OUTLINE,
        type: "line",
        source: COUNTRY_SOURCE,
        paint: {
          "line-color": "rgba(223, 229, 218, 0.28)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0.5, 0.45, 4, 0.9],
        },
      }, symbolLayer);
      map.addLayer({
        id: COUNTRY_SELECTED,
        type: "line",
        source: COUNTRY_SOURCE,
        filter: ["==", ["get", "iso3"], ""],
        paint: { "line-color": "#f7f4eb", "line-width": 2.2, "line-opacity": 0.95 },
      }, symbolLayer);
      map.addLayer({
        id: COUNTRY_HOVER,
        type: "line",
        source: COUNTRY_SOURCE,
        filter: ["==", ["get", "iso3"], ""],
        paint: { "line-color": "#d96f47", "line-width": 1.5, "line-opacity": 0.95 },
      }, symbolLayer);

      const overlay = new MapboxOverlay({
        interleaved: false,
        layers: makeLayers(performance.now()),
      });
      map.addControl(overlay);
      overlayRef.current = overlay;

      if (showcase) {
        map.once("idle", () => {
          map.jumpTo({ center: SHOWCASE_START_CENTER, zoom: SHOWCASE_ZOOM, pitch: 0, bearing: 0 });
          showcaseReadyTimer = window.setTimeout(() => {
            showcaseReadyRef.current = true;
            if (window.parent === window || showcaseStartRequestedRef.current) {
              showcaseStartedAtRef.current = performance.now();
            } else {
              window.parent.postMessage({ type: "showcase-ready", app: "displacement-globe" }, "*");
            }
          }, 250);
        });
      }

      const rotateGlobe = (now: number) => {
        const elapsed = Math.min(now - previousRotationFrame, 80);
        previousRotationFrame = now;
        const idle = !hasInteractedRef.current || now - lastInteractionRef.current >= 10_000;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (
          idle
          && selectedCountryRef.current === null
          && !hasSelectedRouteRef.current
          && !reduceMotion
        ) {
          if (showcase) {
            const showcaseStartedAt = showcaseStartedAtRef.current;
            if (showcaseStartedAt !== null && now >= showcaseStartedAt) {
              const phase = ((now - showcaseStartedAt) % 48_000) / 48_000;
              const traversal = (1 - Math.cos(phase * Math.PI * 2)) / 2;
              map.setCenter([SHOWCASE_START_CENTER[0] + traversal * 195, SHOWCASE_START_CENTER[1]]);
            }
          } else {
            const center = map.getCenter();
            map.setCenter([wrapLongitude(center.lng + elapsed * 0.0015), center.lat]);
          }
        }
        rotationFrame = requestAnimationFrame(rotateGlobe);
      };
      rotationFrame = requestAnimationFrame(rotateGlobe);
    });

    map.on("mousemove", COUNTRY_FILL, (event) => {
      const feature = event.features?.[0];
      const iso3 = featureIso3(feature);
      if (!iso3) return;
      map.getCanvas().style.cursor = "pointer";
      map.setFilter(COUNTRY_HOVER, ["==", ["get", "iso3"], iso3]);
      setTooltip({ x: event.point.x, y: event.point.y, name: String(feature?.properties?.name ?? iso3) });
    });
    map.on("mouseleave", COUNTRY_FILL, () => {
      map.getCanvas().style.cursor = "grab";
      map.setFilter(COUNTRY_HOVER, ["==", ["get", "iso3"], ""]);
      setTooltip(null);
    });
    map.on("click", COUNTRY_FILL, (event) => {
      const iso3 = featureIso3(event.features?.[0]);
      const country = iso3 ? indexByIso3.get(iso3) : undefined;
      if (country !== undefined) {
        registerInteraction();
        onCountrySelectRef.current(country);
      }
    });

    return () => {
      cancelAnimationFrame(rotationFrame);
      window.clearTimeout(showcaseReadyTimer);
      registerInteractionRef.current = () => {};
      overlayRef.current?.finalize();
      overlayRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [geometry, indexByIso3, makeLayers, showcase]);

  useEffect(() => {
    const iso3 = selectedCountry === null ? "" : countries[selectedCountry]?.iso3 ?? "";
    const map = mapRef.current;
    if (map?.getLayer(COUNTRY_SELECTED)) map.setFilter(COUNTRY_SELECTED, ["==", ["get", "iso3"], iso3]);
  }, [countries, selectedCountry]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.loaded()) applyLabelDensity(map, labelLayersRef.current, labelDensity);
  }, [labelDensity]);

  useEffect(() => {
    overlayRef.current?.setProps({ layers: makeLayers(performance.now()) });
  }, [columns, makeLayers, mode, routes]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let animationFrame = 0;
    const animate = (time: number) => {
      overlayRef.current?.setProps({ layers: makeLayers(time) });
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [makeLayers, mode]);

  return (
    <div className="globe-shell">
      <div
        ref={frameRef}
        className="globe-canvas"
        aria-label="Interactive globe of forced displacement"
        onPointerDownCapture={() => registerInteractionRef.current()}
      />
      {tooltip && (
        <div className="country-tooltip" style={{ transform: `translate(${tooltip.x + 12}px, ${tooltip.y + 12}px)` }}>
          <strong>{tooltip.name}</strong><span>Click to focus</span>
        </div>
      )}
    </div>
  );
}
