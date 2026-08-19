import type { FeatureCollection, Geometry } from "geojson";

export type DataMode = "hosted" | "claims" | "returns" | "resettlement";
export type FocusDirection = "outbound" | "inbound";
export type MapLabelDensity = "essential" | "detailed";

export interface DisplacementManifest {
  schemaVersion: number;
  years: number[];
  modes: DataMode[];
  source: string;
  sourceUrl: string;
  methodologyUrl: string;
  license: string;
  releaseDate: string;
  generatedAt: string;
  definitions: Record<DataMode, string>;
  recordsByMode: Record<DataMode, number>;
  exclusions: Record<string, number>;
}

export interface CountryMeta {
  iso3: string;
  name: string;
  center: [number, number];
}

export interface CountryIndex {
  countries: CountryMeta[];
  indexByIso3: Record<string, number>;
}

export interface CountryFeatureProperties {
  iso3: string;
  name: string;
}

export type CountryGeometry = FeatureCollection<Geometry, CountryFeatureProperties>;

export type RouteTuple = [origin: number, destination: number, value: number];
export type TotalTuple = [country: number, value: number];

export interface YearModeData {
  year: number;
  mode: DataMode;
  global: number;
  max: number;
  routes: RouteTuple[];
  origins: TotalTuple[];
  destinations: TotalTuple[];
}

export interface RouteView {
  origin: number;
  destination: number;
  value: number;
}
