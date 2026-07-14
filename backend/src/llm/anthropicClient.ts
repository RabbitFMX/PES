import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/** Cheapest fast tier per project-brief.md §5 — natural-language logging and weekly recap. */
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
