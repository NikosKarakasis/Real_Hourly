import { money, type WeekResult } from '../lib/calc'

export default function SummaryBar({ week, before }: { week: WeekResult; before: WeekResult }) {
  const delta = week.real - before.real
  const hourDelta = week.hours - before.hours
  const changed = Math.abs(delta) >= 0.5 || hourDelta !== 0

  return (
    <section className="card summary">
      <h2>This week</h2>
      <div className="stats">
        <Stat label="Hours" value={String(week.hours)} />
        <Stat label="Gross" value={money(week.gross)} />
        <Stat label="Take-home" value={money(week.real)} strong />
      </div>
      {changed && (
        <div className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
          <div className="delta-main">
            {hourDelta === 0 ? `Same ${week.hours} hours, ` : `${hourDelta > 0 ? '+' : ''}${hourDelta} hrs, `}
            <strong>{delta >= 0 ? '+' : ''}{money(delta)}/week</strong>
          </div>
          <div className="small">
            That's {delta >= 0 ? '+' : ''}{money(delta * 50)} a year · real rate {money(before.realPerHour, 2)} → {money(week.realPerHour, 2)}/hr
          </div>
        </div>
      )}
      {!changed && <p className="muted small">Try dragging a red late-night hour off, then painting it onto a green evening slot. Watch this change.</p>}
    </section>
  )
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`stat ${strong ? 'strong' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}
