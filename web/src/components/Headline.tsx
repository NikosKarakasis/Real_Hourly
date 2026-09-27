import { money, type WeekResult } from '../lib/calc'

const PARTS = [
  { key: 'real', label: 'You keep', cls: 'keep' },
  { key: 'fuel', label: 'Gas', cls: 'fuel' },
  { key: 'carWear', label: 'Car wear & ownership', cls: 'wear' },
  { key: 'tax', label: 'Taxes to set aside', cls: 'tax' },
  { key: 'phone', label: 'Phone & data', cls: 'phone' },
] as const

export default function Headline({ week, minWage }: { week: WeekResult; minWage: number }) {
  if (!week.hours) {
    return <section className="headline card"><p className="muted">Drag on the calendar to add some work hours.</p></section>
  }
  const belowMin = week.realPerHour < minWage
  return (
    <section className="headline card">
      <div className="compare">
        <div>
          <div className="label">The app says you make</div>
          <div className="big"><s className="strike">{money(week.grossPerHour, 2)}</s><span>/hr</span></div>
        </div>
        <div className="arrow">→</div>
        <div>
          <div className="label">You really make</div>
          <div className={`big ${belowMin ? 'bad' : 'good'}`}>{money(week.realPerHour, 2)}<span>/hr</span></div>
          <div className="small muted">
            {belowMin
              ? `Below NYC's ${money(minWage, 2)} minimum wage`
              : `${money(week.realPerHour - minWage, 2)}/hr above NYC minimum wage`}
          </div>
        </div>
      </div>
      <div className="breakdown">
        <div className="bar">
          {PARTS.map(p => {
            const v = Math.max(0, week[p.key])
            return <div key={p.key} className={`seg ${p.cls}`} style={{ flexGrow: v }} title={`${p.label}: ${money(v)}`} />
          })}
        </div>
        <div className="bar-legend">
          {PARTS.map(p => (
            <span key={p.key}><i className={`dot ${p.cls}`} />{p.label} <strong>{money(week[p.key])}</strong></span>
          ))}
          <span className="muted">of {money(week.gross)} gross · {Math.round(week.deadMiles)} of {Math.round(week.miles)} miles unpaid</span>
        </div>
      </div>
    </section>
  )
}
