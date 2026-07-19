import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs } from '../../components/ui/Tabs'
import { MembersPanel } from './MembersPanel'
import { ActivitiesPanel } from './ActivitiesPanel'
import { RoundsPanel } from './RoundsPanel'
import { RotationPanel } from './RotationPanel'
import { ChallengesPanel } from './ChallengesPanel'

type PanelId = 'members' | 'activities' | 'rounds' | 'rotation' | 'challenges'

export function AdminPage() {
  const { t } = useTranslation()
  const [panel, setPanel] = useState<PanelId>('members')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">{t('admin.title')}</h1>

      <div className="overflow-x-auto">
        <Tabs
          idPrefix="admin"
          ariaLabel={t('admin.title')}
          active={panel}
          onChange={(id) => setPanel(id as PanelId)}
          tabs={[
            { id: 'members', label: t('admin.members') },
            { id: 'activities', label: t('admin.activities') },
            { id: 'rounds', label: t('admin.rounds') },
            { id: 'rotation', label: t('admin.rotation') },
            { id: 'challenges', label: t('admin.challenges') },
          ]}
        />
      </div>

      <div role="tabpanel" id={`admin-panel-${panel}`} aria-labelledby={`admin-tab-${panel}`}>
        {panel === 'members' && <MembersPanel />}
        {panel === 'activities' && <ActivitiesPanel />}
        {panel === 'rounds' && <RoundsPanel />}
        {panel === 'rotation' && <RotationPanel />}
        {panel === 'challenges' && <ChallengesPanel />}
      </div>
    </div>
  )
}
