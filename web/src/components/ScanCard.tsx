import { useRef, useState } from 'react'
import { extractShifts, type ExtractResult } from '../lib/ai'

interface Props { onExtracted: (r: ExtractResult) => void }

export default function ScanCard({ onExtracted }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'reading' | 'error'>('idle')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  const run = async (file: Blob) => {
    setPreview(URL.createObjectURL(file))
    setStatus('reading')
    try {
      onExtracted(await extractShifts(file))
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  const useSample = async () => run(await (await fetch('samples/earnings-week.png')).blob())

  return (
    <section className="card scan">
      <div className="ai-tag">✨ AI</div>
      <h2>Scan your earnings</h2>
      <p className="muted small">Drop a screenshot of your weekly earnings or trip history. Claude reads it and builds your week.</p>
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
        <span>{status === 'reading' ? 'Reading your screenshot…' : 'Drop image here or click to upload'}</span>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && run(e.target.files[0])} />
      <button className="ghost" onClick={useSample} disabled={status === 'reading'}>Try a sample screenshot</button>
      {status === 'error' && <p className="error small">{error}</p>}
    </section>
  )
}
