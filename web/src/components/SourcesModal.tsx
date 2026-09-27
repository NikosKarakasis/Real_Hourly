import { costPerMile, type Settings } from '../lib/calc'
import { IRS_MILEAGE_RATE, NYC_MIN_WAGE, SOURCES } from '../lib/costs'

interface Props {
  onClose: () => void
  summary: { median_earn: number; avg_tip: number; avg_miles: number; avg_engaged_min: number }
  tripCount: number
  settings: Settings
}

export default function SourcesModal({ onClose, summary, tripCount, settings }: Props) {
  const { fuel, wear } = costPerMile(settings)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={e => e.stopPropagation()}>
        <div className="card-head">
          <h2>Assumptions &amp; sources</h2>
          <button className="ghost" onClick={onClose}>✕</button>
        </div>

        <h3>Real data</h3>
        <ul>
          {SOURCES.map(s => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a> — {s.note}</li>
          ))}
        </ul>
        <p className="small">
          From {tripCount.toLocaleString()} trips: median driver earnings per trip {`$${summary.median_earn}`} (incl. tips),
          average tip {`$${summary.avg_tip}`}, average {summary.avg_miles} paid miles and {summary.avg_engaged_min} minutes from
          request to drop-off.
        </p>

        <h3>How the real hourly rate is calculated</h3>
        <ol className="small">
          <li><strong>Gross per online hour</strong> = real earnings per engaged minute in that hour-of-week × minutes with a passenger.</li>
          <li><strong>Minutes with a passenger</strong>: the trip data has no driver IDs, so idle time between rides isn't recorded.
            We assume {Math.round(settings.baseUtil * 100)}% at average demand, scaled up in busy hours and down in quiet ones (35–85%). Adjustable.</li>
          <li><strong>Miles</strong> = real paid miles + {settings.deadheadRatio} empty miles per paid mile (driving to pickups and waiting for pings). Adjustable.</li>
          <li><strong>Car cost</strong> = {(fuel * 100).toFixed(1)}¢/mi gas (today's price ÷ typical MPG) + {(wear * 100).toFixed(1)}¢/mi {settings.costMode === 'true' ? 'maintenance, depreciation, insurance & fees (AAA)' : 'maintenance & tires (AAA)'}.</li>
          <li><strong>Taxes</strong>: self-employment tax (15.3% × 92.35%) + your income-tax set-aside, on gross minus the IRS {IRS_MILEAGE_RATE * 100}¢/mi deduction.</li>
          <li>Minimum wage comparison: NYC ${NYC_MIN_WAGE.toFixed(2)}/hr (2026).</li>
        </ol>

        <p className="disclaimer small">
          These are estimates based on public data and the costs you enter. Not tax or financial advice.
        </p>
      </div>
    </div>
  )
}
