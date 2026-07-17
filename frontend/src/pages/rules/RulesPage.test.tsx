import { render, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { RulesPage } from './RulesPage'
import { RULES_SECTIONS } from './rulesContent'

afterAll(async () => {
  await i18n.changeLanguage('cs')
})

describe('RulesPage', () => {
  beforeEach(() => {
    // Content is data-driven; guard the transcription didn't get truncated.
    expect(RULES_SECTIONS.length).toBeGreaterThanOrEqual(5)
  })

  it('renders the Czech rules by default', async () => {
    await i18n.changeLanguage('cs')
    render(<RulesPage />)
    expect(screen.getByRole('heading', { name: 'Pravidla', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Obecná pravidla' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Smečka A/ })).toBeInTheDocument()
    // A verbatim pot amount from the sheet.
    expect(screen.getByText('650 Kč')).toBeInTheDocument()
  })

  it('switches to English translations', async () => {
    await i18n.changeLanguage('en')
    render(<RulesPage />)
    expect(screen.getByRole('heading', { name: 'General rules' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Pack A/ })).toBeInTheDocument()
  })
})
