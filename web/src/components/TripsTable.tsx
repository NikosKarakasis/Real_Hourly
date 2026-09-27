import { money } from '../lib/calc'

export interface Trip {
  pickup: string
  driver_pay: number
  tips: number
  miles: number
  engaged_min: number
  app: string
}

export default function TripsTable({ trips, name }: { trips: Trip[]; name: string }) {
  return (
    <details className="card trips">
      <summary>
        See {trips.length} real trips from the hours {name} drives
      </summary>
      <p className="muted small">
        A random sample of actual NYC Uber/Lyft trips (July 2026) from the same days and hours {name} works.
        Driver pay and tips are exactly what the driver received. The calendar uses averages over all trips in each hour, not just this sample.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Pickup</th><th>App</th><th>Driver pay</th><th>Tip</th><th>Miles</th><th>Minutes</th></tr>
          </thead>
          <tbody>
            {trips.map((t, i) => (
              <tr key={i}>
                <td>{t.pickup}</td><td>{t.app}</td><td>{money(t.driver_pay, 2)}</td>
                <td>{money(t.tips, 2)}</td><td>{t.miles.toFixed(1)}</td><td>{t.engaged_min.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
