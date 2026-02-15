#!/usr/bin/env python3
"""Fetch OSM data via Overpass API and convert to GeoJSON (POINTS ONLY).

Reads an Overpass QL query from query/playquery.ql, executes it against
multiple Overpass API endpoints with fallback, converts the response to
GeoJSON where every feature is a Point (nodes use lat/lon; ways/relations
use 'center' or bounds fallback), and writes data/novafunmap.geojson.

Zero external dependencies — stdlib only.

IMPORTANT:
Your Overpass query must include:  out center;
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

QUERY_FILE = "query/playquery.ql"
OUTPUT_FILE = "data/novafunmap.geojson"

DEFAULT_DROP_THRESHOLD = 50  # percent
DEFAULT_MAX_DATA_LAG_HOURS = 48
REQUEST_TIMEOUT = 180  # seconds


# ---------------------------------------------------------------------------
# Query reading
# ---------------------------------------------------------------------------

def read_query(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            query = f.read().strip()
    except FileNotFoundError:
        print(f"Error: Query file '{path}' not found.", file=sys.stderr)
        sys.exit(1)

    if not query:
        print(f"Error: Query file '{path}' is empty.", file=sys.stderr)
        sys.exit(1)

    compact = query.replace(" ", "").replace("\n", "").lower()
    if "outcenter" not in compact:
        print(
            "Warning: Query does not appear to include 'out center;'. "
            "Ways/relations may be skipped.",
            file=sys.stderr,
        )

    return query


# ---------------------------------------------------------------------------
# Overpass API fetching
# ---------------------------------------------------------------------------

def check_data_freshness(data, max_lag_hours):
    timestamp_str = data.get("osm3s", {}).get("timestamp_osm_base", "")
    if not timestamp_str:
        return True

    try:
        data_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        lag_hours = (now - data_time).total_seconds() / 3600
        return lag_hours <= max_lag_hours
    except Exception:
        return True


def fetch_overpass(query):
    max_lag_hours = float(
        os.environ.get("PLAYNOVA_MAX_DATA_LAG_HOURS", DEFAULT_MAX_DATA_LAG_HOURS)
    )
    encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")
    last_error = None

    for endpoint in OVERPASS_ENDPOINTS:
        print(f"Trying {endpoint} ...")
        try:
            req = urllib.request.Request(
                endpoint,
                data=encoded,
                headers={"User-Agent": "playnova/1.0"},
            )
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                body = resp.read().decode("utf-8")

            data = json.loads(body)

            if not check_data_freshness(data, max_lag_hours):
                print("  Data too stale, trying next server...", file=sys.stderr)
                continue

            print(f"  Success: {len(data.get('elements', []))} elements")
            return data

        except Exception as e:
            print(f"  Failed: {e}", file=sys.stderr)
            last_error = e
            continue

    print("Error: All Overpass endpoints failed.", file=sys.stderr)
    if last_error:
        print(f"Last error: {last_error}", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Convert elements to POINT GeoJSON
# ---------------------------------------------------------------------------

def element_to_feature_point(element):
    elem_type = element.get("type", "")
    elem_id = element.get("id", 0)
    tags = element.get("tags", {}) or {}

    properties = dict(tags)
    properties["@id"] = f"{elem_type}/{elem_id}"
    properties["@type"] = elem_type

    lon = None
    lat = None

    if elem_type == "node":
        lon = element.get("lon")
        lat = element.get("lat")

    elif elem_type in ("way", "relation"):
        center = element.get("center")
        if center:
            lon = center.get("lon")
            lat = center.get("lat")
        elif element.get("bounds"):
            b = element["bounds"]
            lon = (b["minlon"] + b["maxlon"]) / 2
            lat = (b["minlat"] + b["maxlat"]) / 2

    if lon is None or lat is None:
        return None

    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": properties,
    }


def elements_to_features(elements):
    features = []
    skipped = 0
    for element in elements:
        feature = element_to_feature_point(element)
        if feature:
            features.append(feature)
        else:
            skipped += 1

    if skipped:
        print(f"Skipped {skipped} elements without point geometry.", file=sys.stderr)

    return features


# ---------------------------------------------------------------------------
# Safety check
# ---------------------------------------------------------------------------

def check_feature_drop(new_count, output_path, threshold):
    if not os.path.exists(output_path):
        return

    try:
        with open(output_path, "r", encoding="utf-8") as f:
            existing = json.load(f)
        old_count = len(existing.get("features", []))
    except Exception:
        return

    if old_count == 0:
        return

    drop_pct = ((old_count - new_count) / old_count) * 100
    if drop_pct > threshold:
        print(
            f"SAFETY CHECK FAILED: {old_count} -> {new_count} "
            f"({drop_pct:.1f}% drop). Aborting.",
            file=sys.stderr,
        )
        sys.exit(1)


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def write_geojson(features, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    geojson = {"type": "FeatureCollection", "features": features}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
        f.write("\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    query = read_query(QUERY_FILE)
    data = fetch_overpass(query)

    elements = data.get("elements", [])
    features = elements_to_features(elements)

    if not features:
        print("Error: No usable POINT features returned.", file=sys.stderr)
        sys.exit(1)

    print(f"Converted {len(features)} features.")

    threshold = int(os.environ.get("PLAYNOVA_DROP_THRESHOLD", DEFAULT_DROP_THRESHOLD))
    check_feature_drop(len(features), OUTPUT_FILE, threshold)

    write_geojson(features, OUTPUT_FILE)
    print(f"Wrote {len(features)} features to {OUTPUT_FILE}.")


if __name__ == "__main__":
    main()

