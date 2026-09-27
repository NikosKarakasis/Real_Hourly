import { useState } from 'react'
import { money, type HourResult, type Schedule, type WeekResult } from '../lib/calc'
import { checkMove, coachRequest, getCoaching, type CoachResult } from '../lib/ai'

interface Props {
  schedule: Schedule
  perSlot: HourResult[]
  week: WeekResult
  onApply: (next: Schedule) => void
}

export default function CoachCard({ schedule, perSlot, week, onApply }: Props) {
  const [constraints, setConstraints] = useState('')
  const [result, setResult] = useState<CoachResult | null>(null)
  const [applied, setApplied] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError('')
    try {
      setResult(await getCoaching(coachRequest(schedule, perSlot, week, constraints)))
      setApplied(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // Re-check every suggestion against the *current* schedule with the app's own math.
  const checked = result?.moves.map(m => checkMove(m, schedule, perSlot)) ?? []

  return (
    <section className="card coach">
      <div className="ai-tag">✨ AI</div>
      <h2>Schedule coach</h2>
      <p className="muted small">Claude studies your week against real NYC pay data and proposes moves. You decide what to apply.</p>
      <label className="small">
        Anything you can't change?
        <input
          className="text-input"
          placeholder="e.g. day job Mon–Fri 9–5, no Sundays"
          value={constraints}
          onChange={e => setConstraints(e.target.value)}
        />
      </label>
      <button className="primary" onClick={run} disabled={loading || !week.hours}>
        {loading ? 'Analyzing your week…' : result ? 'Re-analyze my week' : 'Find better hours'}
      </button>
      {error && <p className="error small">{error}</p>}

      {result && (
        <div className="coach-result">
          <p className="coach-summary">{result.summary}</p>
          {result.insights.map((ins, i) => (
            <div key={i} className="insight">
              <strong>{ins.title}</strong>
              <span className="small">{ins.detail}</span>
            </div>
          ))}
          <h3>Suggested moves</h3>
          {checked.map((c, i) => {
            const done = applied.has(i)
            const worthIt = c.valid && c.gain > 0.5
            return (
              <div key={i} className={`move ${done ? 'done' : ''}`}>
                <div className="move-head">
                  <strong>{c.move.title}</strong>
                  {worthIt && !done && <span className="gain">+{money(c.gain)}/wk</span>}
                </div>
                <span className="small muted">{c.move.reason}</span>
                {done
                  ? <span className="small applied">✓ Applied</span>
                  : worthIt
                    ? <button className="ghost small-btn" onClick={() => { onApply(c.next); setApplied(new Set(applied).add(i)) }}>Apply move</button>
                    : <span className="small muted">Doesn't fit your current week anymore</span>}
              </div>
            )
          })}
          <p className="small muted">Gains are calculated by Real Hourly from the trip data, not by the AI.</p>
        </div>
      )}
    </section>
  )
}
