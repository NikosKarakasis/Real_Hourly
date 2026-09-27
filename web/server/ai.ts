// Claude-powered endpoints, mounted into the Vite dev/preview server so the API key never reaches the browser.
//   POST /api/extract  { image: base64, mediaType }        -> shifts read from an earnings screenshot
//   POST /api/coach    { grid, shifts, constraints, ... }  -> insights + concrete shift moves
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { CoachSchema, ExtractSchema } from './schemas.ts'

const MODEL = 'claude-opus-5'


async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function errorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'Invalid ANTHROPIC_API_KEY. Check web/.env.'
  if (err instanceof Anthropic.RateLimitError) return 'Rate limited by the Claude API. Try again in a moment.'
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status}: ${err.message}`
  if (err instanceof Anthropic.AnthropicError) return err.message
  return err instanceof Error ? err.message : String(err)
}

async function extract(client: Anthropic, body: { image: string; mediaType: string }) {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low', format: zodOutputFormat(ExtractSchema) },
    system:
      'You read screenshots of gig-work earnings screens (weekly summaries, trip lists, activity logs) and ' +
      'convert them into hour blocks for a weekly calendar. Round start down and end up to whole hours. ' +
      'Split any block that crosses midnight into two blocks. If only per-trip times are shown, merge trips ' +
      'less than an hour apart into one block. Only report what is on the screen; never invent shifts.',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: body.mediaType as 'image/png', data: body.image } },
        { type: 'text', text: 'Extract this driver\'s work blocks for the week.' },
      ],
    }],
  })
  if (response.stop_reason === 'refusal') throw new Error('Claude declined to read this image.')
  if (!response.parsed_output) throw new Error('Could not read shifts from that image.')
  return response.parsed_output
}

async function coach(client: Anthropic, body: {
  grid: string; shifts: string; constraints: string; week: string; city: string
}) {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low', format: zodOutputFormat(CoachSchema) },
    system:
      'You are the scheduling engine inside Real Hourly, an app that shows rideshare drivers their real hourly ' +
      'pay after gas, car wear, empty miles and taxes. You get a 7x24 grid of real $/hr per hour-of-week ' +
      '(computed from millions of real trips) and the driver\'s current hours. Propose concrete swaps that keep ' +
      'total hours the same and raise real pay, and respect the driver\'s constraints exactly. ' +
      'Prefer moves that keep shifts contiguous and realistic (no single scattered hours). ' +
      'Speak directly to the driver, plainly, no jargon. Never give tax or legal advice.',
    messages: [{
      role: 'user',
      content:
        `City: ${body.city}\n\nReal $/hr grid (rows = hour 0-23, columns = Mon..Sun):\n${body.grid}\n\n` +
        `Driver's current hours:\n${body.shifts}\n\nThis week: ${body.week}\n\n` +
        `Driver's constraints: ${body.constraints.trim() || 'none given'}`,
    }],
  })
  if (response.stop_reason === 'refusal') throw new Error('Claude declined this request.')
  if (!response.parsed_output) throw new Error('The coach returned an unreadable plan. Try again.')
  return response.parsed_output
}

export function aiPlugin(apiKey: string | undefined): Plugin {
  const client = apiKey ? new Anthropic({ apiKey }) : null
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const route = req.url?.split('?')[0]
    if (req.method !== 'POST' || (route !== '/api/extract' && route !== '/api/coach')) return next()
    if (!client) return send(res, 503, { error: 'AI is off: add ANTHROPIC_API_KEY to web/.env and restart npm run dev.' })
    try {
      const body = await readJson(req)
      const result = route === '/api/extract' ? await extract(client, body) : await coach(client, body)
      send(res, 200, result)
    } catch (err) {
      console.error('[ai]', err)
      send(res, 500, { error: errorMessage(err) })
    }
  }
  return {
    name: 'real-hourly-ai',
    configureServer(server) { server.middlewares.use(handler) },
    configurePreviewServer(server) { server.middlewares.use(handler) },
  }
}
