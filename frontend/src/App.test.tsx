import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it, beforeAll } from 'vitest'
import App from './App'
import './i18n'

describe('App', () => {
  beforeAll(async () => {
    const i18n = (await import('./i18n')).default
    await i18n.changeLanguage('cs')
  })

  it('renders the dashboard nav link', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    )
    expect(screen.getByRole('link', { name: 'Přehled' })).toBeInTheDocument()
  })
})
