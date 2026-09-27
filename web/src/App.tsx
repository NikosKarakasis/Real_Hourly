import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SETTINGS, hourResult, slotIndex, weekResult,
  type Schedule, type Settings, type Slot,
} from './lib/calc'
import { NYC_MIN_WAGE } from './lib/costs'
import WeekCalendar from './components/WeekCalendar'
import CostPanel from './components/CostPanel'
import Headline from './components/Headline'
import SummaryBar from './components/SummaryBar'
import SourcesModal from './components/SourcesModal'
import TripsTable, { type Trip } from './components/TripsTable'

interface SlotsFile {
  month: string
  trip_count: number
  summary: { median_earn: number; avg_tip: number; avg_miles: number; avg_engaged_min: number }
  slots: Slot[]
}
interface DemoDriver {
  name: string
  car: Settings['car']
  blurb: string
  shifts: { dow: number; start: number; end: number }[]
  trips: Trip[]
}

function scheduleFromShifts(shifts: DemoDriver['shifts']): Schedule {
  const s: Schedule = Array(168).fill(false)
  for (const { dow, start, end } of shifts) for (let h = start; h < end; h++) s[slotIndex(dow, h)] = true
  return s
}

export default function App() {
  const [data, setData] = useState<SlotsFile | null>(null)
  const [driver, setDriver] = useState<DemoDriver | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [schedule, setSchedule] = useState<Schedule>(Array(168).fill(false))
  const [original, setOriginal] = useState<Schedule>(Array(168).fill(false))
  const [showBest, setShowBest] = useState(false)
  const [showSources, setShowSources] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('data/slots.json').then(r => r.json()),
      fetch('data/demo_driver.json').then(r => r.json()),
    ]).then(([slots, demo]: [SlotsFile, DemoDriver]) => {
      setData(slots)
      setDriver(demo)
      const s = scheduleFromShifts(demo.shifts)
      setSchedule(s)
      setOriginal(s)
      setSettings(prev => ({ ...prev, car: demo.car }))
    })
  }, [])

  // Expected result for one online hour in each of the 168 slots.
  const perSlot = useMemo(() => {
    if (!data) return []
    const arr = Array(168)
    for (const slot of data.slots) arr[slotIndex(slot.dow, slot.hr)] = hourResult(slot, settings)
    return arr
  }, [data, settings])

  const week = useMemo(() => perSlot.length ? weekResult(schedule, perSlot) : null, [schedule, perSlot])
  const before = useMemo(() => perSlot.length ? weekResult(original, perSlot) : null, [original, perSlot])

  // The best N slots by real $/hr, where N = hours currently scheduled.
  const best = useMemo(() => {
    const n = schedule.filter(Boolean).length
    const ranked = perSlot.map((r, i) => ({ i, real: r.real })).sort((a, b) => b.real - a.real)
    return new Set(ranked.slice(0, n).map(x => x.i))
  }, [perSlot, schedule])

  if (!data || !driver || !week || !before) return <div className="loading">Loading real NYC trip data…</div>

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1><span className="logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M10 2h4" />
            </svg>
          </span> Real Hourly</h1>
          <p className="tagline">What you actually earn per hour, after gas, car wear, empty miles, and taxes.</p>
        </div>
        <button className="ghost" onClick={() => setShowSources(true)}>Assumptions &amp; sources</button>
      </header>

      <section className="driver card">
        <div className="avatar">{driver.name[0]}</div>
        <div>
          <strong>{driver.name}</strong> · rideshare driver, NYC
          <div className="muted">{driver.blurb}</div>
        </div>
        <div className="badge">
          Built from <strong>{data.trip_count.toLocaleString()}</strong> real Uber/Lyft trips · NYC TLC, {data.month}
        </div>
      </section>

      <Headline week={week} minWage={NYC_MIN_WAGE} />

      <main className="grid">
        <section className="card">
          <div className="card-head">
            <h2>Your week</h2>
            <div className="actions">
              <label className="toggle">
                <input type="checkbox" checked={showBest} onChange={e => setShowBest(e.target.checked)} />
                Show best {week.hours} hours
              </label>
              <button className="ghost" onClick={() => setSchedule(original)}>Reset</button>
              <button className="ghost" onClick={() => setSchedule(Array(168).fill(false))}>Clear</button>
            </div>
          </div>
          <p className="muted small">
            Colors show what <em>one hour</em> of driving really pays in each slot. <strong>Click and drag</strong> to add or remove your work hours.
          </p>
          <WeekCalendar perSlot={perSlot} schedule={schedule} onChange={setSchedule} best={showBest ? best : null} />
        </section>

        <aside className="side">
          <SummaryBar week={week} before={before} />
          <CostPanel settings={settings} onChange={setSettings} />
        </aside>
      </main>

      <TripsTable trips={driver.trips} name={driver.name} />

      <footer className="muted small">
        Estimates based on real NYC trip data and the costs you enter. Not tax or financial advice.
      </footer>

      {showSources && <SourcesModal onClose={() => setShowSources(false)} summary={data.summary} tripCount={data.trip_count} settings={settings} />}
    </div>
  )
}
