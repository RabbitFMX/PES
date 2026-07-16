import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MemberOverview } from '../../components/MemberOverview'

/** Read-only overview of another member (view-others). */
export function MemberPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  if (!id) return null
  return (
    <div className="flex flex-col gap-4">
      <Link to="/leaderboard" className="text-sm text-muted hover:text-text">
        ← {t('common.back')}
      </Link>
      <MemberOverview memberId={id} />
    </div>
  )
}
