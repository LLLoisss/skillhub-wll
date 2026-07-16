import { useState, type MouseEvent } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Bookmark, Trash2 } from 'lucide-react'
import { ApiError } from '@/api/client'
import { useAuth } from '@/features/auth/use-auth'
import { AddSuiteSkillsDrawer } from '@/features/suite/add-suite-skills-drawer'
import { SuiteTagList } from '@/features/suite/suite-tag-list'
import {
  SuiteGovernanceActions,
  SuiteHeaderActions,
  SuiteLifecycleActions,
} from '@/features/suite/suite-lifecycle-actions'
import { EditSuiteDialog } from '@/features/suite/edit-suite-dialog'
import { SuiteRatingInput } from '@/features/suite/suite-rating-input'
import { useRateSuite, useRemoveSuiteSkills, useSuiteDetail, useSuiteUserRating, useToggleSuiteStar } from '@/features/suite/use-suite-queries'
import { NamespaceBadge } from '@/shared/components/namespace-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { formatLocalDateTime } from '@/shared/lib/date-time'
import { formatCompactCount } from '@/shared/lib/number-format'
import { toast } from '@/shared/lib/toast'
import { isUnavailableSuiteSkill } from '@/features/suite/suite-skill-eligibility'

/** Detail page for one expert suite, including skill association management and governance actions. */
export function SuiteDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { namespace, slug } = useParams({ from: '/suites/$namespace/$slug' })
  const { user, isAuthenticated, hasRole } = useAuth()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addSkillsDrawerOpen, setAddSkillsDrawerOpen] = useState(false)

  const { data: suite, isLoading } = useSuiteDetail(namespace, slug)
  const { data: userRating } = useSuiteUserRating(namespace, slug, isAuthenticated)
  const toggleStarMutation = useToggleSuiteStar(namespace, slug)
  const rateMutation = useRateSuite(namespace, slug)
  const removeSkillsMutation = useRemoveSuiteSkills()

  const isSuperAdmin = hasRole('SUPER_ADMIN')
  const isStarred = suite?.starred ?? false
  const locale = i18n.resolvedLanguage || i18n.language || 'en'
  const currentRating = userRating?.rated ? userRating.score : 0

  if (isLoading || !suite) {
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="h-10 w-48 animate-shimmer rounded-lg" />
        <div className="h-64 animate-shimmer rounded-xl" />
      </div>
    )
  }

  const canManage = suite.canManage || Boolean(user && suite.ownerId === user.userId) || isSuperAdmin

  const handleToggleStar = () => {
    if (!isAuthenticated) {
      navigate({ to: '/login', search: { returnTo: window.location.pathname } })
      return
    }
    toggleStarMutation.mutate(isStarred)
  }

  const handleRate = (score: number) => {
    if (!isAuthenticated) {
      navigate({ to: '/login', search: { returnTo: window.location.pathname } })
      return
    }
    rateMutation.mutate(score)
  }

  const handleRemoveSkill = async (event: MouseEvent<HTMLButtonElement>, skillId: number) => {
    event.stopPropagation()
    try {
      await removeSkillsMutation.mutateAsync({ namespace, slug, skillIds: [skillId] })
      toast.success(t('suites.removeSkillSuccessTitle'))
    } catch (error) {
      toast.error(
        t('suites.removeSkillErrorTitle'),
        error instanceof ApiError ? error.serverMessage || error.message : error instanceof Error ? error.message : undefined,
      )
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {suite.status === 'ARCHIVED' && (
        <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {t('suites.archivedBanner')}
        </div>
      )}
      {suite.hidden && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('suites.hiddenBanner')}
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold font-heading">{suite.displayName}</h1>
                  <NamespaceBadge type="TEAM" name={`@${suite.namespace}`} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('suites.ownedBy', { owner: suite.publisherName || suite.ownerDisplayName })}
                  {' · '}
                  {formatLocalDateTime(suite.updatedAt, locale)}
                </p>
              </div>
            </div>

            {suite.summary && <p className="max-w-3xl text-base text-muted-foreground">{suite.summary}</p>}

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <SuiteRatingInput value={currentRating} onChange={handleRate} disabled={rateMutation.isPending} />
                {suite.ratingAvg !== undefined && suite.ratingCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {suite.ratingAvg.toFixed(1)} ({suite.ratingCount})
                  </span>
                )}
              </div>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 text-sm transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${isStarred ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={handleToggleStar}
                disabled={toggleStarMutation.isPending}
                aria-pressed={isStarred}
              >
                <Bookmark className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
                <span>{isStarred ? t('starButton.starred') : t('starButton.star')}</span>
                <span>({formatCompactCount(suite.starCount)})</span>
              </button>
            </div>

            <SuiteHeaderActions
              suite={suite}
              canManage={canManage}
              onEdit={() => setEditDialogOpen(true)}
              onAddSkills={() => setAddSkillsDrawerOpen(true)}
            />
          </div>

          <Tabs defaultValue="skills">
            <TabsList>
              <TabsTrigger value="skills">{t('suites.detail.tabs.skills', { count: suite.skills.length })}</TabsTrigger>
            </TabsList>

            <TabsContent value="skills" className="space-y-3 pt-4">
              {suite.skills
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((skill) => {
                  const isUnavailable = isUnavailableSuiteSkill(skill)
                  return (
                    <Card
                      key={skill.skillId}
                      className={`cursor-pointer space-y-2 p-4 transition-shadow hover:shadow-md ${isUnavailable ? 'opacity-60' : ''}`}
                      onClick={() => navigate({ to: `/space/${skill.namespace}/${encodeURIComponent(skill.slug)}` })}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="font-semibold">{skill.displayName}</span>
                          <p className="shrink-0 text-xs text-muted-foreground">
                            {skill.publisherName ?? '—'}({skill.ownerUsername ?? '—'})&nbsp;·&nbsp;{skill.secondaryDepartment || '其他部门'}
                          </p>
                        </div>
                        {skill.headlineVersion && (
                          <span className="rounded-full bg-secondary/60 px-2 py-0.5 font-mono text-xs">v{skill.headlineVersion.version}</span>
                        )}
                      </div>
                      <div className="flex min-w-0 items-center gap-4">
                        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={skill.summary}>
                          {skill.summary}
                        </p>
                        <div className="flex flex-shrink-0 items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                              />
                            </svg>
                            {formatCompactCount(skill.downloadCount)}
                          </span>
                          {canManage && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto gap-1 px-1 py-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={(event) => handleRemoveSkill(event, skill.skillId)}
                              disabled={removeSkillsMutation.isPending && removeSkillsMutation.variables?.skillIds.includes(skill.skillId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('suites.removeSkill')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="w-full flex-shrink-0 space-y-5 lg:w-80">
          <SuiteTagList namespace={namespace} slug={slug} canManage={canManage} />
          <SuiteLifecycleActions suite={suite} namespace={namespace} slug={slug} canManage={canManage} />
          <SuiteGovernanceActions suite={suite} canManage={canManage} />
        </aside>
      </div>

      <EditSuiteDialog suite={suite} namespace={namespace} slug={slug} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      {addSkillsDrawerOpen && (
        <AddSuiteSkillsDrawer
          suite={suite}
          namespace={namespace}
          slug={slug}
          open={addSkillsDrawerOpen}
          onOpenChange={setAddSkillsDrawerOpen}
        />
      )}
    </div>
  )
}
