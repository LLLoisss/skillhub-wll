import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import type { SuiteDetail } from '@/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/components/confirm-dialog'
import { toast } from '@/shared/lib/toast'
import { useArchiveSuite, useDeleteSuite, useHideSuite, useUnarchiveSuite, useUnhideSuite } from './use-suite-queries'

interface SuiteHeaderActionsProps {
  suite: SuiteDetail
  canManage: boolean
  onEdit: () => void
  onAddSkills: () => void
}

interface SuiteLifecycleActionsProps {
  suite: SuiteDetail
  namespace: string
  slug: string
  canManage: boolean
}

interface SuiteGovernanceActionsProps {
  suite: SuiteDetail
  canManage: boolean
}

/** Keeps the common editing actions close to the suite heading. */
export function SuiteHeaderActions({ suite, canManage, onEdit, onAddSkills }: SuiteHeaderActionsProps) {
  const { t } = useTranslation()

  if (!canManage || suite.status === 'ARCHIVED') {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={onAddSkills}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {t('suites.addSuiteSkills')}
      </Button>
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        {t('suites.editSuite')}
      </Button>
    </div>
  )
}

/** Owner and namespace-admin lifecycle controls, aligned with the skill detail sidebar. */
export function SuiteLifecycleActions({ suite, namespace, slug, canManage }: SuiteLifecycleActionsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [unarchiveConfirmOpen, setUnarchiveConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const archiveMutation = useArchiveSuite()
  const unarchiveMutation = useUnarchiveSuite()
  const deleteMutation = useDeleteSuite()

  const isProcessing = archiveMutation.isPending || unarchiveMutation.isPending || deleteMutation.isPending

  const handleArchive = async () => {
    try {
      await archiveMutation.mutateAsync({ namespace, slug })
      toast.success(t('suites.archiveSuccessTitle'), t('suites.archiveSuccessDescription', { suite: suite.displayName }))
    } catch (error) {
      toast.error(t('suites.archiveErrorTitle'), error instanceof Error ? error.message : undefined)
      throw error
    }
  }

  const handleUnarchive = async () => {
    try {
      await unarchiveMutation.mutateAsync({ namespace, slug })
      toast.success(t('suites.unarchiveSuccessTitle'), t('suites.unarchiveSuccessDescription', { suite: suite.displayName }))
    } catch (error) {
      toast.error(t('suites.unarchiveErrorTitle'), error instanceof Error ? error.message : undefined)
      throw error
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ namespace, slug })
      toast.success(t('suites.deleteSuccessTitle'))
      await navigate({ to: '/suites', search: { q: '', label: '', sort: 'newest', page: 0, starredOnly: false } })
    } catch (error) {
      toast.error(t('suites.deleteErrorTitle'), error instanceof Error ? error.message : undefined)
      throw error
    }
  }

  if (!canManage) {
    return null
  }

  return (
    <>
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold font-heading text-foreground">{t('suites.lifecycle.title')}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t('suites.lifecycle.description')}</p>
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t('suites.lifecycle.statusLabel')}
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {suite.status === 'ARCHIVED' ? t('suites.status.archived') : t('suites.lifecycle.activeStatus')}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border/40 pt-3">
          {suite.status === 'ARCHIVED' ? (
            <Button variant="outline" onClick={() => setUnarchiveConfirmOpen(true)} disabled={isProcessing}>
              {unarchiveMutation.isPending ? t('suites.processing') : t('suites.unarchiveSuite')}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setArchiveConfirmOpen(true)} disabled={isProcessing}>
              {archiveMutation.isPending ? t('suites.processing') : t('suites.archiveSuite')}
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={isProcessing}>
            {deleteMutation.isPending ? t('suites.processing') : t('suites.deleteSuite')}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={t('suites.archiveConfirmTitle')}
        description={t('suites.archiveConfirmDescription')}
        confirmText={t('suites.archiveSuite')}
        onConfirm={handleArchive}
      />
      <ConfirmDialog
        open={unarchiveConfirmOpen}
        onOpenChange={setUnarchiveConfirmOpen}
        title={t('suites.unarchiveConfirmTitle')}
        description={t('suites.unarchiveConfirmDescription')}
        confirmText={t('suites.unarchiveSuite')}
        onConfirm={handleUnarchive}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('suites.deleteConfirmTitle')}
        description={t('suites.deleteConfirmDescription')}
        confirmText={t('suites.deleteSuite')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}

/** Platform governance controls live separately from owner lifecycle actions. */
export function SuiteGovernanceActions({ suite, canManage }: SuiteGovernanceActionsProps) {
  const { t } = useTranslation()
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false)
  const [unhideConfirmOpen, setUnhideConfirmOpen] = useState(false)
  const hideMutation = useHideSuite()
  const unhideMutation = useUnhideSuite()

  const handleHide = async () => {
    try {
      await hideMutation.mutateAsync({ suiteId: suite.id, namespace: suite.namespace, slug: suite.slug })
      toast.success(t('suites.hideSuccessTitle'))
    } catch (error) {
      toast.error(t('suites.hideErrorTitle'), error instanceof Error ? error.message : undefined)
      throw error
    }
  }

  const handleUnhide = async () => {
    try {
      await unhideMutation.mutateAsync({ suiteId: suite.id, namespace: suite.namespace, slug: suite.slug })
      toast.success(t('suites.unhideSuccessTitle'))
    } catch (error) {
      toast.error(t('suites.unhideErrorTitle'), error instanceof Error ? error.message : undefined)
      throw error
    }
  }

  if (!canManage) {
    return null
  }

  return (
    <>
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold font-heading text-foreground">{t('suites.governance.title')}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t('suites.governance.description')}</p>
        <div className="flex flex-col gap-3">
          {suite.hidden ? (
            <Button variant="outline" onClick={() => setUnhideConfirmOpen(true)} disabled={unhideMutation.isPending}>
              {unhideMutation.isPending ? t('suites.processing') : t('suites.unhideSuite')}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setHideConfirmOpen(true)} disabled={hideMutation.isPending}>
              {hideMutation.isPending ? t('suites.processing') : t('suites.hideSuite')}
            </Button>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={hideConfirmOpen}
        onOpenChange={setHideConfirmOpen}
        title={t('suites.hideConfirmTitle')}
        description={t('suites.hideConfirmDescription')}
        confirmText={t('suites.hideSuite')}
        variant="destructive"
        onConfirm={handleHide}
      />
      <ConfirmDialog
        open={unhideConfirmOpen}
        onOpenChange={setUnhideConfirmOpen}
        title={t('suites.unhideConfirmTitle')}
        description={t('suites.unhideConfirmDescription')}
        confirmText={t('suites.unhideSuite')}
        onConfirm={handleUnhide}
      />
    </>
  )
}
