import { useTranslation } from 'react-i18next'
import { Bookmark, Download, Layers, Plus, Star as StarIcon } from 'lucide-react'
import type { SuiteSummary } from '@/api/types'
import { useAuth } from '@/features/auth/use-auth'
import { useSuiteUserRating } from '@/features/suite/use-suite-queries'
import { Card } from '@/shared/ui/card'
import { formatCompactCount } from '@/shared/lib/number-format'

interface SuiteCardProps {
  suite: SuiteSummary
  onClick?: () => void
}

/**
 * Suite card used in the two-column suite grid. Its skill preview adapts to the item count:
 * one skill fills the preview, two split it horizontally, and three or four use a 2 x 2 grid.
 */
export function SuiteCard({ suite, onClick }: SuiteCardProps) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { data: userRating } = useSuiteUserRating(suite.namespace, suite.slug, isAuthenticated)
  const isInteractive = typeof onClick === 'function'
  const isInactive = suite.status === 'ARCHIVED' || suite.hidden
  const previewSkills = suite.previewSkills?.slice(0, 4) ?? []
  const showSkillSummaries = previewSkills.length <= 2
  const previewGridClassName = previewSkills.length === 1 ? 'grid-cols-1' : 'grid-cols-2'

  return (
    <Card
      className="h-full p-5 cursor-pointer group relative overflow-hidden bg-white border shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
      style={{ borderColor: 'hsl(var(--border-card))' }}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isInteractive) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      role={isInteractive ? 'link' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="flex h-full flex-col gap-3">
        {/* First row: suite name on the left and compact suite metadata on the right. */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h3
              className={`min-w-0 truncate text-lg font-semibold transition-colors ${
                isInactive ? 'text-gray-400 group-hover:text-gray-400 dark:text-gray-500 dark:group-hover:text-gray-500' : 'text-foreground group-hover:text-primary'
              }`}
              title={suite.displayName}
            >
              {suite.displayName}
            </h3>
            {suite.status === 'ARCHIVED' && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-red-600 px-3 py-1 text-xs font-medium leading-none text-white">
                {t('suites.status.archived')}
              </span>
            )}
            {suite.hidden && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-orange-500 px-3 py-1 text-xs font-medium leading-none text-white">
                {t('suites.status.hidden')}
              </span>
            )}
          </div>
          <div className="flex min-w-0 shrink items-center gap-2 pt-1 text-xs leading-none text-muted-foreground">
            <span className="min-w-0 max-w-48 truncate" title={`@${suite.namespace}`}>@{suite.namespace}</span>
            <span aria-hidden="true" className="text-border">|</span>
            <span className="flex shrink-0 items-center gap-1" title={t('suites.skillCount', { count: suite.skillCount })}>
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              {formatCompactCount(suite.skillCount)}
            </span>
            {suite.downloadCount > 0 && (
              <>
                <span aria-hidden="true" className="text-border">|</span>
                <span className="flex shrink-0 items-center gap-1" title={t('skillDetail.downloads')}>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                    />
                  </svg>
                  {formatCompactCount(suite.downloadCount)}
                </span>
              </>
            )}
            <span aria-hidden="true" className="text-border">|</span>
            <span className={`flex shrink-0 items-center gap-1 ${suite.starred ? 'font-semibold text-primary' : ''}`}>
              <Bookmark className={`h-3.5 w-3.5 ${suite.starred ? 'fill-current' : ''}`} aria-hidden="true" />
              {formatCompactCount(suite.starCount)}
            </span>
            <span aria-hidden="true" className="text-border">|</span>
            <span className="flex shrink-0 items-center gap-1">
              <StarIcon
                className={`h-3.5 w-3.5 ${userRating?.rated ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
              {(suite.ratingAvg ?? 0).toFixed(1)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {suite.publisherName ?? '—'}({suite.ownerUsername ?? '—'})&nbsp;·&nbsp;{suite.secondaryDepartment || '其他部门'}
        </p>

        {/* Middle: suite description. */}
        {suite.summary && <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{suite.summary}</p>}

        {/* Bottom: an adaptive, compact skill preview. */}
        {previewSkills.length > 0 ? (
          <div className={`grid gap-2 pt-1 ${previewGridClassName}`}>
            {previewSkills.map((skill) => (
              <div key={skill.skillId} className="min-w-0 rounded-[2px] bg-secondary/60 px-2.5 py-2">
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden">
                  <span className="truncate text-xs font-medium text-foreground" title={skill.displayName}>
                    {skill.displayName}
                  </span>
                  <span className="flex items-center justify-self-end gap-0.5 text-[11px] text-muted-foreground">
                    <Download className="w-3 h-3" />
                    {formatCompactCount(skill.downloadCount)}
                  </span>
                </div>
                {showSkillSummaries && skill.summary && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground" title={skill.summary}>
                    {skill.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : suite.skillCount === 0 ? (
          <div className="pt-1">
            <div className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-[2px] bg-secondary/60 px-3 py-3 text-muted-foreground">
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs">{t('suites.emptySkillCardAction')}</span>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
