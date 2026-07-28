import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, X } from 'lucide-react'
import type { LabelItem } from '@/api/types'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/lib/toast'
import { normalizeLabelHierarchy } from './label-hierarchy'

interface HierarchicalLabelMultiSelectProps {
  labels: LabelItem[]
  selectedPrimarySlug: string
  selectedSlugs: string[]
  onPrimaryChange: (slug: string) => void
  onChange: (slugs: string[]) => void
  maxCount?: number
  id?: string
  disabled?: boolean
}

const INPUT_CONTAINER_CLASS_NAME = cn(
  'flex min-h-11 w-full items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-3 py-2 text-sm text-foreground',
  'ring-offset-background transition-all duration-200',
  'hover:border-primary/30 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/40',
  'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
)

export function filterSelectableLabelHierarchy(labels: LabelItem[], canUsePrivileged: boolean) {
  return normalizeLabelHierarchy(labels)
    .filter((parent) => canUsePrivileged || parent.type !== 'PRIVILEGED')
    .map((parent) => ({
      ...parent,
      children: (parent.children ?? []).filter(
        (child) => canUsePrivileged || child.type !== 'PRIVILEGED',
      ),
    }))
}

export function filterLabelsBySearch(labels: LabelItem[], search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase()
  if (!normalizedSearch) return labels
  return labels.filter((label) => (
    label.displayName.toLocaleLowerCase().includes(normalizedSearch)
    || label.slug.toLocaleLowerCase().includes(normalizedSearch)
  ))
}

export function toggleLabelSelection(selectedSlugs: string[], slug: string, maxCount: number) {
  if (selectedSlugs.includes(slug)) {
    return selectedSlugs.filter((selectedSlug) => selectedSlug !== slug)
  }
  if (selectedSlugs.length >= maxCount) {
    return selectedSlugs
  }
  return [...selectedSlugs, slug]
}

function SelectionCheck({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-transparent',
      )}
      aria-hidden="true"
    >
      <Check className="h-3 w-3" />
    </span>
  )
}

interface SelectionTagProps {
  label: LabelItem
  onRemove: () => void
  disabled: boolean
  removeLabel: string
}

function SelectionTag({ label, onRemove, disabled, removeLabel }: SelectionTagProps) {
  return (
    <span
      className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-background px-2.5 py-1 text-xs font-medium text-foreground"
      title={label.displayName}
    >
      <span className="max-w-32 truncate">{label.displayName}</span>
      <button
        type="button"
        className="rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        onClick={(event) => {
          event.stopPropagation()
          onRemove()
        }}
        aria-label={removeLabel}
        disabled={disabled}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}

export function HierarchicalLabelMultiSelect({
  labels,
  selectedPrimarySlug,
  selectedSlugs,
  onPrimaryChange,
  onChange,
  maxCount = 10,
  id,
  disabled = false,
}: HierarchicalLabelMultiSelectProps) {
  const { t } = useTranslation()
  const [primaryOpen, setPrimaryOpen] = useState(false)
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const [primarySearch, setPrimarySearch] = useState('')
  const [secondarySearch, setSecondarySearch] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const primaryInputRef = useRef<HTMLInputElement>(null)
  const secondaryInputRef = useRef<HTMLInputElement>(null)

  const hierarchy = useMemo(() => normalizeLabelHierarchy(labels), [labels])
  const selectedPrimary = hierarchy.find((label) => label.slug === selectedPrimarySlug)
  const secondaryLabels = selectedPrimary?.children ?? []
  const selectedSet = new Set(selectedSlugs)
  const selectedLabels = selectedSlugs.map((slug) => (
    secondaryLabels.find((label) => label.slug === slug)
    ?? { slug, displayName: slug, type: 'RECOMMENDED' as const }
  ))
  const filteredPrimaryLabels = filterLabelsBySearch(hierarchy, primarySearch)
  const filteredSecondaryLabels = filterLabelsBySearch(secondaryLabels, secondarySearch)
  const maxReached = selectedSlugs.length >= maxCount

  const closePrimary = () => {
    setPrimaryOpen(false)
    setPrimarySearch('')
  }

  const closeSecondary = () => {
    setSecondaryOpen(false)
    setSecondarySearch('')
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setPrimaryOpen(false)
        setSecondaryOpen(false)
        setPrimarySearch('')
        setSecondarySearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (primaryOpen) primaryInputRef.current?.focus()
  }, [primaryOpen])

  useEffect(() => {
    if (secondaryOpen) secondaryInputRef.current?.focus()
  }, [secondaryOpen])

  useEffect(() => {
    if (selectedPrimarySlug && !selectedPrimary) {
      onPrimaryChange('')
      onChange([])
      closeSecondary()
    }
  }, [onChange, onPrimaryChange, selectedPrimary, selectedPrimarySlug])

  const selectPrimary = (slug: string) => {
    if (slug !== selectedPrimarySlug) {
      onPrimaryChange(slug)
      onChange([])
    }
    closePrimary()
  }

  const clearPrimary = () => {
    onPrimaryChange('')
    onChange([])
    closePrimary()
    closeSecondary()
  }

  const toggleSecondary = (slug: string) => {
    if (maxReached && !selectedSet.has(slug)) {
      toast.error(t('publish.maxLabelsReached'))
      return
    }
    onChange(toggleLabelSelection(selectedSlugs, slug, maxCount))
  }

  if (hierarchy.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('suites.noLabelsAvailable')}</p>
  }

  return (
    <div ref={rootRef} className="grid gap-3 sm:grid-cols-2">
      <div className="relative space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          {t('publish.primaryLabel')}
        </div>
        <div
          className={cn(
            INPUT_CONTAINER_CLASS_NAME,
            primaryOpen && 'border-primary/50 ring-2 ring-primary/40',
          )}
          onClick={() => {
            if (disabled) return
            setPrimaryOpen(true)
            closeSecondary()
            primaryInputRef.current?.focus()
          }}
        >
          {selectedPrimary && (
            <SelectionTag
              label={selectedPrimary}
              onRemove={clearPrimary}
              disabled={disabled}
              removeLabel={t('publish.removeLabel', { label: selectedPrimary.displayName })}
            />
          )}
          <input
            ref={primaryInputRef}
            id={id ? `${id}-primary` : undefined}
            value={primarySearch}
            onChange={(event) => setPrimarySearch(event.target.value)}
            onFocus={() => {
              if (!disabled) {
                setPrimaryOpen(true)
                closeSecondary()
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') closePrimary()
              if (event.key === 'Enter' && filteredPrimaryLabels.length > 0) {
                event.preventDefault()
                selectPrimary(filteredPrimaryLabels[0].slug)
              }
            }}
            placeholder={primaryOpen
              ? t('publish.searchPrimaryLabel')
              : selectedPrimary
                ? ''
                : t('publish.selectPrimaryLabel')}
            className="min-w-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded={primaryOpen}
            aria-controls={id ? `${id}-primary-options` : undefined}
            disabled={disabled}
          />
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              primaryOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </div>

        {primaryOpen && (
          <div
            id={id ? `${id}-primary-options` : undefined}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
            role="listbox"
          >
            {filteredPrimaryLabels.length > 0 ? filteredPrimaryLabels.map((label) => (
              <button
                key={label.slug}
                type="button"
                role="option"
                aria-selected={selectedPrimarySlug === label.slug}
                onClick={() => selectPrimary(label.slug)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <SelectionCheck selected={selectedPrimarySlug === label.slug} />
                <span className="min-w-0 flex-1 truncate">{label.displayName}</span>
                <span className="max-w-28 truncate text-xs text-muted-foreground">
                  {label.slug}
                </span>
              </button>
            )) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t('publish.noLabelsFound')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          {t('publish.secondaryLabel')}
        </div>
        <div
          className={cn(
            INPUT_CONTAINER_CLASS_NAME,
            'flex-wrap',
            secondaryOpen && 'border-primary/50 ring-2 ring-primary/40',
          )}
          onClick={() => {
            if (disabled || !selectedPrimary) return
            setSecondaryOpen(true)
            closePrimary()
            secondaryInputRef.current?.focus()
          }}
        >
          {selectedLabels.map((label) => (
            <SelectionTag
              key={label.slug}
              label={label}
              onRemove={() => toggleSecondary(label.slug)}
              disabled={disabled}
              removeLabel={t('publish.removeLabel', { label: label.displayName })}
            />
          ))}
          <input
            ref={secondaryInputRef}
            id={id ? `${id}-secondary` : undefined}
            value={secondarySearch}
            onChange={(event) => setSecondarySearch(event.target.value)}
            onFocus={() => {
              if (!disabled && selectedPrimary) {
                setSecondaryOpen(true)
                closePrimary()
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeSecondary()
            }}
            placeholder={!selectedPrimary
              ? t('publish.selectPrimaryFirst')
              : secondaryOpen
                ? t('publish.searchSecondaryLabel')
                : selectedLabels.length > 0
                  ? ''
                  : t('publish.selectSecondaryLabel')}
            className="min-w-24 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded={secondaryOpen}
            aria-controls={id ? `${id}-secondary-options` : undefined}
            disabled={disabled || !selectedPrimary}
          />
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {selectedSlugs.length}/{maxCount}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              secondaryOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </div>

        {secondaryOpen && selectedPrimary && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
            {selectedSlugs.length > 0 && (
              <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {t('publish.selectedLabelsCount', { count: selectedSlugs.length })}
                </span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {t('publish.clearLabels')}
                </button>
              </div>
            )}

            <div
              id={id ? `${id}-secondary-options` : undefined}
              className="max-h-64 overflow-y-auto p-1"
              role="listbox"
              aria-multiselectable="true"
            >
              {filteredSecondaryLabels.length > 0 ? filteredSecondaryLabels.map((label) => {
                const selected = selectedSet.has(label.slug)
                const optionDisabled = !selected && maxReached
                return (
                  <button
                    key={label.slug}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={optionDisabled}
                    onClick={() => toggleSecondary(label.slug)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors',
                      optionDisabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <SelectionCheck selected={selected} />
                    <span className="min-w-0 flex-1 truncate">{label.displayName}</span>
                    <span className="max-w-28 truncate text-xs text-muted-foreground">
                      {label.slug}
                    </span>
                  </button>
                )
              }) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {secondaryLabels.length === 0
                    ? t('publish.noSecondaryLabels')
                    : t('publish.noLabelsFound')}
                </div>
              )}
              {maxReached && (
                <div className="mx-1 mt-1 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t('publish.maxLabelsReached')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
