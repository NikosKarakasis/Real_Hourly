# Real Hourly

**See what you *really* earn per hour as a rideshare driver, after gas, car wear, empty miles, and taxes.**

Gig apps show drivers a big gross number. Real Hourly shows what's left. Drivers see their week as a color-coded calendar,
click and drag to move their hours, and watch their real hourly rate and weekly take-home update live.

> Demo driver Maria works 24 hrs/week on late weeknights and early weekend mornings.
> **The app says $28.69/hr. She really makes $15.19/hr**, below NYC's $17 minimum wage.
> Moving the same 24 hours to better slots: **+$127/week (~$6,350/year)**.

## Built on real data

| Data | Source |
|---|---|
| 20.9M real NYC Uber/Lyft trips (July 2026), with actual `driver_pay` + `tips` | [NYC TLC High Volume FHV trip records](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page) |
| Cost per mile by vehicle type, maintenance, fuel basis | [AAA Your Driving Costs 2025](https://newsroom.aaa.com/wp-content/uploads/2025/09/UPDATE-AAA-Fact-Sheet-Your-Driving-Cost-9.2025-1.pdf) |
| NYC gas price ($4.407/gal, week of 2026-09-21) | [EIA weekly retail gasoline](https://www.eia.gov/dnav/pet/pet_pri_gnd_dcus_y35ny_w.htm) |
| Mileage deduction (76¢/mi from July 2026) | [IRS standard mileage rates](https://www.irs.gov/tax-professionals/standard-mileage-rates) |

**How it works:** trips are grouped into 168 hour-of-week slots. For each slot we compute real earnings per engaged minute
(request → drop-off) and paid miles. Then:

```
gross/hr   = earnings per engaged minute × minutes with a passenger (utilization, higher in busy hours)
miles/hr   = paid miles × (1 + empty-miles ratio)
real/hr    = gross − gas − car wear/ownership − tax set-aside (SE tax + income %, after IRS mileage deduction) − phone
```

**Honest limits:** the public data has no driver IDs, so idle time between rides and empty miles aren't recorded. Those are
labeled assumptions (60% utilization at average demand, 0.5 empty miles per paid mile) that the user can adjust.
Estimates only, not tax advice.

## Project layout

```
data/build_data.py        # DuckDB queries the TLC parquet over HTTPS → web/public/data/*.json
web/                      # React + Vite + TypeScript app (no backend)
  public/data/            # slots.json (168 slots), demo_driver.json (Maria + sampled real trips)
  src/lib/calc.ts         # all the money math
  src/lib/costs.ts        # AAA / IRS / EIA inputs with sources
  src/components/         # WeekCalendar, Headline, SummaryBar, CostPanel, SourcesModal, TripsTable
```

## Run it

```bash
cd web
npm install
npm run dev          # open the printed http://localhost:5173
```

Rebuild the data (optional, ~40 s, the JSON is already committed):

```bash
pip install -r requirements.txt
python data/build_data.py            # default month 2026-07
python data/build_data.py 2026-06    # or any other month
```

> The npm scripts call `node node_modules/...` directly because the `&` in some Windows folder paths breaks npm's `.cmd` shims.

## Business model

Free real-hourly check → $5/month for weekly tracking, tax set-aside estimates, and best-hours alerts.
Partnerships with gig-focused insurance, tax prep, and banking. Later: anonymized "which hours pay" insights by city.
