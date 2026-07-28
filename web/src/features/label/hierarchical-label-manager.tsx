import { useState } from 'react'
import { ChevronRight, Layers3, Plus, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LabelItem } from '@/api/types'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { cn } from '@/shared/lib/utils'
import { Card } from '@/shared/ui/card'
import { HierarchicalLabelDisplay } from './hierarchical-label-display'
import { normalizeLabelHierarchy } from './label-hierarchy'

interface HierarchicalLabelManagerProps {
  title: string
  description: string
  currentLabels: LabelItem[]
  catalogLabels: LabelItem[]
  isCatalogLoading: boolean
  isMutating: boolean
  isSuperAdmin: boolean
  onAttach: (labels: LabelItem[]) => void | Promise<void>
  onDetach: (label: LabelItem) => void | Promise<void>
}

function canManage(label: LabelItem, isSuperAdmin: boolean) {
  return isSuperAdmin || label.type !== 'PRIVILEGED'
}

export function getManagedCurrentHierarchy(labels: LabelItem[]) {
  return normalizeLabelHierarchy(labels)
}

export function getAvailableLabelBranches(
  currentLabels: LabelItem[],
  catalogLabels: LabelItem[],
  isSuperAdmin: boolean,
) {
  const currentHierarchy = normalizeLabelHierarchy(currentLabels)
  const currentPrimary = currentHierarchy.find((label) => label.level !== 2)
  const assignedSlugs = new Set(currentHierarchy.flatMap((parent) => [
    parent.slug,
    ...(parent.children ?? []).map((child) => child.slug),
  ]))

  return normalizeLabelHierarchy(catalogLabels)
    .filter((parent) => parent.level !== 2)
    .filter((parent) => canManage(parent, isSuperAdmin))
    .filter((parent) => !currentPrimary || parent.slug === currentPrimary.slug)
    .map((parent) => ({
      ...parent,
      children: (parent.children ?? []).filter((child) => (
        !assignedSlugs.has(child.slug) && canManage(child, isSuperAdmin)
      )),
    }))
    .filter((parent) => (parent.children?.length ?? 0) > 0)
}

export function HierarchicalLabelManager({
  title,
  description,
  currentLabels,
  catalogLabels,
  isCatalogLoading,
  isMutating,
  isSuperAdmin,
  onAttach,
  onDetach,
}: HierarchicalLabelManagerProps) {
  const { t } = useTranslation()
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(new Set())
  const [pendingRemoval, setPendingRemoval] = useState<LabelItem | null>(null)
  const currentHierarchy = getManagedCurrentHierarchy(currentLabels)
  const availableBranches = getAvailableLabelBranches(currentLabels, catalogLabels, isSuperAdmin)
  const currentCount = currentHierarchy.reduce(
    (count, parent) => count + (parent.level === 2 ? 1 : (parent.children?.length ?? 0)),
    0,
  )

  const toggleExpanded = (slug: string) => {
    setExpandedSlugs((current) => {
      const next = new Set(current)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const handleRemove = (label: LabelItem) => {
    if (label.level === 2) {
      const parent = currentHierarchy.find((item) => (
        item.children?.some((child) => child.slug === label.slug)
      ))
      void onDetach(parent?.children?.length === 1 ? parent : label)
      return
    }
    setPendingRemoval(label)
  }

  const confirmBranchRemoval = async () => {
    if (!pendingRemoval) return
    await onDetach(pendingRemoval)
    setPendingRemoval(null)
  }

  return (
    <>
      <Card className="space-y-5 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold font-heading text-foreground">{title}</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {t('labelHierarchy.manager.current')}
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              {currentCount}
            </span>
          </div>
          {currentHierarchy.length > 0 ? (
            <HierarchicalLabelDisplay
              labels={currentHierarchy}
              compact
              onRemove={handleRemove}
              canRemove={(label) => canManage(label, isSuperAdmin)}
              getRemoveAriaLabel={(label) => t('labelHierarchy.manager.removeLabel', {
                label: label.displayName,
              })}
              isMutating={isMutating}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
              {t('labelHierarchy.manager.empty')}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t('labelHierarchy.manager.available')}
          </div>
          {isCatalogLoading ? (
            <div className="h-20 animate-shimmer rounded-xl" />
          ) : availableBranches.length > 0 ? (
            <div className="space-y-2">
              {availableBranches.map((parent) => {
                const children = parent.children ?? []
                const expanded = expandedSlugs.has(parent.slug)
                return (
                  <div key={parent.slug} className="overflow-hidden rounded-xl border border-border/70 bg-background">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(parent.slug)}
                      className="flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-primary/[0.035]"
                      aria-expanded={expanded}
                      aria-label={t(expanded
                        ? 'labelHierarchy.manager.collapseBranch'
                        : 'labelHierarchy.manager.expandBranch', {
                        label: parent.displayName,
                      })}
                    >
                      <Layers3 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {parent.displayName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t('labelHierarchy.manager.availableChildCount', { count: children.length })}
                        </span>
                      </span>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                          expanded && 'rotate-90',
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    {expanded && (
                      <div className="flex flex-wrap gap-2 border-t border-border/60 bg-secondary/15 px-3 py-3">
                        {children.map((child) => (
                          <button
                            key={child.slug}
                            type="button"
                            onClick={() => {
                              const currentPrimary = currentHierarchy.find((label) => label.level !== 2)
                              void onAttach(currentPrimary ? [child] : [parent, child])
                            }}
                            disabled={isMutating}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-primary/[0.04] hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={t('labelHierarchy.manager.addLabel', {
                              label: child.displayName,
                            })}
                            title={child.slug}
                          >
                            {child.displayName}
                            <Plus className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
              {t('labelHierarchy.manager.noAvailable')}
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null)
        }}
        title={t('labelHierarchy.manager.removeBranchTitle', {
          label: pendingRemoval?.displayName ?? '',
        })}
        description={t('labelHierarchy.manager.removePrimaryHint')}
        confirmText={t('labelHierarchy.manager.confirmRemove')}
        variant="destructive"
        onConfirm={confirmBranchRemoval}
      />
    </>
  )
}
