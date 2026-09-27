import { Fragment, useMemo, useRef } from 'react'
import type { HourResult, Schedule } from '../lib/calc'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const hourLabel = (h: number) => (h % 12 || 12) + (h < 12 ? 'a' : 'p')

interface Props {
  perSlot: HourResult[]
  schedule: Schedule
  onChange: (s: Schedule) => void
  best: Set<number> | null
}

/** Red → amber → green, by where this slot's real $/hr falls between the week's worst and best. */
function heat(t: number) {
  const hue = 4 + t * 136 // 4 = soft red, 140 = soft green
  return `hsl(${hue} ${70 - t * 10}% ${84 - t * 4}%)`
}

export default function WeekCalendar({ perSlot, schedule, onChange, best }: Props) {
  const paint = useRef<boolean | null>(null)
  const latest = useRef(schedule)
  latest.current = schedule

  const [lo, hi] = useMemo(() => {
    const reals = perSlot.map(r => r.real)
    return [Math.min(...reals), Math.max(...reals)]
  }, [perSlot])

  const apply = (idx: number) => {
    if (paint.current === null || latest.current[idx] === paint.current) return
    const next = latest.current.slice()
    next[idx] = paint.current
    latest.current = next
    onChange(next)
  }

  const idxAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const v = el?.closest<HTMLElement>('[data-idx]')?.dataset.idx
    return v === undefined ? null : Number(v)
  }

  return (
    <div className="calendar-wrap">
      <div
        className="calendar"
        onPointerDown={e => {
          const idx = idxAt(e.clientX, e.clientY)
          if (idx === null) return
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          paint.current = !latest.current[idx]
          apply(idx)
        }}
        onPointerMove={e => {
          if (paint.current === null) return
          const idx = idxAt(e.clientX, e.clientY)
          if (idx !== null) apply(idx)
        }}
        onPointerUp={() => (paint.current = null)}
        onPointerCancel={() => (paint.current = null)}
      >
        <div />
        {DAYS.map(d => <div key={d} className="day-head">{d}</div>)}
        {Array.from({ length: 24 }, (_, hr) => row(hr))}
      </div>
      <div className="legend">
        <span>Worse</span>
        <div className="legend-bar" />
        <span>Better</span>
        <span className="small">real $/hr: ${lo.toFixed(0)} – ${hi.toFixed(0)}</span>
        <span className="legend-on" />
        <span>your hours</span>
      </div>
    </div>
  )

  function row(hr: number) {
    return (
      <Fragment key={hr}>
        <div className="hour-label">{hourLabel(hr)}</div>
        {DAYS.map((_, dow) => {
          const idx = dow * 24 + hr
          const r = perSlot[idx]
          const on = schedule[idx]
          const t = hi > lo ? (r.real - lo) / (hi - lo) : 0.5
          const cls = ['cell', on && 'on', best?.has(idx) && 'best'].filter(Boolean).join(' ')
          return (
            <div
              key={dow}
              data-idx={idx}
              className={cls}
              style={{ background: on ? undefined : heat(t) }}
              title={`${DAYS[dow]} ${hourLabel(hr)}: gross $${r.gross.toFixed(2)} → real $${r.real.toFixed(2)}/hr`}
            >
              ${r.real.toFixed(0)}
            </div>
          )
        })}
      </Fragment>
    )
  }
}
