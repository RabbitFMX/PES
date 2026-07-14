import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { getMembers, inviteMember, saveMember } from '../../lib/mockApi'
import type { Member } from '../../lib/types'
import { useToast } from '../../context/toast'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

export function MembersPanel() {
  const { t } = useTranslation()
  const { data, loading, error, reload } = useAsync<Member[]>(getMembers)
  const [editing, setEditing] = useState<Member | null>(null)
  const [inviting, setInviting] = useState(false)

  if (loading) return <Skeleton className="h-64" />
  if (error || !data) return <ErrorState onRetry={reload} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setInviting(true)}>{t('admin.invite')}</Button>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-md)] ring-1 ring-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">{t('admin.name')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.division')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.coefficient')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.role')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.status')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.map((mem) => (
              <tr key={mem.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <div className="font-medium text-text">{mem.displayName}</div>
                  <div className="text-xs text-muted">{mem.email}</div>
                </td>
                <td className="px-3 py-2">{mem.division}</td>
                <td className="px-3 py-2">×{mem.coefficient}</td>
                <td className="px-3 py-2">
                  {mem.role === 'admin' ? <Badge variant="primary">admin</Badge> : 'member'}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={mem.status === 'active' ? 'success' : 'neutral'}>
                    {mem.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(mem)}>
                    {t('admin.edit')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditMemberModal member={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
      {inviting && <InviteModal onClose={() => setInviting(false)} />}
    </div>
  )
}

function EditMemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [form, setForm] = useState<Member>(member)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const res = await saveMember(form)
      if (res.ok) {
        showToast({ message: t('admin.saveSuccess'), variant: 'success' })
        onClose()
        onSaved() // reload — no optimistic UI
      } else {
        showToast({ message: res.message, variant: 'error' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={member.displayName}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} fullWidth>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} loading={busy} fullWidth>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label={t('admin.division')}
          value={form.division}
          onChange={(e) => setForm({ ...form, division: e.target.value as Member['division'] })}
          options={[
            { value: 'A', label: 'A' },
            { value: 'B', label: 'B' },
          ]}
        />
        <Select
          label={t('admin.coefficient')}
          value={String(form.coefficient)}
          onChange={(e) => setForm({ ...form, coefficient: Number(e.target.value) })}
          options={[
            { value: '1', label: '×1.0' },
            { value: '1.25', label: '×1.25' },
          ]}
        />
        <Select
          label={t('admin.role')}
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as Member['role'] })}
          options={[
            { value: 'member', label: 'member' },
            { value: 'admin', label: 'admin' },
          ]}
        />
        <Select
          label={t('admin.status')}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as Member['status'] })}
          options={[
            { value: 'active', label: 'active' },
            { value: 'left', label: 'left' },
          ]}
        />
        <Input
          label={t('admin.injuryExempt')}
          type="date"
          value={form.injuryExemptUntil ?? ''}
          onChange={(e) => setForm({ ...form, injuryExemptUntil: e.target.value || null })}
        />
      </div>
    </Modal>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!email.trim()) return
    setBusy(true)
    try {
      const res = await inviteMember(email)
      if (res.ok) {
        showToast({ message: t('admin.saveSuccess'), variant: 'success' })
        onClose()
      } else {
        showToast({ message: res.message, variant: 'error' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('admin.invite')}
      footer={
        <Button onClick={send} loading={busy} disabled={!email.trim()} fullWidth>
          {t('admin.sendInvite')}
        </Button>
      }
    >
      <Input
        label={t('admin.inviteEmail')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </Modal>
  )
}
