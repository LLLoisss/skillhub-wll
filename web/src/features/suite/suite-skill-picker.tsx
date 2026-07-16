import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react'
import type { SkillSummary } from '@/api/types'
import { Button } from '@/shared/ui/button'
import { SELECT_TRIGGER_CLASS_NAME } from '@/shared/ui/select'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useInfiniteSearchSkills } from '@/shared/hooks/use-skill-queries'
import { isSelectableSuiteSkill } from './suite-skill-eligibility'

export interface SuiteSkillPickerItem {
  skillId: number
  namespace: string
  slug: string
  displayName: string
  summary?: string
  ownerUsername?: string
  secondaryDepartment?: string
}

interface SuiteSkillPickerProps {
  selected: SuiteSkillPickerItem[]
  onChange: (items: SuiteSkillPickerItem[]) => void
  maxCount?: number
  excludedSkillIds?: number[]
  namespace?: string
}

const SEARCH_PAGE_SIZE = 20

function toPickerItem(skill: SkillSummary): SuiteSkillPickerItem {
  return {
    skillId: skill.id,
    namespace: skill.namespace,
    slug: skill.slug,
    displayName: skill.displayName,
    summary: skill.summary,
    ownerUsername: skill.ownerUsername,
    secondaryDepartment: skill.secondaryDepartment,
  }
}

function includesSearchText(skill: SkillSummary, search: string) {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return true
  return [
    skill.displayName,
    skill.namespace,
    skill.slug,
    skill.summary,
    skill.ownerUsername,
    skill.secondaryDepartment,
  ].some((value) => value?.toLowerCase().includes(normalized))
}

function SkillOptionContent({ item }: { item: SuiteSkillPickerItem }) {
  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-foreground group-hover:text-accent-foreground">
          {item.displayName} (@{item.namespace})
        </span>
        <span className="shrink-0 truncate text-xs text-muted-foreground group-hover:text-accent-foreground/70">
          {item.ownerUsername || '-'} · {item.secondaryDepartment || '-'}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground group-hover:text-accent-foreground/70" title={item.summary || '-'}>{item.summary || '-'}</p>
    </>
  )
}

function SelectedSkillContent({ item }: { item: SuiteSkillPickerItem }) {
  return (
    <>
      <div className="truncate text-sm font-medium text-foreground">
        {item.displayName} (@{item.namespace})
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground">
        {item.ownerUsername || '-'} · {item.secondaryDepartment || '-'}
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={item.summary || '-'}>{item.summary || '-'}</p>
    </>
  )
}

/**
 * Skill search + selection widget shared by the create and edit suite dialogs.
 *
 * Search is scoped to the current suite namespace. The client also enforces the suite skill
 * eligibility rules so unsuitable records returned by the backend are never offered.
 */
export function SuiteSkillPicker({ selected, onChange, maxCount = 50, excludedSkillIds = [], namespace }: SuiteSkillPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
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
  const selectedIds = useMemo(() => new Set(selected.map((item) => item.skillId)), [selected])
  const excludedIds = useMemo(() => new Set(excludedSkillIds), [excludedSkillIds])
  const isFull = selected.length >= maxCount
  const filteredSkills = (data?.pages.flatMap((page) => page.items) ?? [])
    .filter(isSelectableSuiteSkill)
    .filter((skill) => includesSearchText(skill, query))

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
  }, [fetchNextPage, filteredSkills.length, hasNextPage, isFetchingNextPage, open])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  const handleAdd = (skill: SkillSummary) => {
    if (excludedIds.has(skill.id) || isFull) {
      return
    }
    onChange([...selected, toPickerItem(skill)])
  }

  const handleRemove = (skillId: number) => {
    onChange(selected.filter((item) => item.skillId !== skillId))
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= selected.length) {
      return
    }
    const next = selected.slice()
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    onChange(next)
  }

  const closedPlaceholder = isFull
    ? t('suites.skillPickerMaxReached')
    : selected.length > 0
      ? t('suites.skillPickerSelectedCount', { count: selected.length })
      : t('suites.skillPickerEmptyClosed')

  return (
    <div ref={rootRef} className="space-y-3">
      <div>
        {open ? (
          <div className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-primary/50 bg-white px-4 py-2 text-sm ring-2 ring-primary/40 ring-offset-background transition-all duration-200">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('suites.skillSearchPlaceholder')}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOpen(true)
              setQuery('')
            }}
            className={SELECT_TRIGGER_CLASS_NAME}
          >
            <span className="text-muted-foreground line-clamp-1 text-left">{closedPlaceholder}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        )}

        {open && (
          <div className="mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
            <div ref={resultsRef} className="max-h-72 overflow-y-auto p-1">
              {!namespace ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">{t('suites.selectNamespaceBeforeSkills')}</div>
              ) : isFetching && filteredSkills.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">{t('suites.searching')}</div>
              ) : filteredSkills.length > 0 ? filteredSkills.map((skill) => {
                const isSelected = selectedIds.has(skill.id)
                const isExcluded = excludedIds.has(skill.id)
                const disabled = isExcluded || (isFull && !isSelected)
                const item = toPickerItem(skill)
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => isSelected ? handleRemove(skill.id) : handleAdd(skill)}
                    disabled={disabled}
                    title={disabled && isFull && !isSelected ? t('suites.skillPickerMaxReached') : undefined}
                    className={[
                      'group relative flex w-full select-none items-start rounded-md py-2.5 pl-8 pr-4 text-left outline-none',
                      disabled
                        ? 'cursor-not-allowed text-muted-foreground opacity-60'
                        : 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
                    ].join(' ')}
                  >
                    {isSelected && <Check className="absolute left-2 top-3 h-4 w-4" />}
                    <span className="min-w-0 flex-1">
                      <SkillOptionContent item={item} />
                    </span>
                  </button>
                )
              }) : (
                <div className="px-3 py-4 text-sm text-muted-foreground">{t('suites.noSkillsFound')}</div>
              )}
              {hasNextPage && (
                <div ref={loadMoreRef} className="min-h-px" aria-live="polite">
                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('suites.loadingMoreSkills')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {t('suites.selectedSkills', { count: selected.length, max: maxCount })}
        </div>
        {selected.length > 0 ? (
          <div className="space-y-2">
            {selected.map((item, index) => (
              <div
                key={item.skillId}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <SelectedSkillContent item={item} />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => handleMove(index, -1)}
                    aria-label={t('suites.moveSkillUp')}
                    title={t('suites.moveSkillUp')}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === selected.length - 1}
                    onClick={() => handleMove(index, 1)}
                    aria-label={t('suites.moveSkillDown')}
                    title={t('suites.moveSkillDown')}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(item.skillId)} aria-label={t('suites.removeSkill')} title={t('suites.removeSkill')}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('suites.noSkillsSelected')}</p>
        )}
      </div>
    </div>
  )
}
