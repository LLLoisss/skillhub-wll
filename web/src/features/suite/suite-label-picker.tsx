import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, X } from 'lucide-react'
import type { LabelItem } from '@/api/types'
import { toast } from '@/shared/lib/toast'

export type SuiteSelectableLabel = LabelItem & { id: number }

interface SuiteLabelPickerPropsBase {
  maxCount: number
}

interface SuiteLabelIdPickerProps extends SuiteLabelPickerPropsBase {
  labels: SuiteSelectableLabel[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}

interface SuiteLabelSlugPickerProps extends SuiteLabelPickerPropsBase {
  labels: LabelItem[]
  selectedSlugs: string[]
  onChange: (slugs: string[]) => void
}

type SuiteLabelPickerProps = SuiteLabelIdPickerProps | SuiteLabelSlugPickerProps

function sortLabels(left: LabelItem, right: LabelItem) {
  return left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' })
    || left.slug.localeCompare(right.slug, undefined, { sensitivity: 'base' })
}

function isSlugPicker(props: SuiteLabelPickerProps): props is SuiteLabelSlugPickerProps {
  return 'selectedSlugs' in props
}

export function SuiteLabelPicker(props: SuiteLabelPickerProps) {
  const { labels, maxCount } = props
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectableLabels = useMemo(() => labels.slice().sort(sortLabels), [labels])
  const selectedLabels = (isSlugPicker(props) ? props.selectedSlugs : props.selectedIds)
    .map((value) => selectableLabels.find((label) => isSlugPicker(props) ? label.slug === value : label.id === value))
    .filter((label): label is LabelItem => Boolean(label))
  const searchLower = search.toLowerCase()
  const filteredLabels = selectableLabels.filter((label) =>
    label.displayName.toLowerCase().includes(searchLower)
    || label.slug.toLowerCase().includes(searchLower)
  )
  const maxReached = (isSlugPicker(props) ? props.selectedSlugs : props.selectedIds).length >= maxCount

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearch('')
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

  const toggleLabel = (label: LabelItem) => {
    if (isSlugPicker(props)) {
      if (props.selectedSlugs.includes(label.slug)) {
        props.onChange(props.selectedSlugs.filter((item) => item !== label.slug))
        return
      }
      if (maxReached) {
        toast.error(t('suites.maxLabelsReached'))
        return
      }
      props.onChange([...props.selectedSlugs, label.slug])
      return
    }
    if (typeof label.id !== 'number') return
    if (props.selectedIds.includes(label.id)) {
      props.onChange(props.selectedIds.filter((item) => item !== label.id))
      return
    }
    if (maxReached) {
      toast.error(t('suites.maxLabelsReached'))
      return
    }
    props.onChange([...props.selectedIds, label.id])
  }

  const removeLabel = (label: LabelItem) => {
    if (isSlugPicker(props)) {
      props.onChange(props.selectedSlugs.filter((item) => item !== label.slug))
    } else if (typeof label.id === 'number') {
      props.onChange(props.selectedIds.filter((item) => item !== label.id))
    }
  }

  const isSelected = (label: LabelItem) => {
    if (isSlugPicker(props)) return props.selectedSlugs.includes(label.slug)
    return typeof label.id === 'number' && props.selectedIds.includes(label.id)
  }

  if (selectableLabels.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('suites.noLabelsAvailable')}</p>
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={[
          'flex min-h-11 w-full items-center gap-2 rounded-lg border bg-secondary/50 px-3 py-2 text-sm transition-all duration-200',
          open ? 'border-primary/50 ring-2 ring-primary/40 ring-offset-background' : 'border-input hover:border-primary/50',
        ].join(' ')}
        onClick={() => setOpen(true)}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {selectedLabels.map((label) => (
            <span
              key={label.slug}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground"
              title={label.slug}
            >
              <span className="max-w-36 truncate">{label.displayName}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  removeLabel(label)
                }}
                className="rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                aria-label={t('publish.removeLabel', { label: label.displayName })}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={open ? t('publish.searchLabels') : selectedLabels.length === 0 ? t('publish.selectLabels') : ''}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
          <div className="max-h-60 overflow-y-auto p-1">
            {maxReached && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t('suites.maxLabelsReached')}
              </div>
            )}
            {filteredLabels.length > 0 ? filteredLabels.map((label) => {
              const selected = isSelected(label)
              const disabled = maxReached && !selected
              return (
                <button
                  key={label.slug}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  disabled={disabled}
                  title={disabled ? t('suites.maxLabelsReached') : undefined}
                  className={[
                    'group relative flex w-full select-none items-center rounded-md py-2 pl-8 pr-4 text-left text-sm outline-none',
                    disabled
                      ? 'cursor-not-allowed text-muted-foreground opacity-50'
                      : 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
                  ].join(' ')}
                >
                  {selected && <Check className="absolute left-2 h-4 w-4" />}
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate group-hover:text-accent-foreground">(@{label.displayName})</span>
                    <span className="shrink-0 truncate text-xs text-muted-foreground group-hover:text-accent-foreground/70">{label.slug}</span>
                  </span>
                </button>
              )
            }) : (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                {t('publish.noLabelsFound')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

