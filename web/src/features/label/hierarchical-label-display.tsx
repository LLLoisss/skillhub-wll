import { Tag, X } from 'lucide-react'
import type { LabelItem } from '@/api/types'
import { cn } from '@/shared/lib/utils'
import { normalizeLabelHierarchy } from './label-hierarchy'

interface HierarchicalLabelDisplayProps {
  labels: LabelItem[]
  className?: string
  compact?: boolean
  onRemove?: (label: LabelItem) => void
  canRemove?: (label: LabelItem) => boolean
  getRemoveAriaLabel?: (label: LabelItem) => string
  isMutating?: boolean
}

interface HierarchicalLabelDisplayWithLoadingProps {
  labels?: LabelItem[]
  isLoading: boolean
  className?: string
}

function labelTone(type: string, primary = false) {
  if (type === 'PRIVILEGED') {
    return 'border-amber-500/35 bg-amber-50 text-amber-900'
  }
  return primary
    ? 'border-primary/25 bg-primary/10 text-primary'
    : 'border-border bg-background text-foreground'
}

/** Displays each parent and its children as a readable taxonomy path. */
export function HierarchicalLabelDisplay({
  labels,
  className,
  compact = false,
  onRemove,
  canRemove = () => true,
  getRemoveAriaLabel = (label) => `Remove ${label.displayName}`,
  isMutating = false,
}: HierarchicalLabelDisplayProps) {
  const hierarchy = normalizeLabelHierarchy(labels)
  if (hierarchy.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {hierarchy.map((parent) => {
        const children = parent.children ?? []
        const isStandaloneChild = parent.level === 2
        return (
          <div
            key={parent.slug}
            className={cn(
              'inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-card/80',
              compact ? 'px-1.5 py-1' : 'px-2 py-1.5 shadow-sm',
            )}
            title={parent.slug}
          >
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg border font-semibold',
                compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
                labelTone(parent.type, !isStandaloneChild),
              )}
            >
              {!compact && <Tag className="h-3 w-3" aria-hidden="true" />}
              {parent.displayName}
              {onRemove && canRemove(parent) && (
                <button
                  type="button"
                  onClick={() => onRemove(parent)}
                  disabled={isMutating}
                  className="-mr-1 rounded-full p-0.5 text-current/60 transition-colors hover:bg-current/10 hover:text-current disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={getRemoveAriaLabel(parent)}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </span>
            {children.map((child) => (
              <span key={child.slug} className="inline-flex items-center gap-1">
                <span
                  className={cn(
                    'inline-flex items-center rounded-lg border font-medium',
                    compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
                    labelTone(child.type),
                  )}
                  title={child.slug}
                >
                  {child.displayName}
                  {onRemove && canRemove(child) && (
                    <button
                      type="button"
                      onClick={() => onRemove(child)}
                      disabled={isMutating}
                      className="-mr-1 ml-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={getRemoveAriaLabel(child)}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Waits for the dedicated hierarchical-label endpoint before rendering.
 * Detail payloads may still contain legacy flat labels, so callers should not
 * use them as visual fallback data.
 */
export function HierarchicalLabelDisplayWithLoading({
  labels,
  isLoading,
  className,
}: HierarchicalLabelDisplayWithLoadingProps) {
  if (isLoading) {
    return (
      <div
        className={cn('flex flex-wrap gap-2', className)}
        aria-hidden="true"
      >
        <span className="h-8 w-28 animate-shimmer rounded-xl" />
        <span className="h-8 w-36 animate-shimmer rounded-xl" />
      </div>
    )
  }

  if (!labels?.length) return null
  return <HierarchicalLabelDisplay labels={labels} className={className} />
}
