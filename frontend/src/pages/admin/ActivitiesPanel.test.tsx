import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { ToastContext, type Toast } from '../../context/toast'
import { ActivitiesPanel } from './ActivitiesPanel'
import type { Activity } from '../../lib/types'

const getAdminActivities = vi.hoisted(() => vi.fn())
const deleteActivity = vi.hoisted(() => vi.fn())
const createActivity = vi.hoisted(() => vi.fn())
const saveActivity = vi.hoisted(() => vi.fn())
vi.mock('../../lib/api', () => ({ getAdminActivities, deleteActivity, createActivity, saveActivity }))

const run: Activity = {
  id: 'run',
  nameCs: 'běh',
  nameEn: 'Running',
  unit: 'km',
  pointsPerUnit: 3,
  hasElevationBonus: false,
  elevationBonusPer50m: null,
  elevationBonusPer50mStroller: null,
  hasStrollerOption: false,
  strollerBaseRateOverride: null,
  isTiered: false,
  tierOptions: null,
  notes: null,
  active: true,
}

const toastValue = { showToast: vi.fn(), dismiss: vi.fn(), toasts: [] as Toast[] }

function renderPanel() {
  return render(
    <ToastContext.Provider value={toastValue}>
      <ActivitiesPanel />
    </ToastContext.Provider>,
  )
}

describe('ActivitiesPanel — admin add/delete/edit', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminActivities.mockResolvedValue([run])
  })

  it('opens the create form with an ID (slug) field', async () => {
    renderPanel()
    await userEvent.click(await screen.findByRole('button', { name: 'Add activity' }))
    expect(await screen.findByText('New activity')).toBeInTheDocument()
    expect(screen.getByLabelText(/ID \(slug\)/)).toBeInTheDocument()
  })

  it('deletes an unused activity after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    deleteActivity.mockResolvedValue({ ok: true })
    getAdminActivities.mockResolvedValueOnce([run]).mockResolvedValueOnce([])

    renderPanel()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(deleteActivity).toHaveBeenCalledWith('run')
    await waitFor(() => expect(getAdminActivities).toHaveBeenCalledTimes(2))
  })

  it('shows the deactivate hint when the activity is in use', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    deleteActivity.mockResolvedValue({ ok: false, message: 'in_use' })

    renderPanel()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() =>
      expect(toastValue.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', message: expect.stringContaining('entries') }),
      ),
    )
  })
})
