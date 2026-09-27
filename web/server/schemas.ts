// Output schemas for Claude's structured responses. Shared by the server and (as types) the browser.
import { z } from 'zod'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const Block = z.object({
  day: z.enum(DAYS),
  start_hour: z.number().describe('0-23, hour the block starts'),
  end_hour: z.number().describe('1-24, hour the block ends (exclusive). 24 = midnight'),
})

export const ExtractSchema = z.object({
  platform: z.string().nullable().describe('App name if visible, e.g. Uber, Lyft, DoorDash'),
  shifts: z.array(Block.extend({
    earnings: z.number().nullable().describe('Driver earnings for this block incl. tips, in dollars'),
    trips: z.number().nullable(),
  })),
  total_earnings: z.number().nullable(),
  total_hours: z.number().nullable(),
  notes: z.string().describe('One short sentence on anything ambiguous you had to assume. Empty if nothing.'),
})

export const CoachSchema = z.object({
  summary: z.string().describe('One punchy sentence about this driver\'s week, with a number.'),
  insights: z.array(z.object({
    title: z.string().describe('3-6 words'),
    detail: z.string().describe('One or two sentences, cite $/hr figures from the grid.'),
  })).describe('2-3 insights'),
  moves: z.array(z.object({
    title: z.string().describe('Short action, e.g. "Swap Tue 1-3am for Wed 7-9pm"'),
    reason: z.string().describe('One sentence why, using the grid numbers'),
    remove: z.array(Block).describe('Hours to drop. Must be hours the driver currently works.'),
    add: z.array(Block).describe('Hours to add instead. Must be free hours. Same total hours as remove.'),
  })).describe('2-4 independent moves, best first'),
})

export type ExtractResult = z.infer<typeof ExtractSchema>
export type CoachResult = z.infer<typeof CoachSchema>
