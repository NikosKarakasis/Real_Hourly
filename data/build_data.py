"""Build Real Hourly's data files from real NYC TLC Uber/Lyft trip records.

Reads the public High Volume For-Hire Vehicle (HVFHV) parquet straight over HTTPS
with DuckDB (only the columns we need are fetched), then writes small JSON files
the web app loads:

  web/public/data/slots.json        168 hour-of-week slots with real pay stats
  web/public/data/demo_driver.json  a demo driver's week built from real sampled trips

Usage:  python data/build_data.py [YYYY-MM]
"""

import json
import sys
from pathlib import Path

import duckdb

MONTH = sys.argv[1] if len(sys.argv) > 1 else "2026-07"
URL = f"https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_{MONTH}.parquet"
OUT = Path(__file__).resolve().parent.parent / "web" / "public" / "data"
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# Demo driver: a common side-hustle schedule. Late weeknights after a day job
# (Mon-Thu 11pm-3am) plus early weekend mornings (Sat/Sun 5-9am). 24 hours/week.
# Each entry: (day index 0=Mon, start hour, end hour exclusive). Overnight shifts are split at midnight.
DEMO_SHIFTS = ([(d, 23, 24) for d in range(4)] + [(d, 0, 3) for d in range(1, 5)]
               + [(5, 5, 9), (6, 5, 9)])

con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs;")
print(f"Reading {URL} ...")

# One clean trips view. Engaged time = request -> dropoff (driving to pickup,
# waiting, and the ride itself). Idle time between rides is NOT in the data.
con.execute(f"""
CREATE OR REPLACE TEMP TABLE trips AS
SELECT
  hvfhs_license_num                                   AS company,
  pickup_datetime,
  (isodow(pickup_datetime) - 1)::INT                  AS dow,
  hour(pickup_datetime)::INT                          AS hr,
  driver_pay + tips                                   AS earn,
  driver_pay,
  tips,
  trip_miles,
  date_diff('second', request_datetime, dropoff_datetime) / 60.0 AS engaged_min
FROM read_parquet('{URL}')
WHERE hvfhs_license_num IN ('HV0003', 'HV0005')
  AND driver_pay > 0 AND trip_time > 0 AND trip_miles > 0
  AND request_datetime IS NOT NULL
  AND date_diff('second', request_datetime, dropoff_datetime) BETWEEN 120 AND 3 * 3600
  AND strftime(pickup_datetime, '%Y-%m') = '{MONTH}'
""")

n_trips = con.execute("SELECT count(*) FROM trips").fetchone()[0]
cap = con.execute("SELECT quantile_cont(earn, 0.999) FROM trips").fetchone()[0]
con.execute(f"DELETE FROM trips WHERE earn > {cap}")
print(f"{n_trips:,} clean trips (earnings capped at 99.9th pct ${cap:.2f})")

# How many of each weekday occur in the month, to turn totals into per-hour averages.
day_counts = dict(con.execute(f"""
  SELECT (isodow(d) - 1)::INT, count(*) FROM (
    SELECT unnest(generate_series(DATE '{MONTH}-01',
                  last_day(DATE '{MONTH}-01'), INTERVAL 1 DAY)) AS d)
  GROUP BY 1""").fetchall())

rows = con.execute("""
SELECT dow, hr,
  count(*)                                   AS trips,
  median(earn)                               AS median_earn,
  quantile_cont(earn, 0.25)                  AS p25_earn,
  quantile_cont(earn, 0.75)                  AS p75_earn,
  avg(tips)                                  AS avg_tip,
  sum(earn) / sum(engaged_min)               AS earn_per_engaged_min,
  sum(trip_miles) / sum(engaged_min)         AS paid_miles_per_engaged_min,
  avg(engaged_min)                           AS avg_engaged_min,
  avg(trip_miles)                            AS avg_miles
FROM trips GROUP BY dow, hr ORDER BY dow, hr
""").fetchall()
cols = ["dow", "hr", "trips", "median_earn", "p25_earn", "p75_earn", "avg_tip",
        "earn_per_engaged_min", "paid_miles_per_engaged_min", "avg_engaged_min", "avg_miles"]

slots = []
for r in rows:
    s = dict(zip(cols, r))
    s["trips_per_hour"] = s["trips"] / day_counts[s["dow"]]
    slots.append(s)
mean_tph = sum(s["trips_per_hour"] for s in slots) / len(slots)
for s in slots:
    s["demand_index"] = s["trips_per_hour"] / mean_tph
    for k, v in list(s.items()):
        if isinstance(v, float):
            s[k] = round(v, 4)

summary = dict(zip(
    ["median_earn", "median_driver_pay", "avg_tip", "avg_miles", "avg_engaged_min"],
    con.execute("""SELECT median(earn), median(driver_pay), avg(tips),
                          avg(trip_miles), avg(engaged_min) FROM trips""").fetchone()))
summary = {k: round(v, 2) for k, v in summary.items()}

OUT.mkdir(parents=True, exist_ok=True)
(OUT / "slots.json").write_text(json.dumps({
    "month": MONTH,
    "source": URL,
    "trip_count": n_trips,
    "summary": summary,
    "slots": slots,
}, indent=1))

# --- Demo driver: fill each shift with real trips sampled from that exact slot. ---
# Trips per shift-hour follows the same utilization model the app uses (see calc.ts).
BASE_UTIL = 0.6


def util_for(slot):
    return max(0.4, min(0.85, BASE_UTIL * slot["demand_index"] ** 0.3))


slot_map = {(s["dow"], s["hr"]): s for s in slots}
demo_trips = []
for d, start, end in DEMO_SHIFTS:
    for h in range(start, end):
        s = slot_map[(d, h)]
        n = max(1, round(util_for(s) * 60 / s["avg_engaged_min"]))
        # SAMPLE applies to the FROM relation, so filter in a subquery first.
        sample = con.execute(f"""
          SELECT strftime(pickup_datetime, '%Y-%m-%d %H:%M') AS t, round(driver_pay, 2),
                 round(tips, 2), round(trip_miles, 2), round(engaged_min, 1),
                 CASE company WHEN 'HV0003' THEN 'Uber' ELSE 'Lyft' END
          FROM (SELECT * FROM trips WHERE dow = {d} AND hr = {h})
          USING SAMPLE reservoir({n} ROWS) REPEATABLE (42)
          ORDER BY 1""").fetchall()
        for t in sample:
            demo_trips.append(dict(zip(
                ["pickup", "driver_pay", "tips", "miles", "engaged_min", "app"], t),
                dow=d, hr=h))

hours = sum(e - s for _, s, e in DEMO_SHIFTS)
gross = sum(t["driver_pay"] + t["tips"] for t in demo_trips)
(OUT / "demo_driver.json").write_text(json.dumps({
    "name": "Maria",
    "car": "medium_sedan",
    "blurb": "Drives a Toyota Camry in Queens after her day job: late weeknights (11pm–3am) and early weekend mornings.",
    "shifts": [{"dow": d, "start": s, "end": e} for d, s, e in DEMO_SHIFTS],
    "hours": hours,
    "gross": round(gross, 2),
    "trips": demo_trips,
}, indent=1))

# --- Sanity output ---
print(f"\nMonth summary: {summary}")
ranked = sorted(slots, key=lambda s: s["earn_per_engaged_min"] * util_for(s), reverse=True)
fmt = lambda s: (f"  {DAYS[s['dow']]} {s['hr']:02d}:00  ${s['earn_per_engaged_min']*60*util_for(s):6.2f}/online hr"
                 f"  demand x{s['demand_index']:.2f}  median trip ${s['median_earn']:.2f}")
print("\nTop 8 slots (gross $/online hour):")
print("\n".join(fmt(s) for s in ranked[:8]))
print("Bottom 5 slots:")
print("\n".join(fmt(s) for s in ranked[-5:]))
print(f"\nDemo driver Maria: {len(demo_trips)} real trips, {hours} hrs, gross ${gross:.2f} "
      f"= ${gross / hours:.2f}/hr gross")
print(f"Wrote {OUT / 'slots.json'} and {OUT / 'demo_driver.json'}")
