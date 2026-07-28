import { useTranslation } from 'react-i18next'
import type { LabelItem } from '@/api/types'
import { HierarchicalLabelManager } from '@/features/label/hierarchical-label-manager'
import { definitionsToLabelItems } from '@/features/label/label-hierarchy'
import { toast } from '@/shared/lib/toast'
import {
  useAdminLabelDefinitions,
  useAttachSkillLabel,
  useDetachSkillLabel,
  useSkillLabels,
  useVisibleLabels,
} from '@/shared/hooks/use-label-queries'

type SkillLabelPanelProps = {
  namespace: string
  slug: string
  initialLabels: LabelItem[]
  canManage: boolean
  isSuperAdmin: boolean
}

export function SkillLabelPanel({ namespace, slug, initialLabels, canManage, isSuperAdmin }: SkillLabelPanelProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage || i18n.language || 'en'
  const { data: skillLabels } = useSkillLabels(namespace, slug, canManage)
  const { data: visibleLabels, isLoading: visibleLabelsLoading } = useVisibleLabels(canManage && !isSuperAdmin)
  const { data: adminDefinitions, isLoading: adminDefinitionsLoading } = useAdminLabelDefinitions(canManage && isSuperAdmin)
  const attachMutation = useAttachSkillLabel()
  const detachMutation = useDetachSkillLabel()

  if (!canManage) return null

  const catalogLabels = isSuperAdmin
    ? definitionsToLabelItems(adminDefinitions ?? [], locale)
    : (visibleLabels ?? [])

  const handleAttach = async (labels: LabelItem[]) => {
    try {
      for (const label of labels) {
        await attachMutation.mutateAsync({ namespace, slug, labelSlug: label.slug })
      }
      toast.success(
        t('skillDetail.labelAttachSuccessTitle'),
        t('skillDetail.labelAttachSuccessDescription'),
      )
    } catch (error) {
      toast.error(
        t('skillDetail.labelAttachErrorTitle'),
        error instanceof Error ? error.message : t('skillDetail.labelActionFallbackError'),
      )
    }
  }

  const handleDetach = async (label: LabelItem) => {
    try {
      await detachMutation.mutateAsync({
        namespace,
        slug,
        labelSlug: label.slug,
      })
      toast.success(
        t('skillDetail.labelDetachSuccessTitle'),
        t('skillDetail.labelDetachSuccessDescription'),
      )
    } catch (error) {
      toast.error(
        t('skillDetail.labelDetachErrorTitle'),
        error instanceof Error ? error.message : t('skillDetail.labelActionFallbackError'),
      )
    }
  }

  return (
    <HierarchicalLabelManager
      title={t('skillDetail.labelsSectionTitle')}
      description={isSuperAdmin
        ? t('skillDetail.labelsSectionDescriptionSuperAdmin')
        : t('skillDetail.labelsSectionDescription')}
      currentLabels={skillLabels ?? initialLabels}
      catalogLabels={catalogLabels}
      isCatalogLoading={isSuperAdmin ? adminDefinitionsLoading : visibleLabelsLoading}
      isMutating={attachMutation.isPending || detachMutation.isPending}
      isSuperAdmin={isSuperAdmin}
      onAttach={handleAttach}
      onDetach={handleDetach}
    />
  )
}
