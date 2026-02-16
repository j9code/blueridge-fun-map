#!/usr/bin/env python3
"""Fetch OSM data via Overpass API and convert to GeoJSON (POINTS ONLY).

Reads an Overpass QL query from query/playquery.ql, executes it against
multiple Overpass API endpoints with fallback, converts the response to
GeoJSON where every feature is a Point (nodes use lat/lon; ways/relations
use 'center' or bounds fallback), and writes data/funmap.geojson.

Zero external dependencies — stdlib only.

IMPORTANT:
Your Overpass query must include:  out center;
"""

import json
import os
import sys
import time
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
OUTPUT_FILE = "data/funmap.geojson"

DEFAULT_DROP_THRESHOLD = 50  # percent
DEFAULT_MAX_DATA_LAG_HOURS = 48
REQUEST_TIMEOUT = 180  # seconds

# Retry behavior: if ALL endpoints fail, wait 60 minutes and try again once.
RETRY_ROUNDS = 2                 # total rounds (initial + 1 retry)
RETRY_DELAY_SECONDS = 60 * 60    # 60 minutes

# Generic env var names
ENV_DROP_THRESHOLD = "FUNMAP_DROP_THRESHOLD"
ENV_MAX_DATA_LAG_HOURS = "FUNMAP_MAX_DATA_LAG_HOURS"
ENV_USER_AGENT = "FUNMAP_USER_AGENT"


# ---------------------------------------------------------------------------
# Query reading
# ---------------------------------------------------------------------------

def read_query(path: str) -> str:
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

def check_data_freshness(data: dict, max_lag_hours: float) -> bool:
    timestamp_str = data.get("osm3s", {}).get("timestamp_osm_base", "")
    if not timestamp_str:
        return True

    try:
        data_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        lag_hours = (now - data_time).total_seconds() / 3600
        return lag_hours <= max_lag_hours
    except Exception:
        # If we can't parse the timestamp, don't fail the whole run.
        return True


def fetch_overpass(query: str) -> dict:
    max_lag_hours = float(os.environ.get(ENV_MAX_DATA_LAG_HOURS, DEFAULT_MAX_DATA_LAG_HOURS))
    user_agent = os.environ.get(ENV_USER_AGENT, "funmap-fetch/1.0")
    encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")

    last_error = None
    last_endpoint = None

    for round_idx in range(RETRY_ROUNDS):
        if round_idx > 0:
            print(
                f"All endpoints failed. Waiting {RETRY_DELAY_SECONDS // 60} minutes "
                f"then retrying ({round_idx + 1}/{RETRY_ROUNDS})...",
                file=sys.stderr,
                flush=True,
            )
            time.sleep(RETRY_DELAY_SECONDS)

        for endpoint in OVERPASS_ENDPOINTS:
            print(f"Trying {endpoint} ...", flush=True)
            try:
                req = urllib.request.Request(
                    endpoint,
                    data=encoded,
                    headers={"User-Agent": user_agent},
                )
                with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                    body = resp.read().decode("utf-8")

                data = json.loads(body)

                if not check_data_freshness(data, max_lag_hours):
                    print("  Data too stale, trying next server...", file=sys.stderr, flush=True)
                    continue

                print(f"  Success: {len(data.get('elements', []))} elements", flush=True)
                retur
