import { useTranslation } from 'react-i18next'
import type { LabelItem } from '@/api/types'
import { HierarchicalLabelManager } from '@/features/label/hierarchical-label-manager'
import { definitionsToLabelItems } from '@/features/label/label-hierarchy'
import { useAdminLabelDefinitions, useVisibleLabels } from '@/shared/hooks/use-label-queries'
import { toast } from '@/shared/lib/toast'
import { useDeleteSuiteLabel, usePutSuiteLabels, useSuiteLabels } from './use-suite-queries'

interface SuiteTagListProps {
  namespace: string
  slug: string
  initialLabels: LabelItem[]
  canManage: boolean
  isSuperAdmin: boolean
}

export function SuiteTagList({
  namespace,
  slug,
  initialLabels,
  canManage,
  isSuperAdmin,
}: SuiteTagListProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language || 'en'
  const { data: suiteLabels } = useSuiteLabels(namespace, slug, canManage)
  const { data: visibleLabels, isLoading: visibleLabelsLoading } = useVisibleLabels(canManage && !isSuperAdmin)
  const { data: adminDefinitions, isLoading: adminDefinitionsLoading } = useAdminLabelDefinitions(canManage && isSuperAdmin)
  const attachMutation = usePutSuiteLabels()
  const detachMutation = useDeleteSuiteLabel()

  if (!canManage) return null

  const catalogLabels = isSuperAdmin
    ? definitionsToLabelItems(adminDefinitions ?? [], locale)
    : (visibleLabels ?? [])

  const handleAttach = (labels: LabelItem[]) => {
    attachMutation.mutate(
      { namespace, slug, labelSlugs: labels.map((label) => label.slug) },
      {
        onSuccess: () => toast.success(t('suites.tags.attachSuccessTitle'), t('suites.tags.attachSuccessDescription')),
        onError: (error) => toast.error(
          t('suites.tags.attachErrorTitle'),
          error instanceof Error ? error.message : t('suites.tags.actionFallbackError'),
        ),
      },
    )
  }

  const handleDetach = async (label: LabelItem) => {
    try {
      await detachMutation.mutateAsync({
        namespace,
        slug,
        labelSlug: label.slug,
      })
      toast.success(t('suites.tags.detachSuccessTitle'), t('suites.tags.detachSuccessDescription'))
    } catch (error) {
      toast.error(
        t('suites.tags.detachErrorTitle'),
        error instanceof Error ? error.message : t('suites.tags.actionFallbackError'),
      )
    }
  }

  return (
    <HierarchicalLabelManager
      title={t('suites.tags.title')}
      description={isSuperAdmin ? t('suites.tags.descriptionSuperAdmin') : t('suites.tags.description')}
      currentLabels={suiteLabels ?? initialLabels}
      catalogLabels={catalogLabels}
      isCatalogLoading={isSuperAdmin ? adminDefinitionsLoading : visibleLabelsLoading}
      isMutating={attachMutation.isPending || detachMutation.isPending}
      isSuperAdmin={isSuperAdmin}
      onAttach={handleAttach}
      onDetach={handleDetach}
    />
  )
}
