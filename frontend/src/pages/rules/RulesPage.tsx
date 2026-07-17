import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { RULES_SECTIONS, type RuleSection } from './rulesContent'

/**
 * Rules screen — the group's rules transcribed from the `pravidla` sheet of
 * PES 2.0.xlsx (see rulesContent.ts). Read-only reference; Czech is the source
 * text, English is shown when the UI language is English.
 */
export function RulesPage() {
  const { t, i18n } = useTranslation()
  const en = i18n.language.startsWith('en')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">{t('rules.title')}</h1>
        <p className="text-sm text-muted">{t('rules.subtitle')}</p>
      </div>

      {RULES_SECTIONS.map((section) => (
        <Section key={section.id} section={section} en={en} />
      ))}

      <p className="px-1 pb-2 text-xs text-muted">{t('rules.source')}</p>
    </div>
  )
}

function Section({ section, en }: { section: RuleSection; en: boolean }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text">{en ? section.titleEn : section.titleCs}</h2>

      {section.items.length > 0 && (
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-text marker:text-primary">
          {section.items.map((item, i) => (
            <li key={i}>{en ? item.en : item.cs}</li>
          ))}
        </ul>
      )}

      {section.table && (
        <ul className="flex flex-col divide-y divide-border text-sm">
          {section.table.map((row, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-1.5">
              <span className="text-text">{en ? row.placeEn : row.placeCs}</span>
              <span className="shrink-0 font-medium tabular-nums text-muted">{row.amount}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
