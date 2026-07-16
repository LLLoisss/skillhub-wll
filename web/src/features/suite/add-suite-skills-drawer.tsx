import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import type { SuiteDetail } from '@/api/types'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useInfiniteSearchSkills } from '@/shared/hooks/use-skill-queries'
import { toast } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { useAddSuiteSkills } from './use-suite-queries'
import { isSelectableSuiteSkill } from './suite-skill-eligibility'

const MAX_SUITE_SKILLS = 50
const SEARCH_PAGE_SIZE = 20

interface AddSuiteSkillsDrawerProps {
  suite: SuiteDetail
  namespace: string
  slug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SkillOption {
  id: number
  displayName: string
  namespace: string
}

function matchesQuery(skill: SkillOption, query: string) {
  const normalized = query.trim().toLocaleLowerCase()
  return !normalized || `${skill.displayName} ${skill.namespace}`.toLocaleLowerCase().includes(normalized)
}

/** Side drawer for associating additional namespace skills with an expert suite. */
export function AddSuiteSkillsDrawer({ suite, namespace, slug, open, onOpenChange }: AddSuiteSkillsDrawerProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])
  const resultsRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const addSkillsMutation = useAddSuiteSkills()
  const debouncedQuery = useDebounce(query.trim(), 300)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteSearchSkills(
    { q: debouncedQuery, namespace, size: SEARCH_PAGE_SIZE },
    open && !!namespace,
  )

  const existingSkillIds = useMemo(() => new Set(suite.skills.map((skill) => skill.skillId)), [suite.skills])
  const selectedSkillIdSet = useMemo(() => new Set(selectedSkillIds), [selectedSkillIds])
  const reachedLimit = suite.skills.length + selectedSkillIds.length >= MAX_SUITE_SKILLS
  const skillOptions = useMemo(() => {
    const options = new Map<number, SkillOption>()

    for (const skill of suite.skills) {
      const option = { id: skill.skillId, displayName: skill.displayName, namespace: skill.namespace }
      if (matchesQuery(option, query)) options.set(option.id, option)
    }
    for (const skill of (data?.pages.flatMap((page) => page.items) ?? []).filter(isSelectableSuiteSkill)) {
      const option = { id: skill.id, displayName: skill.displayName, namespace: skill.namespace }
      if (matchesQuery(option, query)) options.set(option.id, option)
    }

    return [...options.values()]
  }, [data?.pages, query, suite.skills])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedSkillIds([])
    }
  }, [open])

  const toggleSkill = (skillId: number) => {
    if (existingSkillIds.has(skillId)) return
    setSelectedSkillIds((current) => {
      if (current.includes(skillId)) return current.filter((id) => id !== skillId)
      if (suite.skills.length + current.length >= MAX_SUITE_SKILLS) return current
      return [...current, skillId]
    })
  }

  useEffect(() => {
    const root = resultsRef.current
    const target = loadMoreRef.current
    if (!open || !hasNextPage || isFetchingNextPage || !root) {
      return undefined
    }

    let loadRequested = false
    const loadNextPage = () => {
      if (loadRequested) return
      loadRequested = true
      void fetchNextPage()
    }
    const checkScrollBoundary = () => {
      const distanceToBottom = root.scrollHeight - root.scrollTop - root.clientHeight
      if (distanceToBottom <= 80) loadNextPage()
    }
    const observer = target && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) loadNextPage()
          },
          { root, rootMargin: '0px 0px 80px 0px' },
        )
      : undefined
    if (target) observer?.observe(target)
    root.addEventListener('scroll', checkScrollBoundary, { passive: true })
    const animationFrameId = window.requestAnimationFrame(checkScrollBoundary)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      root.removeEventListener('scroll', checkScrollBoundary)
      observer?.disconnect()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, open, skillOptions.length])

  const handleSubmit = async () => {
    if (selectedSkillIds.length === 0) return

    try {
      await addSkillsMutation.mutateAsync({ namespace, slug, skillIds: selectedSkillIds })
      toast.success(t('suites.appendSuccessTitle'), t('suites.appendSuccessDescription'))
      onOpenChange(false)
    } catch (error) {
      toast.error(
        t('suites.appendErrorTitle'),
        error instanceof ApiError ? error.serverMessage || error.message : error instanceof Error ? error.message : undefined,
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 flex h-dvh max-h-none w-[min(100vw,28rem)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 shadow-2xl">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-5 pr-12 text-left">
          <DialogTitle className="text-left">{t('suites.appendSuiteSkills')}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('suites.skillSearchPlaceholder')}
              className="bg-white pl-9"
              autoFocus
            />
          </div>

          <div ref={resultsRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-border/60">
            {isFetching && skillOptions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">{t('suites.searching')}</p>
            ) : skillOptions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">{t('suites.noSkillsFound')}</p>
            ) : (
              <div className="divide-y divide-border/60">
                {skillOptions.map((skill) => {
                  const isExisting = existingSkillIds.has(skill.id)
                  const isSelected = selectedSkillIdSet.has(skill.id)
                  const checked = isExisting || isSelected
                  const disabled = isExisting || (reachedLimit && !isSelected)

                  return (
                    <button
                      key={skill.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      disabled={disabled}
                      onClick={() => toggleSkill(skill.id)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        isExisting
                          ? 'cursor-not-allowed bg-muted/60 text-muted-foreground opacity-70'
                          : disabled
                            ? 'cursor-not-allowed bg-secondary/20 text-muted-foreground'
                            : 'cursor-pointer hover:bg-secondary/40'
                      } w-full text-left`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isExisting
                            ? 'border-slate-400 bg-slate-400'
                            : checked
                              ? 'border-violet-600 bg-violet-600'
                              : 'border-border bg-white'
                        }`}
                        aria-hidden="true"
                      >
                        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 truncate font-medium">{skill.displayName}</span>
                      <span className="shrink-0 text-muted-foreground">@{skill.namespace}</span>
                    </button>
                  )
                })}
                {hasNextPage && (
                  <div ref={loadMoreRef} className="min-h-px" aria-live="polite">
                    {isFetchingNextPage && (
                      <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('suites.loadingMoreSkills')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {reachedLimit && (
            <p className="text-xs text-muted-foreground">{t('suites.skillPickerMaxReached')}</p>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('dialog.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={selectedSkillIds.length === 0 || addSkillsMutation.isPending}>
            {addSkillsMutation.isPending
              ? t('suites.appending')
              : t('suites.appendSelectedSkills', { count: selectedSkillIds.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
