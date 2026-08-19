#!/usr/bin/env python3
"""Build compact, validated Displacement Globe assets from UNHCR exports."""

from __future__ import annotations

import csv
import json
import math
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data/raw/unhcr"
GEOMETRY_SOURCE = ROOT / "data/raw/world-bank/geometry.geojson"
OUTPUT_DIR = ROOT / "public/data/displacement"
REPORT_PATH = ROOT / "data/processed/build-report.json"
START_YEAR = 2000
END_YEAR = 2025
YEARS = list(range(START_YEAR, END_YEAR + 1))

POPULATION_ARCHIVE = RAW_DIR / "population-2000-2025.zip"
APPLICATIONS_ARCHIVE = RAW_DIR / "asylum-applications-2000-2025.zip"
SOLUTIONS_ARCHIVE = RAW_DIR / "solutions-2000-2025.zip"

MODE_DEFINITIONS = {
    "hosted": "Refugees under UNHCR's mandate recorded in a country of asylum at the end of the year.",
    "claims": "New first-instance asylum applications reported as persons during the year.",
    "returns": "Refugees recorded as returning from a country of asylum to their country of origin during the year.",
    "resettlement": "Resettlement arrivals during the year, linked from country of origin to country of arrival.",
}


def write_json(path: Path, payload: Any, *, pretty: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as handle:
        json.dump(
            payload,
            handle,
            ensure_ascii=False,
            allow_nan=False,
            indent=2 if pretty else None,
            separators=None if pretty else (",", ":"),
        )
        handle.write("\n")
    temporary.replace(path)


def parse_count(raw: str) -> int:
    if raw in {"", "-"}:
        return 0
    value = int(raw)
    if value < 0:
        raise ValueError(f"Negative count encountered: {raw}")
    return value


def read_csv(archive_path: Path, member: str) -> Iterable[dict[str, str]]:
    with zipfile.ZipFile(archive_path) as archive, archive.open(member) as raw:
        lines = (line.decode("utf-8-sig") for line in raw)
        yield from csv.DictReader(lines)


def ring_centroid(ring: list[list[float]]) -> tuple[float, float, float]:
    twice_area = 0.0
    centroid_x = 0.0
    centroid_y = 0.0
    for start, end in zip(ring, ring[1:]):
        cross = start[0] * end[1] - end[0] * start[1]
        twice_area += cross
        centroid_x += (start[0] + end[0]) * cross
        centroid_y += (start[1] + end[1]) * cross
    if abs(twice_area) < 1e-9:
        points = ring[:-1] or ring
        return 0.0, sum(point[0] for point in points) / len(points), sum(point[1] for point in points) / len(points)
    return abs(twice_area / 2), centroid_x / (3 * twice_area), centroid_y / (3 * twice_area)


def geometry_center(geometry: dict[str, Any]) -> list[float]:
    if geometry["type"] == "Polygon":
        rings = [geometry["coordinates"][0]]
    elif geometry["type"] == "MultiPolygon":
        rings = [polygon[0] for polygon in geometry["coordinates"] if polygon]
    else:
        raise ValueError(f"Unsupported country geometry: {geometry['type']}")
    _, longitude, latitude = max((ring_centroid(ring) for ring in rings), key=lambda item: item[0])
    return [round(longitude, 4), round(latitude, 4)]


def load_geometry() -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    if not GEOMETRY_SOURCE.exists():
        raise FileNotFoundError(f"Missing geometry source: {GEOMETRY_SOURCE}")
    payload = json.loads(GEOMETRY_SOURCE.read_text(encoding="utf-8"))
    countries: dict[str, dict[str, Any]] = {}
    features = []
    for feature in payload.get("features", []):
        properties = feature.get("properties", {})
        iso3 = str(properties.get("iso3", "")).strip()
        if len(iso3) != 3 or not feature.get("geometry"):
            continue
        name = str(properties.get("name") or iso3)
        countries[iso3] = {"iso3": iso3, "name": name, "center": geometry_center(feature["geometry"])}
        features.append({
            "type": "Feature",
            "id": iso3,
            "properties": {"iso3": iso3, "name": name},
            "geometry": feature["geometry"],
        })
    if len(countries) < 190:
        raise ValueError(f"Geometry coverage unexpectedly low: {len(countries)}")
    return {"type": "FeatureCollection", "features": features}, countries


def valid_route(row: dict[str, str], countries: dict[str, dict[str, Any]], exclusions: dict[str, int]) -> tuple[str, str] | None:
    origin = row["Country of origin (ISO)"].strip()
    destination = row["Country of asylum (ISO)"].strip()
    if origin == destination:
        exclusions["sameCountry"] += 1
        return None
    if origin not in countries or destination not in countries:
        exclusions["unmappedCountry"] += 1
        return None
    return origin, destination


def add_route(target: dict[int, dict[tuple[str, str], int]], year: int, origin: str, destination: str, value: int) -> None:
    if START_YEAR <= year <= END_YEAR and value > 0:
        target[year][(origin, destination)] += value


def build_routes(countries: dict[str, dict[str, Any]]) -> tuple[dict[str, dict[int, dict[tuple[str, str], int]]], dict[str, int]]:
    routes = {mode: defaultdict(lambda: defaultdict(int)) for mode in MODE_DEFINITIONS}
    exclusions: dict[str, int] = defaultdict(int)

    for row in read_csv(POPULATION_ARCHIVE, "population.csv"):
        pair = valid_route(row, countries, exclusions)
        if pair:
            add_route(routes["hosted"], int(row["Year"]), *pair, parse_count(row["Refugees under UNHCR's mandate"]))

    for row in read_csv(APPLICATIONS_ARCHIVE, "asylum-applications.csv"):
        if row["Application type"] != "N" or row["Stage of procedure"] != "FI" or row["Cases / Persons"] != "P":
            exclusions["nonComparableApplication"] += 1
            continue
        pair = valid_route(row, countries, exclusions)
        if pair:
            add_route(routes["claims"], int(row["Year"]), *pair, parse_count(row["applied"]))

    for row in read_csv(SOLUTIONS_ARCHIVE, "solutions.csv"):
        pair = valid_route(row, countries, exclusions)
        if not pair:
            continue
        origin, asylum = pair
        add_route(routes["returns"], int(row["Year"]), asylum, origin, parse_count(row["Returned refugees"]))
        add_route(routes["resettlement"], int(row["Year"]), origin, asylum, parse_count(row["Resettlement arrivals"]))

    return routes, dict(exclusions)


def build_partition(
    year: int,
    mode: str,
    records: dict[tuple[str, str], int],
    index_by_iso3: dict[str, int],
) -> dict[str, Any]:
    route_rows = sorted(
        ([index_by_iso3[origin], index_by_iso3[destination], value] for (origin, destination), value in records.items()),
        key=lambda row: (-row[2], row[0], row[1]),
    )
    origins: dict[int, int] = defaultdict(int)
    destinations: dict[int, int] = defaultdict(int)
    for origin, destination, value in route_rows:
        origins[origin] += value
        destinations[destination] += value
    return {
        "year": year,
        "mode": mode,
        "global": sum(row[2] for row in route_rows),
        "max": route_rows[0][2] if route_rows else 0,
        "routes": route_rows,
        "origins": sorted(([country, value] for country, value in origins.items()), key=lambda row: -row[1]),
        "destinations": sorted(([country, value] for country, value in destinations.items()), key=lambda row: -row[1]),
    }


def main() -> None:
    for source in (POPULATION_ARCHIVE, APPLICATIONS_ARCHIVE, SOLUTIONS_ARCHIVE):
        if not source.exists():
            raise FileNotFoundError(f"Missing UNHCR source: {source}")

    geometry, country_map = load_geometry()
    countries = [country_map[iso3] for iso3 in sorted(country_map)]
    index_by_iso3 = {country["iso3"]: index for index, country in enumerate(countries)}
    route_data, exclusions = build_routes(country_map)

    expected_files = {f"{mode}.json" for mode in MODE_DEFINITIONS}
    years_dir = OUTPUT_DIR / "years"
    if years_dir.exists():
        for directory in years_dir.iterdir():
            if directory.is_dir() and (not directory.name.isdigit() or int(directory.name) not in YEARS):
                for path in directory.iterdir():
                    path.unlink()
                directory.rmdir()

    records_by_mode: dict[str, int] = {}
    for mode in MODE_DEFINITIONS:
        count = 0
        for year in YEARS:
            partition = build_partition(year, mode, route_data[mode][year], index_by_iso3)
            count += len(partition["routes"])
            write_json(OUTPUT_DIR / "years" / str(year) / f"{mode}.json", partition)
        records_by_mode[mode] = count

    for year in YEARS:
        year_dir = OUTPUT_DIR / "years" / str(year)
        for path in year_dir.glob("*.json"):
            if path.name not in expected_files:
                path.unlink()

    write_json(OUTPUT_DIR / "countries.json", {"countries": countries, "indexByIso3": index_by_iso3})
    write_json(OUTPUT_DIR / "geometry.geojson", geometry)
    generated_at = datetime.now(timezone.utc).isoformat()
    manifest = {
        "schemaVersion": 1,
        "years": YEARS,
        "modes": list(MODE_DEFINITIONS),
        "source": "UNHCR Refugee Population Statistics Database",
        "sourceUrl": "https://www.unhcr.org/refugee-statistics/",
        "methodologyUrl": "https://www.unhcr.org/refugee-statistics/methodology",
        "license": "CC BY 4.0",
        "releaseDate": "2026-06-11",
        "generatedAt": generated_at,
        "definitions": MODE_DEFINITIONS,
        "recordsByMode": records_by_mode,
        "exclusions": exclusions,
    }
    write_json(OUTPUT_DIR / "manifest.json", manifest, pretty=True)

    if not any(route_data["hosted"].values()):
        raise ValueError("Hosted route data is empty")
    report = {
        "status": "ok",
        "countries": len(countries),
        "years": [START_YEAR, END_YEAR],
        "recordsByMode": records_by_mode,
        "exclusions": exclusions,
        "sourceBytes": {
            path.name: path.stat().st_size
            for path in (POPULATION_ARCHIVE, APPLICATIONS_ARCHIVE, SOLUTIONS_ARCHIVE)
        },
        "generatedAt": generated_at,
    }
    write_json(REPORT_PATH, report, pretty=True)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

