import { useState } from 'react'
import { money, type HourResult, type Schedule, type Slot, type WeekResult } from '../lib/calc'
import { applyMove, coach, CONSTRAINTS, type Coaching } from '../lib/coach'

interface Props {
  schedule: Schedule
  perSlot: HourResult[]
  slots: Slot[] // indexed by dow * 24 + hr
  week: WeekResult
  onApply: (next: Schedule) => void
}

export default function CoachCard({ schedule, perSlot, slots, week, onApply }: Props) {
  const [limits, setLimits] = useState<string[]>([])
  const [result, setResult] = useState<Coaching | null>(null)
  const [applied, setApplied] = useState<Set<number>>(new Set())
  const [thinking, setThinking] = useState(false)

  const run = () => {
    setThinking(true)
    // Tiny delay so the button state is visible; the search itself takes milliseconds.
    setTimeout(() => {
      setResult(coach(schedule, perSlot, slots, limits))
      setApplied(new Set())
      setThinking(false)
    }, 350)
  }

  const toggle = (id: string) => setLimits(l => (l.includes(id) ? l.filter(x => x !== id) : [...l, id]))

  return (
    <section className="card coach">
      <div className="ai-tag">✨ Smart coach</div>
      <h2>Schedule coach</h2>
      <p className="muted small">
        Tests every possible shift swap against real NYC pay data and suggests the best ones. You decide what to apply.
      </p>
      <div className="small">What can't you change?</div>
      <div className="chips">
        {CONSTRAINTS.map(c => (
          <button key={c.id} className={`chip ${limits.includes(c.id) ? 'on' : ''}`} onClick={() => toggle(c.id)}>
            {limits.includes(c.id) ? '✓ ' : ''}{c.label}
          </button>
        ))}
      </div>
      <button className="primary" onClick={run} disabled={thinking || !week.hours}>
        {thinking ? 'Searching 168 hours…' : result ? 'Re-analyze my week' : 'Find better hours'}
      </button>

      {result && (
        <div className="coach-result">
          <p className="coach-summary">{result.summary}</p>
          {result.insights.map((ins, i) => (
            <div key={i} className="insight">
              <strong>{ins.title}</strong>
              <span className="small">{ins.detail}</span>
            </div>
          ))}
          {result.moves.length > 0 && <h3>Suggested moves</h3>}
          {result.moves.map((m, i) => {
            const done = applied.has(i)
            const check = applyMove(m, schedule, perSlot)
            const ok = check.valid && (check.gain > 0.5 || m.required)
            return (
              <div key={i} className={`move ${done ? 'done' : ''}`}>
                <div className="move-head">
                  <strong>{m.title}</strong>
                  {ok && !done && (check.gain >= 0
                    ? <span className="gain">+{money(check.gain)}/wk</span>
                    : <span className="gain cost">{money(check.gain)}/wk</span>)}
                </div>
                <span className="small muted">{m.reason}</span>
                {done
                  ? <span className="small applied">✓ Applied</span>
                  : ok
                    ? <button className="ghost small-btn" onClick={() => { onApply(check.next); setApplied(new Set(applied).add(i)) }}>Apply move</button>
                    : <span className="small muted">Doesn't fit your current week anymore. Re-analyze.</span>}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
