import { useEffect, useRef, useState } from 'react'
import { scanScreenshot, type ScanResult } from '../lib/scan'

interface Props { onExtracted: (r: ScanResult) => void }

export default function ScanCard({ onExtracted }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'reading' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  const run = async (file: Blob) => {
    setPreview(URL.createObjectURL(file))
    setStatus('reading'); setProgress(0)
    try {
      onExtracted(await scanScreenshot(file, setProgress))
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  const useSample = async () => run(await (await fetch('samples/earnings-week.png')).blob())

  // Open the app with ?demo to auto-scan the sample screenshot (handy for presentations).
  useEffect(() => {
    if (new URLSearchParams(location.search).has('demo')) useSample()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="card scan">
      <div className="ai-tag">✨ AI · on-device</div>
      <h2>Scan your earnings</h2>
      <p className="muted small">
        Drop a screenshot of your weekly earnings. A neural-network text reader runs right in your browser and builds your week. Nothing is uploaded.
      </p>
      <div
        className={`drop ${drag ? 'over' : ''} ${status === 'reading' ? 'busy' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => {
          e.preventDefault(); setDrag(false)
          const f = e.dataTransfer.files[0]
          if (f) run(f)
        }}
      >
        {preview && <img src={preview} alt="Uploaded earnings screenshot" />}
        <span>
          {status === 'reading'
            ? `Reading your screenshot… ${Math.round(progress * 100)}%`
            : 'Drop image here or click to upload'}
        </span>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && run(e.target.files[0])} />
      <button className="ghost" onClick={useSample} disabled={status === 'reading'}>Try a sample screenshot</button>
      {status === 'error' && <p className="error small">{error}</p>}
    </section>
  )
}
