import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { LabelItem } from '@/api/types'
import { Button } from '@/shared/ui/button'
import { findLabelBranch, normalizeLabelHierarchy } from './label-hierarchy'

interface HierarchicalLabelFilterProps {
  labels: LabelItem[]
  selectedSlug: string
  onSelect: (slug: string) => void
  leadingControl?: ReactNode
  disabled?: boolean
}

export function getNextPrimaryLabelSelection(
  selectedParentSlug: string | undefined,
  primarySlug: string,
) {
  return selectedParentSlug === primarySlug ? '' : primarySlug
}

export function getNextSecondaryLabelSelection(
  selectedSlug: string,
  secondarySlug: string,
  primarySlug: string,
) {
  return selectedSlug === secondarySlug ? primarySlug : secondarySlug
}

/** Shared two-step label filter used by both skill and expert-suite discovery. */
export function HierarchicalLabelFilter({
  labels,
  selectedSlug,
  onSelect,
  leadingControl,
  disabled = false,
}: HierarchicalLabelFilterProps) {
  const { t } = useTranslation()
  const hierarchy = normalizeLabelHierarchy(labels)
  const { parent: selectedParent } = findLabelBranch(hierarchy, selectedSlug)
  const selectedParentSlug = selectedParent?.slug
  const activeChildren = selectedParent?.children ?? []
  const rootRef = useRef<HTMLDivElement>(null)
  const primaryButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [pointerLeft, setPointerLeft] = useState(24)

  const togglePrimary = (slug: string) => {
    onSelect(getNextPrimaryLabelSelection(selectedParentSlug, slug))
  }

  const toggleSecondary = (slug: string) => {
    if (!selectedParentSlug) return
    onSelect(getNextSecondaryLabelSelection(selectedSlug, slug, selectedParentSlug))
  }

  useEffect(() => {
    if (!selectedParentSlug || !rootRef.current) return

    const updatePointer = () => {
      const root = rootRef.current
      const button = primaryButtonRefs.current.get(selectedParentSlug)
      if (!root || !button) return
      const rootRect = root.getBoundingClientRect()
      const buttonRect = button.getBoundingClientRect()
      const center = buttonRect.left - rootRect.left + buttonRect.width / 2
      setPointerLeft(Math.max(14, Math.min(center, rootRect.width - 14)))
    }

    updatePointer()
    window.addEventListener('resize', updatePointer)
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updatePointer)
    resizeObserver?.observe(rootRef.current)

    return () => {
      window.removeEventListener('resize', updatePointer)
      resizeObserver?.disconnect()
    }
  }, [selectedParentSlug])

  if (hierarchy.length === 0 && !leadingControl) return null

  return (
    <div
      ref={rootRef}
      className="relative min-w-0 flex-1"
      aria-label={t('labelHierarchy.filterAriaLabel')}
    >
      <div className="flex min-w-0 flex-wrap gap-2">
        {leadingControl}
        {hierarchy.map((label) => {
          const active = selectedParent?.slug === label.slug
          return (
            <Button
              key={label.slug}
              ref={(node) => {
                if (node) primaryButtonRefs.current.set(label.slug, node)
                else primaryButtonRefs.current.delete(label.slug)
              }}
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => togglePrimary(label.slug)}
              disabled={disabled}
              aria-pressed={active}
            >
              {label.displayName}
            </Button>
          )
        })}
      </div>

      {selectedParent && activeChildren.length > 0 && (
        <div className="relative mt-3 rounded-xl border border-primary/20 bg-transparent px-3 py-3">
          <span
            className="pointer-events-none absolute -top-[7px] h-3.5 w-3.5 rotate-45 border-l border-t border-primary/20 bg-background"
            style={{ left: `${pointerLeft - 7}px` }}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-wrap gap-2">
            {activeChildren.map((label) => (
              <Button
                key={label.slug}
                variant={selectedSlug === label.slug ? 'default' : 'outline'}
                size="sm"
                className={selectedSlug === label.slug
                  ? 'h-7 rounded-md px-2.5 text-[11px] font-normal'
                  : 'h-7 rounded-md px-2.5 text-[11px] font-normal text-muted-foreground hover:text-foreground'}
                onClick={() => toggleSecondary(label.slug)}
                disabled={disabled}
                aria-pressed={selectedSlug === label.slug}
              >
                {label.displayName}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
