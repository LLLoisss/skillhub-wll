import { useEffect, useState, type MouseEvent } from 'react'
import { ChevronRight, Eye, EyeOff, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AdminLabelInput, LabelDefinition, LabelTranslation } from '@/api/types'
import { normalizeLabelHierarchy, resolveLabelDisplayName } from '@/features/label/label-hierarchy'
import {
  useAdminLabelDefinitions,
  useCreateAdminLabel,
  useDeleteAdminLabel,
  useUpdateAdminLabel,
  useUpdateAdminLabelSortOrder,
} from '@/features/admin/use-admin-labels'
import { toast } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type LabelFormState = AdminLabelInput
type DialogState = { level: 1 | 2; definition?: LabelDefinition } | null

const EMPTY_TRANSLATION: LabelTranslation = { locale: '', displayName: '' }
const LABEL_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

function toFormState(definition?: LabelDefinition, parentId = 0): LabelFormState {
  return {
    slug: definition?.slug ?? '',
    type: definition?.type === 'PRIVILEGED' ? 'PRIVILEGED' : 'RECOMMENDED',
    visibleInFilter: definition?.visibleInFilter ?? true,
    sortOrder: definition?.sortOrder ?? 0,
    parentId: definition?.parentId ?? parentId,
    translations: definition?.translations.length
      ? definition.translations
      : [{ ...EMPTY_TRANSLATION }],
  }
}

export function normalizeLabelFormState(form: LabelFormState): LabelFormState {
  return {
    ...form,
    slug: form.slug.trim().toLowerCase(),
    sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
    translations: form.translations
      .map((translation) => ({
        locale: translation.locale.trim().replace(/_/g, '-').toLowerCase(),
        displayName: translation.displayName.trim(),
      }))
      .filter((translation) => translation.locale && translation.displayName),
  }
}

export function validateLabelFormState(form: LabelFormState): {
  titleKey: string
  descriptionKey: string
} | null {
  if (!form.slug) {
    return {
      titleKey: 'adminLabels.validationSlugTitle',
      descriptionKey: 'adminLabels.validationSlugDescription',
    }
  }
  if (!LABEL_SLUG_PATTERN.test(form.slug) || form.slug.includes('--')) {
    return {
      titleKey: 'adminLabels.validationSlugTitle',
      descriptionKey: 'adminLabels.validationSlugPatternDescription',
    }
  }
  if (form.translations.length === 0) {
    return {
      titleKey: 'adminLabels.validationTranslationsTitle',
      descriptionKey: 'adminLabels.validationTranslationsDescription',
    }
  }
  if (new Set(form.translations.map((translation) => translation.locale)).size !== form.translations.length) {
    return {
      titleKey: 'adminLabels.validationTranslationsTitle',
      descriptionKey: 'adminLabels.validationDuplicateLocaleDescription',
    }
  }
  return null
}

function moveItem(definitions: LabelDefinition[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= definitions.length) return definitions
  const next = definitions.slice()
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next.map((definition, index) => ({ ...definition, sortOrder: index + 1 }))
}

interface LabelPaneProps {
  level: 1 | 2
  labels: LabelDefinition[]
  selectedSlug?: string
  locale: string
  isSorting: boolean
  onCreate: () => void
  onSelect?: (label: LabelDefinition) => void
  onEdit: (label: LabelDefinition) => void
  onDelete: (label: LabelDefinition) => void
  onMove: (index: number, direction: -1 | 1) => void
}

function LabelPane({
  level,
  labels,
  selectedSlug,
  locale,
  isSorting,
  onCreate,
  onSelect,
  onEdit,
  onDelete,
  onMove,
}: LabelPaneProps) {
  const { t } = useTranslation()
  const isPrimary = level === 1

  const stopAndRun = (event: MouseEvent, action: () => void) => {
    event.stopPropagation()
    action()
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold font-heading text-foreground">
            {t(isPrimary ? 'adminLabels.primaryTitle' : 'adminLabels.secondaryTitle')}
          </h2>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {labels.length}
          </span>
        </div>
        <Button size="sm" onClick={onCreate} disabled={!isPrimary && !selectedSlug}>
          <Plus className="mr-1 h-4 w-4" />
          {t(isPrimary ? 'adminLabels.createPrimaryAction' : 'adminLabels.createSecondaryAction')}
        </Button>
      </div>

      {labels.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          {t(isPrimary ? 'adminLabels.emptyPrimary' : 'adminLabels.emptySecondary')}
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden">
          <Table className="table-fixed [&_td]:px-2.5 [&_th]:px-2.5">
            <TableHeader>
              <TableRow>
                <TableHead className={isPrimary ? 'w-[29%]' : 'w-[36%]'}>
                  {t('adminLabels.colLabel')}
                </TableHead>
                {isPrimary && (
                  <TableHead className="w-14 text-center">
                    {t('adminLabels.colChildCount')}
                  </TableHead>
                )}
                <TableHead className="w-[88px]">{t('adminLabels.colType')}</TableHead>
                <TableHead className="w-[76px]">{t('adminLabels.colVisibility')}</TableHead>
                <TableHead className="w-12 text-center">{t('adminLabels.colSortOrder')}</TableHead>
                <TableHead className="w-[140px] text-right">{t('adminLabels.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.map((definition, index) => {
                const selected = isPrimary && selectedSlug === definition.slug
                return (
                  <TableRow
                    key={definition.slug}
                    className={cn(
                      isPrimary && 'cursor-pointer',
                      selected && 'bg-primary/[0.055] hover:bg-primary/[0.075]',
                    )}
                    onClick={() => onSelect?.(definition)}
                    aria-selected={selected}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {selected && <ChevronRight className="h-4 w-4 shrink-0 text-primary" />}
                        <div className="min-w-0">
                          <div className="break-words font-semibold leading-5 text-foreground">
                            {resolveLabelDisplayName(definition, locale)}
                          </div>
                          <div className="mt-0.5 break-all font-mono text-xs leading-4 text-muted-foreground">
                            {definition.slug}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {isPrimary && (
                      <TableCell className="text-center">
                        {definition.childCount ?? definition.children?.length ?? 0}
                      </TableCell>
                    )}
                    <TableCell>
                      <span className={cn(
                        'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
                        definition.type === 'PRIVILEGED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-50 text-indigo-700',
                      )}>
                        {t(definition.type === 'PRIVILEGED' ? 'adminLabels.typePrivileged' : 'adminLabels.typeRecommended')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        {definition.visibleInFilter
                          ? <Eye className="h-3.5 w-3.5 text-emerald-600" />
                          : <EyeOff className="h-3.5 w-3.5" />}
                        {t(definition.visibleInFilter ? 'adminLabels.visibilityVisibleShort' : 'adminLabels.visibilityHiddenShort')}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">{definition.sortOrder}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(event) => stopAndRun(event, () => onMove(index, -1))}
                          disabled={index === 0 || isSorting}
                          title={t('adminLabels.moveUp')}
                          aria-label={t('adminLabels.moveUp')}
                        >
                          ↑
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(event) => stopAndRun(event, () => onMove(index, 1))}
                          disabled={index === labels.length - 1 || isSorting}
                          title={t('adminLabels.moveDown')}
                          aria-label={t('adminLabels.moveDown')}
                        >
                          ↓
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(event) => stopAndRun(event, () => onEdit(definition))}
                          title={t('adminLabels.editAction')}
                          aria-label={t('adminLabels.editAction')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={(event) => stopAndRun(event, () => onDelete(definition))}
                          title={t('adminLabels.deleteAction')}
                          aria-label={t('adminLabels.deleteAction')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}

export function AdminLabelsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language || 'en'
  const { data: definitions, isLoading } = useAdminLabelDefinitions()
  const createMutation = useCreateAdminLabel()
  const updateMutation = useUpdateAdminLabel()
  const deleteMutation = useDeleteAdminLabel()
  const sortMutation = useUpdateAdminLabelSortOrder()

  const parents = normalizeLabelHierarchy(definitions ?? [])
    .filter((label) => label.level !== 2)
  const [selectedParentSlug, setSelectedParentSlug] = useState<string>()
  const selectedParent = parents.find((label) => label.slug === selectedParentSlug) ?? parents[0]
  const children = (selectedParent?.children ?? []).slice()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [pendingDelete, setPendingDelete] = useState<LabelDefinition | null>(null)
  const [form, setForm] = useState<LabelFormState>(toFormState())

  useEffect(() => {
    if (parents.length > 0 && !parents.some((label) => label.slug === selectedParentSlug)) {
      setSelectedParentSlug(parents[0].slug)
    }
  }, [parents, selectedParentSlug])

  const openCreate = (level: 1 | 2) => {
    if (level === 2 && !selectedParent?.id) return
    setForm(toFormState(undefined, level === 1 ? 0 : selectedParent!.id))
    setDialog({ level })
  }

  const openEdit = (definition: LabelDefinition) => {
    setForm(toFormState(definition))
    setDialog({ level: definition.level === 2 ? 2 : 1, definition })
  }

  const closeDialog = () => {
    setDialog(null)
    setForm(toFormState())
  }

  const handleTranslationChange = (index: number, field: keyof LabelTranslation, value: string) => {
    setForm((current) => ({
      ...current,
      translations: current.translations.map((translation, itemIndex) =>
        itemIndex === index ? { ...translation, [field]: value } : translation),
    }))
  }

  const handleSubmit = async () => {
    const normalized = normalizeLabelFormState(form)
    const validationError = validateLabelFormState(normalized)
    if (validationError) {
      toast.error(t(validationError.titleKey), t(validationError.descriptionKey))
      return
    }

    try {
      if (dialog?.definition) {
        await updateMutation.mutateAsync({
          slug: dialog.definition.slug,
          request: {
            type: normalized.type,
            visibleInFilter: normalized.visibleInFilter,
            sortOrder: normalized.sortOrder,
            translations: normalized.translations,
          },
        })
        toast.success(t('adminLabels.updateSuccessTitle'), t('adminLabels.updateSuccessDescription'))
      } else {
        await createMutation.mutateAsync({
          ...normalized,
          parentId: dialog?.level === 2 ? selectedParent?.id : 0,
        })
        toast.success(t('adminLabels.createSuccessTitle'), t('adminLabels.createSuccessDescription'))
      }
      closeDialog()
    } catch (error) {
      toast.error(
        dialog?.definition ? t('adminLabels.updateErrorTitle') : t('adminLabels.createErrorTitle'),
        error instanceof Error ? error.message : t('adminLabels.fallbackErrorDescription'),
      )
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.slug)
      toast.success(t('adminLabels.deleteSuccessTitle'), t('adminLabels.deleteSuccessDescription'))
      if (pendingDelete.slug === selectedParentSlug) setSelectedParentSlug(undefined)
      setPendingDelete(null)
    } catch (error) {
      toast.error(
        t('adminLabels.deleteErrorTitle'),
        error instanceof Error ? error.message : t('adminLabels.fallbackErrorDescription'),
      )
    }
  }

  const handleMove = async (items: LabelDefinition[], index: number, direction: -1 | 1) => {
    const reordered = moveItem(items, index, index + direction)
    try {
      await sortMutation.mutateAsync(reordered.map((label) => ({ slug: label.slug, sortOrder: label.sortOrder })))
      toast.success(t('adminLabels.sortSuccessTitle'), t('adminLabels.sortSuccessDescription'))
    } catch (error) {
      toast.error(
        t('adminLabels.sortErrorTitle'),
        error instanceof Error ? error.message : t('adminLabels.fallbackErrorDescription'),
      )
    }
  }

  const editing = Boolean(dialog?.definition)
  const dialogLevel = dialog?.level ?? 1

  return (
    <div className="space-y-7 animate-fade-up">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold font-heading">{t('adminLabels.title')}</h1>
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <p className="mt-2 text-lg text-muted-foreground">{t('adminLabels.hierarchySubtitle')}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <div className="h-80 animate-shimmer rounded-xl" />
          <div className="h-80 animate-shimmer rounded-xl" />
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <LabelPane
            level={1}
            labels={parents}
            selectedSlug={selectedParent?.slug}
            locale={locale}
            isSorting={sortMutation.isPending}
            onCreate={() => openCreate(1)}
            onSelect={(label) => setSelectedParentSlug(label.slug)}
            onEdit={openEdit}
            onDelete={setPendingDelete}
            onMove={(index, direction) => handleMove(parents, index, direction)}
          />
          <LabelPane
            level={2}
            labels={children}
            selectedSlug={selectedParent?.slug}
            locale={locale}
            isSorting={sortMutation.isPending}
            onCreate={() => openCreate(2)}
            onEdit={openEdit}
            onDelete={setPendingDelete}
            onMove={(index, direction) => handleMove(children, index, direction)}
          />
        </div>
      )}

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="w-[min(calc(100vw-2rem),44rem)]">
          <DialogHeader>
            <DialogTitle>
              {t(editing
                ? dialogLevel === 1 ? 'adminLabels.editPrimaryTitle' : 'adminLabels.editSecondaryTitle'
                : dialogLevel === 1 ? 'adminLabels.createPrimaryTitle' : 'adminLabels.createSecondaryTitle')}
            </DialogTitle>
            <DialogDescription>
              {dialogLevel === 2 && selectedParent
                ? t('adminLabels.secondaryParentDescription', {
                    label: resolveLabelDisplayName(selectedParent, locale),
                  })
                : t(editing ? 'adminLabels.editDialogDescription' : 'adminLabels.createDialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label-slug">{t('adminLabels.formSlug')}</Label>
              <Input
                id="label-slug"
                value={form.slug}
                disabled={editing}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label-type">{t('adminLabels.formType')}</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((current) => ({
                  ...current,
                  type: value as LabelFormState['type'],
                }))}
              >
                <SelectTrigger id="label-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECOMMENDED">{t('adminLabels.typeRecommended')}</SelectItem>
                  <SelectItem value="PRIVILEGED">{t('adminLabels.typePrivileged')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label-visibility">{t('adminLabels.formVisibility')}</Label>
              <Select
                value={form.visibleInFilter ? 'visible' : 'hidden'}
                onValueChange={(value) => setForm((current) => ({
                  ...current,
                  visibleInFilter: value === 'visible',
                }))}
              >
                <SelectTrigger id="label-visibility"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">{t('adminLabels.visibilityVisible')}</SelectItem>
                  <SelectItem value="hidden">{t('adminLabels.visibilityHidden')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label-sort-order">{t('adminLabels.formSortOrder')}</Label>
              <Input
                id="label-sort-order"
                type="number"
                value={String(form.sortOrder)}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value),
                }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">{t('adminLabels.formTranslations')}</div>
                <div className="text-xs text-muted-foreground">{t('adminLabels.formTranslationsHint')}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm((current) => ({
                  ...current,
                  translations: [...current.translations, { ...EMPTY_TRANSLATION }],
                }))}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t('adminLabels.addTranslation')}
              </Button>
            </div>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {form.translations.map((translation, index) => (
                <div
                  key={`${dialog?.definition?.slug ?? 'new'}-${index}`}
                  className="grid gap-3 rounded-xl border border-border/60 p-3 md:grid-cols-[140px_minmax(0,1fr)_88px]"
                >
                  <Input
                    placeholder={t('adminLabels.translationLocalePlaceholder')}
                    value={translation.locale}
                    onChange={(event) => handleTranslationChange(index, 'locale', event.target.value)}
                  />
                  <Input
                    placeholder={t('adminLabels.translationDisplayNamePlaceholder')}
                    value={translation.displayName}
                    onChange={(event) => handleTranslationChange(index, 'displayName', event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm((current) => ({
                      ...current,
                      translations: current.translations.length === 1
                        ? [{ ...EMPTY_TRANSLATION }]
                        : current.translations.filter((_, itemIndex) => itemIndex !== index),
                    }))}
                  >
                    {t('adminLabels.removeTranslation')}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('adminLabels.cancelAction')}</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? t('adminLabels.saveAction') : t('adminLabels.createAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminLabels.deleteDialogTitle')}</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? t(
                    pendingDelete.level === 2
                      ? 'adminLabels.deleteSecondaryDescription'
                      : 'adminLabels.deletePrimaryDescription',
                    {
                      label: resolveLabelDisplayName(pendingDelete, locale),
                      count: pendingDelete.childCount ?? pendingDelete.children?.length ?? 0,
                    },
                  )
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>{t('adminLabels.cancelAction')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {t('adminLabels.deleteAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
