import { useState, type MouseEvent } from 'react'
import { useNavigate, useParams, useRouterState, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bookmark, Trash2, User } from 'lucide-react'
import { ApiError, buildApiUrl } from '@/api/client'
import { buildSuiteDownloadPath } from '@/api/suite-client'
import { useAuth } from '@/features/auth/use-auth'
import { ShareButton } from '@/features/skill/share-button'
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
import { isUnavailableSuiteSkill } from '@/features/suite/suite-skill-eligibility'
import { NamespaceBadge } from '@/shared/components/namespace-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { formatCompactCount } from '@/shared/lib/number-format'
import { getSuiteSkillReturnTo, normalizeSkillDetailReturnTo } from '@/shared/lib/skill-navigation'
import { toast } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'

/** Detail page for one expert suite, including skill association management and governance actions. */
export function SuiteDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })
  const search = useSearch({ from: '/suites/$namespace/$slug' })
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
  const canInteract = suite.canInteract ?? true
  const ownerName = suite.publisherName || suite.ownerDisplayName

  const handleToggleStar = () => {
    if (!isAuthenticated) {
      navigate({
        to: '/login',
        search: { returnTo: `${location.pathname}${location.searchStr}${location.hash}` },
      })
      return
    }
    toggleStarMutation.mutate(isStarred)
  }

  const handleRate = (score: number) => {
    if (!isAuthenticated) {
      navigate({
        to: '/login',
        search: { returnTo: `${location.pathname}${location.searchStr}${location.hash}` },
      })
      return
    }
    rateMutation.mutate(score)
  }

  const handleBack = () => {
    const returnTo = normalizeSkillDetailReturnTo(search.returnTo)
    if (returnTo) {
      navigate({ to: returnTo })
      return
    }
    navigate({
      to: '/suites',
      search: { q: '', label: '', sort: 'newest', page: 0, starredOnly: false },
    })
  }

  const handleDownload = () => {
    if (!isAuthenticated) {
      navigate({
        to: '/login',
        search: { returnTo: `${location.pathname}${location.searchStr}${location.hash}` },
      })
      return
    }

    try {
      const link = document.createElement('a')
      link.href = buildApiUrl(buildSuiteDownloadPath(namespace, slug))
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast.error(
        t('suites.downloadErrorTitle'),
        error instanceof Error ? error.message : undefined,
      )
    }
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
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 animate-fade-up">
      <div className="flex-1 min-w-0 space-y-8">
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

        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 px-0 text-muted-foreground hover:text-foreground"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('skillDetail.back')}
          </Button>
          <div className="flex items-center gap-3 mb-1">
            <NamespaceBadge type="GLOBAL" name={`@${suite.namespace}`} />
            <span className="badge-soft badge-soft-blue">
              {suite.status === 'ARCHIVED' ? t('suites.status.archived') : t('suites.lifecycle.activeStatus')}
            </span>
          </div>
          <h1 className="text-balance text-4xl font-bold font-heading text-foreground">{suite.displayName}</h1>
          {ownerName && (
            <div className="flex min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/85 px-3 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 truncate">{t('skillDetail.authorLabel', { name: ownerName })}</span>
              </div>
            </div>
          )}
          {suite.summary && (
            <p className="text-lg text-muted-foreground leading-relaxed">{suite.summary}</p>
          )}
          {suite.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suite.labels.map((label) => (
                <span
                  key={label.slug}
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                    label.type === 'PRIVILEGED'
                      ? 'border-amber-500/40 bg-amber-100 text-amber-900'
                      : 'border-slate-300 bg-slate-100 text-slate-800',
                  )}
                >
                  {label.displayName}
                </span>
              ))}
            </div>
          )}
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
                    onClick={() => navigate({
                      to: `/space/${skill.namespace}/${encodeURIComponent(skill.slug)}`,
                      search: { returnTo: `${location.pathname}${location.searchStr}${location.hash}` },
                    })}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="font-semibold">{skill.displayName}</span>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {skill.publisherName ?? '—'} ({skill.ownerUsername ?? '—'})&nbsp;·&nbsp;{skill.secondaryDepartment || '—'}
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

      <aside className="w-full lg:w-80 flex-shrink-0 space-y-5">
        <Card className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{t('skillDetail.downloads')}</div>
            <div className="font-semibold text-foreground">{formatCompactCount(suite.downloadCount)}</div>
          </div>

          <div className="h-px bg-border/40" />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{t('skillDetail.rating')}</div>
            <div className="font-semibold text-foreground">
              {suite.ratingCount > 0 && suite.ratingAvg !== undefined
                ? `${suite.ratingAvg.toFixed(1)} / 5`
                : t('skillDetail.ratingNone')}
            </div>
          </div>

          <div className="h-px bg-border/40" />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">{t('skillDetail.namespaceLabel')}</div>
            <NamespaceBadge type="GLOBAL" name={`@${suite.namespace}`} />
          </div>

          <div className="h-px bg-border/40" />

          <div className="space-y-3">
            {canInteract ? (
              <>
                <Button
                  variant={isStarred ? 'default' : 'outline'}
                  size="sm"
                  className="justify-between"
                  onClick={handleToggleStar}
                  disabled={toggleStarMutation.isPending}
                  aria-pressed={isStarred}
                >
                  <Bookmark className={`w-4 h-4 mr-2 ${isStarred ? 'fill-current' : ''}`} />
                  {isStarred ? t('starButton.starred') : t('starButton.star')} ({suite.starCount})
                </Button>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <SuiteRatingInput value={currentRating} onChange={handleRate} disabled={rateMutation.isPending} />
                  </div>
                  {currentRating > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t('ratingInput.yourRating', { score: currentRating })}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('suites.interactionUnavailable')}</p>
            )}
            {!user && canInteract && (
              <p className="text-xs text-muted-foreground">{t('skillDetail.loginToRate')}</p>
            )}
          </div>
        </Card>

        <Button
          className="w-full"
          variant="outline"
          size="lg"
          onClick={handleDownload}
          disabled={suite.status === 'ARCHIVED'}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          {t('suites.download')}
        </Button>

        <ShareButton
          namespace={namespace}
          slug={slug}
          description={suite.summary}
          resourcePath={getSuiteSkillReturnTo(namespace, slug)}
          displayName={`${namespace.replace(/^@/, '')}/${suite.displayName}`}
          translationPrefix="suites.share"
          testId="share-suite-button"
        />

        <SuiteTagList
          namespace={namespace}
          slug={slug}
          initialLabels={suite.labels}
          canManage={canManage}
          isSuperAdmin={isSuperAdmin}
        />
        <SuiteLifecycleActions suite={suite} namespace={namespace} slug={slug} canManage={canManage} />
        <SuiteGovernanceActions suite={suite} canManage={canManage} />
      </aside>

      <EditSuiteDialog suite={suite} namespace={namespace} slug={slug} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      <AddSuiteSkillsDrawer
        suite={suite}
        namespace={namespace}
        slug={slug}
        open={addSkillsDrawerOpen}
        onOpenChange={setAddSkillsDrawerOpen}
      />
    </div>
  )
}
