import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Tag as TagIcon, X } from 'lucide-react'
import type { LabelItem } from '@/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { toast } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import { useVisibleLabels } from '@/shared/hooks/use-label-queries'
import { useDeleteSuiteLabel, usePutSuiteLabels, useSuiteLabels } from './use-suite-queries'
import { SUITE_DIALOG_ANIMATION_CLASS_NAME, useAnimatedDialogPresence } from './use-animated-dialog-presence'

const MAX_LABELS = 10

interface SuiteTagListProps {
  namespace: string
  slug: string
  canManage: boolean
}

function sortLabels(left: LabelItem, right: LabelItem) {
  return left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' })
    || left.slug.localeCompare(right.slug, undefined, { sensitivity: 'base' })
}

export function mergeSuiteLabels(currentLabels: LabelItem[], visibleLabels: LabelItem[]) {
  const labelsBySlug = new Map(visibleLabels.map((label) => [label.slug, label]))
  for (const label of currentLabels) labelsBySlug.set(label.slug, label)
  return [...labelsBySlug.values()].sort(sortLabels)
}

export function getSuiteLabelChanges(currentLabels: LabelItem[], selectedLabelSlugs: string[]) {
  const currentSlugs = new Set(currentLabels.map((label) => label.slug))
  const selectedSlugs = new Set(selectedLabelSlugs)
  return {
    addedSlugs: selectedLabelSlugs.filter((labelSlug) => !currentSlugs.has(labelSlug)),
    removedSlugs: currentLabels
      .map((label) => label.slug)
      .filter((labelSlug) => !selectedSlugs.has(labelSlug)),
  }
}

/**
 * Displays and manages an expert suite's labels. Suite labels reuse the shared LabelDefinition
 * catalog, so mutations bind and unbind existing labels by slug.
 */
export function SuiteTagList({ namespace, slug, canManage }: SuiteTagListProps) {
  const { t } = useTranslation()
  const { data: labels } = useSuiteLabels(namespace, slug)
  const { data: visibleLabels, isLoading: visibleLabelsLoading } = useVisibleLabels(canManage)
  const putLabelsMutation = usePutSuiteLabels()
  const deleteLabelMutation = useDeleteSuiteLabel()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const { isMounted: addDialogMounted, isVisible: addDialogVisible } = useAnimatedDialogPresence(addDialogOpen)
  const [selectedLabelSlugs, setSelectedLabelSlugs] = useState<string[]>([])
  const [isSavingLabels, setIsSavingLabels] = useState(false)
  const [labelToDelete, setLabelToDelete] = useState<{ slug: string; displayName: string } | null>(null)

  const currentLabels = useMemo(() => labels ?? [], [labels])
  const selectableLabels = useMemo(
    () => mergeSuiteLabels(currentLabels, visibleLabels ?? []),
    [currentLabels, visibleLabels],
  )
  const { addedSlugs, removedSlugs } = getSuiteLabelChanges(currentLabels, selectedLabelSlugs)
  const hasLabelChanges = addedSlugs.length > 0 || removedSlugs.length > 0
  const labelsMutationPending = isSavingLabels || putLabelsMutation.isPending || deleteLabelMutation.isPending

  const handleSaveLabels = async () => {
    if (!hasLabelChanges || labelsMutationPending) return

    setIsSavingLabels(true)
    try {
      await Promise.all([
        ...(addedSlugs.length > 0
          ? [putLabelsMutation.mutateAsync({ namespace, slug, labelSlugs: addedSlugs })]
          : []),
        ...removedSlugs.map((labelSlug) => deleteLabelMutation.mutateAsync({ namespace, slug, labelSlug })),
      ])
      toast.success(t('suites.tags.updateSuccess'))
      setSelectedLabelSlugs([])
      setAddDialogOpen(false)
    } catch (error) {
      toast.error(t('suites.tags.updateError'), error instanceof Error ? error.message : undefined)
    } finally {
      setIsSavingLabels(false)
    }
  }

  const handleOpenAddDialog = () => {
    setSelectedLabelSlugs(currentLabels.map((label) => label.slug))
    setAddDialogOpen(true)
  }

  const handleToggleLabel = (labelSlug: string) => {
    setSelectedLabelSlugs((current) => {
      if (current.includes(labelSlug)) return current.filter((slug) => slug !== labelSlug)
      if (current.length >= MAX_LABELS) {
        toast.error(t('suites.maxLabelsReached'))
        return current
      }
      return [...current, labelSlug]
    })
  }

  const handleDeleteLabel = () => {
    if (!labelToDelete) {
      return
    }

    deleteLabelMutation.mutate(
      { namespace, slug, labelSlug: labelToDelete.slug },
      {
        onSuccess: () => {
          toast.success(t('suites.tags.deleteSuccess'))
          setLabelToDelete(null)
        },
        onError: (error) => {
          toast.error(t('suites.tags.deleteError'), error instanceof Error ? error.message : undefined)
        },
      },
    )
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold font-heading text-foreground">{t('suites.tags.title')}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t('suites.tags.description')}</p>
      </div>

      {currentLabels.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {currentLabels.map((label) => (
            <span
              key={label.slug}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-foreground"
              title={label.slug}
            >
              {label.displayName}
              {canManage && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => setLabelToDelete({ slug: label.slug, displayName: label.displayName })}
                  aria-label={t('suites.tags.delete')}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('suites.tags.empty')}</p>
      )}

      {canManage && (
        <Button variant="outline" className="w-full" onClick={handleOpenAddDialog}>
          {t('suites.tags.add')}
        </Button>
      )}

      <Dialog
        open={addDialogMounted}
        onOpenChange={(nextOpen) => {
          setAddDialogOpen(nextOpen)
          if (!nextOpen) setSelectedLabelSlugs([])
        }}
      >
        <DialogContent
          data-state={addDialogVisible ? 'open' : 'closed'}
          className={`${SUITE_DIALOG_ANIMATION_CLASS_NAME} ${addDialogVisible ? '' : 'pointer-events-none'}`}
        >
          <DialogHeader>
            <DialogTitle>{t('suites.tags.add')}</DialogTitle>
            <DialogDescription>{t('suites.tags.addDescription')}</DialogDescription>
          </DialogHeader>
          {visibleLabelsLoading ? (
            <p className="text-sm text-muted-foreground">{t('suites.tags.loading')}</p>
          ) : selectableLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectableLabels.map((label) => {
                const selected = selectedLabelSlugs.includes(label.slug)
                const disabled = !selected && selectedLabelSlugs.length >= MAX_LABELS
                return (
                  <button
                    key={label.slug}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    title={disabled ? t('suites.maxLabelsReached') : label.slug}
                    onClick={() => handleToggleLabel(label.slug)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-secondary',
                      disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {selected && <Check className="h-3.5 w-3.5" />}
                    {label.displayName}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('suites.tags.noAvailable')}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t('dialog.cancel')}
            </Button>
            <Button
              onClick={handleSaveLabels}
              disabled={labelsMutationPending || !hasLabelChanges}
            >
              {t('dialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!labelToDelete}
        onOpenChange={(open) => !open && setLabelToDelete(null)}
        title={t('suites.tags.deleteConfirmTitle')}
        description={t('suites.tags.deleteConfirmDescription', { tag: labelToDelete?.displayName })}
        variant="destructive"
        onConfirm={handleDeleteLabel}
      />
    </Card>
  )
}
