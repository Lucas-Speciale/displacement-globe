# Displacement Globe

Status: research and planning only. No application code has been started.

## Working idea

Displacement Globe is the third project in a related series of interactive global data studies:

1. **Trade Atlas** explores what countries trade and with whom.
2. **Gridshift** explores how national electricity systems change over time.
3. **Displacement Globe** will explore how forced-displacement relationships change over time.

The experience should feel unmistakably related to the first two projects while having its own visual identity. It will use the same editorial typography, restrained colour language, interaction quality, data-first approach, and full-viewport presentation. Its distinguishing characteristics will be a dark interface, a rotatable globe, and animated origin-to-host relationships.

The working title is **Displacement Globe**. A more distinctive public name can be chosen after the first visual prototype proves the concept.

## Product goal

Create a single-screen, interactive globe that lets someone explore where forcibly displaced people come from, where they are hosted, and how those relationships change from year to year.

The user should be able to:

- Rotate and zoom the globe directly.
- Scrub through annual data from 2000 through 2025.
- Play and pause an automatic year-by-year transition.
- Change between several statistically distinct data modes.
- Click a country to focus on people leaving it or people hosted by it.
- Click or hover a visible route to inspect its origin, destination, value, year, and definition.
- Return to a legible global overview without encountering an unreadable ball of light.

The application should communicate through its visual behaviour and hierarchy. It should not require a narrated tour to explain every change.

## Core interpretation

The primary visualization is not a literal reconstruction of individual journeys. It is a representation of country-to-country statistical relationships.

The main **Refugees hosted** mode uses end-of-year stock data. An arc from Sudan to Chad means that people originating from Sudan were recorded as refugees in Chad at the end of that year. It does not mean that all of them travelled between those countries during that year, nor does it specify their physical route.

Annual transitions may interpolate visually between two published observations, but the interface must continue to display and report integer years. Interpolation is animation, not an estimate of monthly movement.

## Data source and scope

### Primary source

Use the [UNHCR Refugee Population Statistics Database](https://www.unhcr.org/refugee-statistics/methodology) through its [official Refugee Statistics API](https://api.unhcr.org/docs/refugee-statistics.html).

The API is open, does not require credentials, supports JSON and CSV responses, and includes country, region, year, population, asylum-application, and solutions data. The annual 2025 release was published on 11 June 2026.

The initial product window should be **2000–2025** because:

- Annual bilateral refugee stock data is rich during this period.
- Asylum-seeker data begins in 2000.
- A 26-year range is long enough to reveal major changes without making the timeline unwieldy.
- Recent years contain roughly six thousand bilateral population records per year, which is ample data for a global visualization but requires deliberate visual filtering.

The datasets are generally licensed under CC BY 4.0. The published attribution format is **“UNHCR Refugee Population Statistics Database.”** The source, release date, attribution, and methodological links must remain visible in the finished application. See UNHCR's [dataset terms](https://www.unhcr.org/asia/terms-use-datasets).

### Included and excluded categories

Include only the population categories required by a named mode. Never sum unlike categories into a vague “displaced people” total.

- Refugees and people in refugee-like situations may be included in the hosted-refugee definition, following UNHCR's published refugee definition.
- Internally displaced people must not appear as international routes because they have not crossed an international border.
- Stateless populations must not be treated as routes without a meaningful origin-to-host relationship.
- Naturalisation is a legal status change, not geographic movement, and is excluded from the route modes.
- Returned IDPs are internal movements and are excluded from this international globe.
- Unknown, aggregate, historical, and non-geographic country codes require an explicit crosswalk policy. Records that cannot be placed honestly on the globe should be excluded from route rendering and counted in the build report.

UNHCR's [data-content guidance](https://www.unhcr.org/refugee-statistics/methodology/data-content) distinguishes end-of-year population **stocks** from annual solutions **flows** and explains how “country of asylum” changes meaning for returns and resettlement. Its [common-mistakes guidance](https://www.unhcr.org/refugee-statistics/insights/explainers/common-mistakes-forcibly-displaced-data.html) should be treated as a data-product requirement, not optional reading.

### Privacy and precision

UNHCR safeguards small counts by rounding values below five to the nearest multiple of five, and some decision values are rounded between five and ten. Totals should therefore be presented as published figures and understood as approximate. The interface must not imply person-level precision.

## Data modes and visual grammar

Each mode should look related but should not reuse an identical animation with a new colour. Its motion must match what the underlying statistic means.

### 1. Refugees hosted — primary mode

Meaning: end-of-year refugee population stock by origin and country of asylum.

Visual treatment:

- Radial bars rise from host countries to show total people hosted at the end of the selected year.
- Fine, persistent arcs connect origins to hosts and explain the composition of those totals.
- Small corridors are hairlines; larger corridors become brighter and wider using a square-root or logarithmic scale.
- Bars and arcs ease between annual snapshots when the year changes.
- There are no continuously travelling particles in the default stock view, because that would falsely imply annual journeys.
- Selecting a host highlights inbound arcs; selecting an origin highlights outbound arcs.
- A selected host bar may resolve into a compact origin composition treatment, provided it remains part of the globe rather than becoming a separate chart dashboard.

### 2. New asylum claims

Meaning: applications for international protection recorded during the selected year, by origin and asylum country.

Visual treatment:

- Short directional pulses move along subdued application corridors.
- Destination points briefly expand as pulses arrive.
- Routes fade after each pulse rather than appearing as accumulated stock.
- Interface language must say “applications” or “application corridors,” not “people who moved.”

Data rule to settle during the data audit:

- Separate new applications from repeat applications and appeals.
- Do not add records measured as people to records measured as cases without a defensible published conversion.
- Document the chosen procedure and application-type filters in the manifest and guide.

### 3. Returns

Meaning: refugees recorded as returning during the selected year.

Visual treatment:

- Direction reverses from the country of asylum/departure toward the country of origin.
- Arrival rings or a restrained pulse make the returning direction evident.
- This mode may use clearer motion because it is annual flow data.

### 4. Resettlement

Meaning: refugees recorded as arriving in a resettlement country during the selected year.

Visual treatment:

- Dotted or segmented arcs distinguish resettlement from the other modes.
- Motion travels toward the country of arrival.
- Copy must clarify that the origin field represents nationality/country of origin; it does not necessarily identify the country from which the person physically departed.

## Preventing the “glowing ball” problem

The globe should allow a fine network to accumulate into an atmospheric visual pattern, but legibility takes priority over showing every record simultaneously.

Use a layered level-of-detail strategy:

1. **Global view:** render a capped set of the largest or most consequential corridors for the selected year and mode.
2. **Zoomed view:** admit more routes as screen space becomes available.
3. **Country focus:** show the selected country's meaningful inbound or outbound network, even when some routes fall below the global threshold.
4. **Hovered/selected route:** isolate the route and its endpoints while dimming unrelated geometry.

Recommended starting limits for the rendering prototype:

- Desktop global view: approximately 40–80 active arcs.
- Mobile global view: approximately 20–40 active arcs.
- Country focus: top 20–40 relevant corridors, with the exact count governed by density and performance.
- Very small values remain visible through the selected-country view or readout, not necessarily in the global weave.

The final selection rule should combine rank, value, year-over-year change, and screen-space density. A simple fixed raw-value cutoff will hide important corridors in quieter years.

Use low-opacity, sub-pixel-capable lines and capped additive/screen-like blending to let genuine concentrations become brighter. Do not make every arc independently luminous. Avoid route bundling in the first version because artificial control points can imply false geography. Natural overlap, route selection, and level of detail should be tested first.

## Interface layout

The application is one unified, full-viewport map stage, following the first Trade Atlas screen rather than a dashboard of separate cards.

### Map stage

- The MapLibre canvas fills `100vw × 100svh`.
- The globe is initially framed at a useful global scale with atmosphere visible around it.
- Drag rotates the globe; wheel/pinch zooms; country polygons remain clickable.
- Country fills are quiet and dark, borders are clearly legible, and labels render above data layers where possible.
- Map attribution remains visible and is positioned so it never conflicts with the timeline or legend.

### Top-left brand overlay

- Series eyebrow, consistent with the other projects.
- Large Georgia title.
- One short line describing the active mode or selected country.
- Transparent or very lightly frosted presentation; it should feel printed over the map rather than placed in a floating bubble.

### Top-right mode dock

- A compact segmented control for Hosted, Claims, Returns, and Resettlement.
- A global/focused-state control when a country is selected: **Leaving** and **Hosted here** where meaningful.
- A restrained guide/info button and data-source access.
- This is an overlay dock, not a separate application panel.

### Selection overlay

- Clicking a country reveals a concise edge-aligned overlay with country name, total, rank, change from the previous year, and the leading corridors.
- Clicking a route replaces or refines this content with origin, destination, year, value, and definition.
- The overlay should close cleanly and return the globe to global context.
- On small screens it may become a shallow bottom sheet above the timeline.

### Bottom timeline

- A wide timeline is anchored across the bottom of the viewport.
- Play/pause/replay is large enough to discover and operate easily.
- The current year is visually prominent in Georgia.
- The range input uses discrete integer years from 2000 to 2025.
- Playback animates the transition between annual snapshots, settles on each year, then advances.
- Scrubbing immediately pauses playback.
- The source/attribution and a minimal guide control sit at the edge without competing with the primary controls.

### Legend

- A single compact overlay explains the current mode's width, bar, colour, and direction encodings.
- It changes with the mode.
- It must never overlap MapLibre/OpenFreeMap attribution.

## Visual system

The project is dark, but it remains part of the same family as Trade Atlas and Gridshift.

### Shared family traits

- Georgia / Times-style serif for titles, years, and important numbers.
- Inter / system sans-serif for controls, labels, and explanatory copy.
- Small uppercase terracotta eyebrows with generous letter spacing.
- The same compact type scale, focus treatment, corner language, and editorial tone.
- The same familiar accent family: terracotta, deep green, muted blue, gold, and restrained violet.

### Dark adaptation

Initial design tokens to test, not final approved colours:

- Background/space: `#09110f` to `#0d1714`.
- Land: `#17231f` with subtle tonal variation.
- Primary text: `#f7f4eb`.
- Muted text: `#a1ada8`.
- Borders/grid: translucent `#d9ded9` at low opacity.
- Terracotta accent: `#d96f47` or a slightly lifted dark-mode variant.
- Green: `#4f8b78`.
- Blue: `#4b8fa8`.
- Gold: `#d9a83f`.
- Violet: `#8076a8`.
- Overlay surface: translucent near-black green with restrained blur.

Use [OpenFreeMap's dark style](https://tiles.openfreemap.org/styles/dark) as the initial basemap so the project retains the same provider, OpenMapTiles/OSM foundation, MapLibre attribution pattern, and interaction model as the first two projects. Add the same normalized World Bank country geometry above the basemap for dependable ISO matching, clear borders, hover, and click selection.

OpenFreeMap notes that its Dark style is less actively harmonized than Liberty, so the first visual pass must verify labels, border contrast, projection behaviour, and unnecessary POI clutter. If necessary, keep a local, attributed style JSON with only presentation-level changes; do not change map providers merely to obtain a dark palette.

## Technical architecture

### Reuse from Trade Atlas and Gridshift

Retain the proven project shape:

- Next.js static export.
- React and strict TypeScript.
- Direct MapLibre GL JS integration rather than an additional React map wrapper.
- D3 scale utilities for widths, heights, opacity, and colour.
- Offline Python data build.
- Immutable, compact browser assets under `public/data/`.
- Raw source downloads and build reports ignored by Git.
- Vitest unit tests and ESLint.
- pnpm, Node.js 22 in CI, and Cloudflare Pages deployment only after the prototype is approved.
- No production database and no runtime dependency on the UNHCR API.

The current sibling projects use Next.js 16.3, React 19.2, MapLibre GL JS 6.4, TypeScript 6, D3 Scale 4, D3 Scale Chromatic 3, Vitest 4, and ESLint 9. New work should begin from these versions unless installation reveals a concrete compatibility reason to update the entire series.

### New rendering dependency

Add only the focused deck.gl modules needed for the visualization:

- `@deck.gl/core`
- `@deck.gl/layers`
- `@deck.gl/mapbox`

Preferred rendering composition:

```text
React application shell and state
              ↓
MapLibre GL JS globe + OpenFreeMap dark vector style
              ↓ shared globe camera / WebGL context
deck.gl MapboxOverlay
              ↓
ArcLayer + ColumnLayer + minimal point/pulse layer
```

MapLibre GL JS supports a native globe through `map.setProjection({ type: "globe" })`, along with globe atmosphere, fill extrusions, country layers, interaction, and custom 3D layers. See MapLibre's [globe custom-layer example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-simple-custom-layer-on-a-globe/) and [globe developer guide](https://github.com/maplibre/maplibre-gl-js/blob/main/developer-guides/globe.md).

deck.gl's [`MapboxOverlay`](https://deck.gl/docs/api-reference/mapbox/mapbox-overlay) supports MapLibre in overlaid or interleaved mode and switches to a synchronized GlobeView for MapLibre's globe projection. [`ArcLayer`](https://deck.gl/docs/api-reference/layers/arc-layer) provides GPU-rendered, pickable, width-scaled arcs; `ColumnLayer` provides radial bars.

Use interleaved mode first so arcs and bars share depth with the globe and can be placed below label layers. Set globe-appropriate culling explicitly as recommended by the ArcLayer documentation.

Do not adopt Globe.GL or a standalone Three.js globe for the initial architecture. Those libraries are visually capable, but they would replace the mapping, labels, country selection, attribution, and camera architecture already proven across the series. Three.js remains a fallback only if the focused MapLibre/deck.gl spike exposes an unsolved blocker.

Do not adopt flowmap.gl initially. Its aggregation ideas are useful research, but deck.gl's core layers are sufficient for the first globe and introduce fewer dependencies. Revisit it only if route aggregation becomes a demonstrated problem rather than a hypothetical one.

### Known rendering risk

deck.gl documents MapLibre globe support, but there is a recent open issue describing interleaved-globe artifacts for large `ScatterplotLayer` circles. This may affect endpoint halos or point markers, not necessarily arcs, but it makes an isolated rendering spike mandatory before building the product shell.

The spike must verify:

- Arc alignment while rotating, zooming, and crossing the antimeridian.
- Correct horizon clipping and back-face culling.
- Arc picking on the near side without selecting hidden routes.
- Column orientation and depth on the globe.
- Label ordering above data layers.
- Small endpoint markers without z-fighting.
- MapLibre 6.4 and the selected deck.gl version on current Chrome, Safari, Firefox, and mobile Safari.
- Stable animation at the target route counts.

Fallback order if a layer is unstable:

1. Change only that layer from interleaved to a more robust treatment.
2. Replace problematic point halos with MapLibre-native symbols or circles.
3. Implement a narrow MapLibre custom WebGL layer based on the official globe example.
4. Consider a Three.js custom layer only after the smaller alternatives fail.

### React and map ownership

- Create the MapLibre map exactly once in a client component.
- Keep the mutable map and deck overlay in refs.
- Keep semantic UI state in React: mode, selected year, playing state, selected country, focus direction, and selected route.
- Update deck layers through `overlay.setProps()` rather than destroying and recreating the map.
- Separate pure data selection and scaling functions from rendering components so they can be unit tested.
- Cancel animation frames, timers, fetches, and WebGL resources during cleanup.
- Respect `prefers-reduced-motion`: no autoplay, no continuous pulses, and near-instant annual transitions.

Suggested component boundaries:

```text
src/app/
  layout.tsx
  page.tsx
  globals.css
src/components/
  DisplacementExplorer.tsx   # data loading and semantic state
  DisplacementGlobe.tsx      # MapLibre lifecycle and interaction
  DisplacementLayers.ts      # deck.gl layer construction
  ModeDock.tsx
  CountryFocus.tsx
  DisplacementTimeline.tsx
  DisplacementGuide.tsx
src/lib/
  data.ts                    # fetch/cache browser assets
  flows.ts                   # selection, aggregation, direction
  interpolation.ts
  scales.ts
  format.ts
  countries.ts
src/types/
  displacement.ts
scripts/
  build_data.py
```

The exact names can change, but map lifecycle, pure transformation logic, and UI overlays should not be collapsed into one oversized explorer component.

## Data pipeline

Download and normalize UNHCR data offline. Production should serve static assets rather than calling the API from every visitor's browser.

```text
UNHCR API snapshots
        ↓
Python validation and normalization
        ↓
Country-code crosswalk + geographic coordinates
        ↓
Per-year, per-mode compact route partitions
        ↓
Next.js static export / Cloudflare CDN
```

Proposed directories:

```text
data/raw/unhcr/                         # ignored source snapshots
data/raw/world-bank/                    # ignored boundary source
data/processed/build-report.json        # ignored validation report
public/data/displacement/
  manifest.json
  countries.json
  geometry.geojson
  years/2000/hosted.json
  years/2000/claims.json
  years/2000/returns.json
  years/2000/resettlement.json
  ...
  years/2025/...
```

Compact route representation should use indexed country IDs rather than repeating ISO codes and names in every record. A conceptual record is:

```text
[originCountryIndex, destinationCountryIndex, value]
```

The manifest should include:

- Available years and modes.
- Field ordering and schema version.
- UNHCR release date and download/build timestamps.
- Dataset attribution and license.
- Exact population definitions and application filters.
- Per-mode global totals and record counts.
- Excluded record counts by reason.
- Recommended display thresholds or ranks, if precomputed.
- Source URLs and methodology URLs.

The browser initially loads the manifest, country index, and geometry. It then loads the current and next year for the active mode and prefetches adjacent years during playback. Cache completed requests in memory and abort obsolete requests during rapid scrubbing.

### Build validation

The build must fail on:

- Duplicate origin/destination/year records after the expected aggregation step.
- Negative or non-finite counts.
- Unknown country codes without an explicit exclusion/crosswalk rule.
- Missing required years or modes.
- Mixed asylum application units that would be summed incorrectly.
- A direction rule inconsistent with the selected dataset.
- Totals that do not reconcile with the normalized source within documented rounding behaviour.

The build report should preserve enough information to audit exclusions and compare releases without committing the raw dataset.

## Interaction and animation model

### Global exploration

- The initial view slowly invites rotation but does not auto-spin continuously once the user interacts.
- Hovering an arc strengthens it and both endpoints.
- Clicking a country stops playback and enters country focus.
- Clicking empty space clears focus.
- Changing mode retains the selected country only if that country has meaningful records in the new mode.

### Timeline

- The data year is always an integer.
- Playback advances one year at a time with a short eased transition and a readable hold.
- The animation loop stops at 2025 and offers Replay.
- Dragging the slider previews and then settles the chosen year without queueing obsolete transitions.
- Route widths, bar heights, and opacity interpolate; ranked route membership cross-fades to prevent popping.

### Country focus

- **Leaving** makes the selected country the origin and shows destinations.
- **Hosted here** makes it the destination and shows origins.
- The unavailable direction is disabled rather than showing an unexplained empty state.
- Country focus can raise the route limit because unrelated routes are dimmed or removed.

## Performance budget

Targets for the first production-quality version:

- Maintain approximately 60 fps on a modern desktop during rotation and normal playback.
- Remain comfortably interactive on recent mobile hardware, with reduced route counts and effects.
- Avoid allocating new route objects on every animation frame; update only when mode/year/selection changes.
- Use GPU attribute transitions where stable.
- Keep the initial app shell and manifest small; lazy-load route partitions.
- Use compressed static JSON and immutable CDN caching.
- Do not add Three.js, Globe.GL, a state-management library, or a charting framework unless a measured requirement justifies it.

Rendering quality should degrade gracefully:

- Reduce route count first.
- Reduce pulse/halo effects second.
- Preserve country interaction, year controls, and exact readouts.

## Accessibility and ethical presentation

- Every mode and control must be usable with a keyboard.
- Use a native range input beneath any custom timeline styling.
- Provide a persistent pause control and respect reduced-motion preferences.
- Ensure dark-mode text, borders, and focus rings meet useful contrast levels.
- Do not rely on colour alone for mode or direction; combine colour with line treatment and motion direction.
- Route details must be reachable by click/focus, not hover only.
- Provide a concise semantic list inside the selected-country overlay so the data remains understandable beyond the WebGL canvas.
- Avoid celebratory fireworks, frantic particle swarms, or language that turns displacement into spectacle.
- Use subdued motion, factual terminology, and clear distinctions between stocks, applications, returns, and resettlement.

## Testing strategy

### Unit tests

- Country-code normalization and historical/aggregate exclusions.
- Stock versus flow direction.
- Asylum application filtering and unit handling.
- Route ranking and level-of-detail selection.
- Width, height, and opacity scaling.
- Annual interpolation, including missing values and route appearance/disappearance.
- Selected-country inbound/outbound filtering.
- Formatting and rounding language.

### Integration and manual checks

- Map initializes only once and disposes cleanly.
- Globe rotation, zoom, picking, and resize remain aligned.
- All modes update the timeline, legend, readout, and layer treatment together.
- Rapid scrubbing does not display stale partitions.
- Pausing freezes all motion.
- Reduced-motion mode remains fully functional.
- Attribution is visible at desktop and mobile sizes.
- No overlay collisions at wide, short, tablet, and phone viewports.
- Production static export runs without runtime API access.

## Delivery phases

### Phase 0 — rendering proof

Build an isolated, disposable-quality proof inside the real project architecture:

- OpenFreeMap dark globe.
- Clear country outlines and click selection.
- A small fixed sample of ArcLayer routes.
- A small fixed sample of host columns.
- Rotation, picking, label order, horizon clipping, and performance checks.

Do not proceed to full UI work until this passes.

### Phase 1 — data pipeline

- Download official snapshots.
- Lock exact definitions and filters.
- Build country crosswalk and compact partitions.
- Add validation report and tests.

### Phase 2 — primary hosted experience

- Full-viewport globe and overlays.
- Hosted bars and stock arcs.
- Discrete timeline and playback.
- Global and selected-country views.
- Responsive and reduced-motion behaviour.

### Phase 3 — annual flow modes

- New asylum applications.
- Returns.
- Resettlement.
- Mode-specific legends, motion, definitions, and tests.

### Phase 4 — refinement

- Visual density tuning and route cross-fades.
- Mobile performance profiling.
- First-open guide and data methodology panel.
- Accessibility pass.
- Cross-browser visual QA.
- Final naming and series-level identity review.

### Phase 5 — publishing, only after approval

- Create the independent Git repository.
- Add CI validation and Cloudflare Pages deployment using the sibling pattern.
- Add the project to the main personal site.
- Keep raw datasets out of Git; commit only validated browser-ready partitions.

## Decisions currently recommended

- **Working title:** Displacement Globe.
- **Subject:** forced displacement, not general immigration.
- **Time range:** 2000–2025.
- **Primary mode:** refugees hosted at year end.
- **Primary map engine:** MapLibre GL JS globe.
- **Data renderer:** focused deck.gl modules through MapboxOverlay.
- **Basemap:** OpenFreeMap Dark, supplemented with normalized World Bank country geometry.
- **Application architecture:** static Next.js export matching Trade Atlas and Gridshift.
- **Data architecture:** offline UNHCR snapshot build with compact per-year/per-mode assets.
- **Layout:** one full-screen globe with overlays, not a multi-card dashboard.
- **Motion:** meaningful per-mode animation, discrete annual semantics, and reduced-motion support.
- **First implementation step:** a narrow globe/arc/column compatibility and performance proof.

## Questions to answer during the first data and rendering spikes

1. Does the selected deck.gl release render ArcLayer and ColumnLayer cleanly with MapLibre 6.4 on mobile Safari?
2. Are stock arcs clearer with a small altitude related to geographic distance, or a constant low altitude?
3. Should global route selection prioritise absolute value, year-over-year change, or a balanced score?
4. Which asylum application procedure and unit filters preserve the widest comparable coverage without mixing cases and people?
5. Does OpenFreeMap Dark provide enough country-label and border clarity on the globe, or should a locally hosted style remove roads/POIs and strengthen administrative context?
6. Should hosted bars represent refugees only, or refugees plus another explicitly named protection category? The title and legend must match the chosen definition exactly.
7. What public-facing name best fits Trade Atlas and Gridshift after the interaction has a visual personality?

## Research references

- [MapLibre GL JS overview and globe support](https://maplibre.org/projects/gl-js/)
- [MapLibre globe custom-layer example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-simple-custom-layer-on-a-globe/)
- [MapLibre globe projection developer guide](https://github.com/maplibre/maplibre-gl-js/blob/main/developer-guides/globe.md)
- [deck.gl integration with MapLibre](https://deck.gl/docs/developer-guide/base-maps/using-with-maplibre)
- [deck.gl MapboxOverlay](https://deck.gl/docs/api-reference/mapbox/mapbox-overlay)
- [deck.gl ArcLayer](https://deck.gl/docs/api-reference/layers/arc-layer)
- [deck.gl GreatCircleLayer](https://deck.gl/docs/api-reference/geo-layers/great-circle-layer)
- [OpenFreeMap styles and dark style](https://github.com/hyperknot/openfreemap-styles)
- [UNHCR Refugee Statistics methodology](https://www.unhcr.org/refugee-statistics/methodology)
- [UNHCR Refugee Statistics API](https://api.unhcr.org/docs/refugee-statistics.html)
- [UNHCR data content and structure](https://www.unhcr.org/refugee-statistics/methodology/data-content)
- [UNHCR common data mistakes](https://www.unhcr.org/refugee-statistics/insights/explainers/common-mistakes-forcibly-displaced-data.html)
- [UNHCR dataset terms](https://www.unhcr.org/asia/terms-use-datasets)
- [deck.gl repository](https://github.com/visgl/deck.gl)
- [flowmap.gl repository, reviewed for aggregation ideas](https://github.com/visgl/flowmap.gl)
- [Globe.GL repository, reviewed as an alternative rather than the recommended foundation](https://github.com/vasturiano/globe.gl)
