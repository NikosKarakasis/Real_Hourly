import type React from 'react'
import { costPerMile, type Settings } from '../lib/calc'
import { CARS } from '../lib/costs'

interface Props { settings: Settings; onChange: (s: Settings) => void }

export default function CostPanel({ settings: s, onChange }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...s, [k]: v })
  const { fuel, wear } = costPerMile(s)

  return (
    <section className="card costs">
      <h2>Your costs</h2>

      <label>Car
        <select value={s.car} onChange={e => set('car', e.target.value as Settings['car'])}>
          {CARS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>

      <div className="seg-toggle">
        <button className={s.costMode === 'true' ? 'active' : ''} onClick={() => set('costMode', 'true')}>True cost</button>
        <button className={s.costMode === 'cash' ? 'active' : ''} onClick={() => set('costMode', 'cash')}>Cash only</button>
      </div>
      <p className="muted small">
        {s.costMode === 'true'
          ? 'Gas + maintenance + depreciation, insurance, registration (AAA).'
          : 'Only gas + maintenance and tires. Ignores the car losing value.'}
        {' '}= <strong>{((fuel + wear) * 100).toFixed(0)}¢/mile</strong>
      </p>

      <Slider label="Gas price" value={s.gasPrice} min={2.5} max={6} step={0.05}
        fmt={v => `$${v.toFixed(2)}/gal`} onChange={v => set('gasPrice', v)} />
      <Slider label="Time with a passenger (avg hour)" value={s.baseUtil} min={0.35} max={0.85} step={0.01}
        fmt={v => `${Math.round(v * 100)}%`} onChange={v => set('baseUtil', v)} />
      <Slider label="Empty miles per paid mile" value={s.deadheadRatio} min={0} max={1.2} step={0.05}
        fmt={v => v.toFixed(2)} onChange={v => set('deadheadRatio', v)} />
      <Slider label="Income tax set-aside" value={s.incomeTaxRate} min={0} max={0.3} step={0.01}
        fmt={v => `${Math.round(v * 100)}% + SE tax`} onChange={v => set('incomeTaxRate', v)} />
      <Slider label="Phone & data" value={s.phonePerHour} min={0} max={2} step={0.1}
        fmt={v => `$${v.toFixed(2)}/hr`} onChange={v => set('phonePerHour', v)} />
    </section>
  )
}

function Slider({ label, value, min, max, step, fmt, onChange }: {
  label: string; value: number; min: number; max: number; step: number
  fmt: (v: number) => string; onChange: (v: number) => void
}) {
  return (
    <label className="slider">
      <span className="slider-head">{label}<strong>{fmt(value)}</strong></span>
      <input type="range" min={min} max={max} step={step} value={value}
        style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
        onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}
