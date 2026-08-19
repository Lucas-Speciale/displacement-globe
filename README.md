# Displacement Globe

Displacement Globe is a dark, time-first exploration of how forced-displacement relationships changed from 2000 through 2025. Rotate the globe, play or scrub the annual timeline, switch between hosted refugees, new asylum claims, returns, and resettlement, then select a country to isolate inbound or outbound corridors.

This is an early local prototype. The product and architecture brief is in [PROJECT_PLAN.md](PROJECT_PLAN.md).

## Local development

Requires Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Before handoff, run:

```bash
pnpm test
pnpm lint
pnpm build
```

## Architecture

The project follows Trade Atlas and Gridshift:

- Static Next.js, React, and strict TypeScript application
- MapLibre GL JS globe using OpenFreeMap's Dark style
- deck.gl ArcLayer, ColumnLayer, and small particle layers inside MapLibre's rendering stack
- D3-compatible pure scaling utilities
- Offline Python normalization and validation
- Compact static JSON partitions served directly by the browser
- No database and no production-time UNHCR API dependency

```text
UNHCR downloadable exports
        ↓ offline Python build
Validated annual mode partitions
        ↓ static hosting
Next.js + MapLibre globe + deck.gl layers
```

## Data

The local source snapshots are stored under `data/raw/unhcr/`:

- `population-2000-2025.zip`
- `asylum-applications-2000-2025.zip`
- `solutions-2000-2025.zip`

Country geometry is stored under `data/raw/world-bank/geometry.geojson`. Raw sources and the detailed build report are ignored by Git. Validated browser assets under `public/data/displacement/` are designed to be tracked after review.

Rebuild the browser data with:

```bash
pnpm data:build
```

The build produces per-year, per-mode route partitions, country metadata, normalized geometry, a manifest, and an ignored audit report. It rejects negative values, omits internal and unmappable international routes, and limits asylum claims to new first-instance applications reported as persons.

Primary source: [UNHCR Refugee Population Statistics Database](https://www.unhcr.org/refugee-statistics/), generally licensed under CC BY 4.0. Attribution: “UNHCR Refugee Population Statistics Database.”

## Interpretation

- Hosted refugee arcs are end-of-year stock relationships, not annual journeys or literal travel paths.
- Claims are new first-instance asylum applications reported as people, not confirmed movement.
- Return arcs run from the country of asylum/departure toward the country of origin.
- Resettlement arcs connect origin or nationality to the final arrival country; the origin is not necessarily the physical departure point.
- IDPs, returned IDPs, and naturalisation are excluded from international movement layers.
- Small published values may be rounded for confidentiality, so totals should be understood as approximate.

Map tiles: [OpenFreeMap](https://openfreemap.org/) using OpenMapTiles and OpenStreetMap data. Country geometry: World Bank Official Boundaries, normalized through the existing project data pipeline.

