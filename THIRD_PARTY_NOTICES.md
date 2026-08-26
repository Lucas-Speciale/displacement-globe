# Third-party notices

Displacement Globe combines original application code and visual design with the following third-party materials. The repository's `LICENSE` applies only to original materials and does not replace these terms.

## UNHCR Refugee Population Statistics Database

The generated displacement files in `public/data/displacement/` are derived from the [UNHCR Refugee Population Statistics Database](https://www.unhcr.org/refugee-statistics/).

- Source: UNHCR Refugee Population Statistics Database
- License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/), except where UNHCR indicates otherwise
- Attribution: “UNHCR Refugee Population Statistics Database”
- Changes: Source exports are filtered to the supported years and population categories, joined to country identifiers, validated, and converted into compact annual route partitions. Derived calculations and presentation are Displacement Globe's own.

Users should review [UNHCR's dataset terms](https://www.unhcr.org/what-we-do/data-and-publications/data-and-statistics/terms-use-datasets) before redistributing the generated data.

## World Bank Official Boundaries

The generated `public/data/displacement/geometry.geojson` file is derived from [World Bank Official Boundaries](https://datacatalog.worldbank.org/search/dataset/0038272/world-bank-official-boundaries). Geometry is normalized and reduced to the fields required by the application. Users should consult the dataset page for its current license and terms.

## Basemap and mapping libraries

- Map style and tiles: [OpenFreeMap](https://openfreemap.org/)
- Vector tile schema and styles: [OpenMapTiles](https://openmaptiles.org/)
- Map data: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- Rendering libraries: [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) and [deck.gl](https://deck.gl/)

Map attribution is also displayed in the application. JavaScript dependencies retain the licenses included with their respective packages.
