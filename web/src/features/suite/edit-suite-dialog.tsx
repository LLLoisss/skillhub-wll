import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/api/client'
import type { SuiteDetail, SuiteUpdateRequest } from '@/api/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { toast } from '@/shared/lib/toast'
import { useUpdateSuite } from './use-suite-queries'
import { SUITE_DIALOG_ANIMATION_CLASS_NAME, useAnimatedDialogPresence } from './use-animated-dialog-presence'

interface EditSuiteDialogProps {
  suite: SuiteDetail
  namespace: string
  slug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSuiteDialog({ suite, namespace, slug, open, onOpenChange }: EditSuiteDialogProps) {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(suite.summary ?? '')
  const { isMounted, isVisible } = useAnimatedDialogPresence(open)
  const updateMutation = useUpdateSuite()

  useEffect(() => {
    if (open) {
      setSummary(suite.summary ?? '')
    }
  }, [open, suite])

  const handleSubmit = async () => {
    const nextSummary = summary.trim()
    const request: SuiteUpdateRequest = {}

    if (nextSummary !== (suite.summary ?? '')) {
      request.summary = nextSummary
    }
    if (Object.keys(request).length === 0) {
      toast.error(t('suites.updateValidationError'))
      return
    }

    try {
      await updateMutation.mutateAsync({ namespace, slug, request })
      toast.success(t('suites.updateSuccessTitle'), t('suites.updateSuccessDescription'))
      onOpenChange(false)
    } catch (error) {
      toast.error(
        t('suites.updateErrorTitle'),
        error instanceof ApiError ? error.serverMessage || error.message : error instanceof Error ? error.message : undefined,
      )
    }
  }

  return (
    <Dialog open={isMounted} onOpenChange={onOpenChange}>
      <DialogContent
        data-state={isVisible ? 'open' : 'closed'}
        overlayClassName="bg-slate-950/25 backdrop-blur-none"
        className={`max-h-[calc(100vh-2rem)] w-[min(calc(100vw-2rem),44rem)] overflow-y-auto ${SUITE_DIALOG_ANIMATION_CLASS_NAME} ${isVisible ? '' : 'pointer-events-none'}`}
      >
        <DialogHeader>
          <DialogTitle>{t('suites.editSuite')}</DialogTitle>
          <DialogDescription>{t('suites.editSuiteDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>{t('suites.namespaceLabel')}</Label>
            <Input value={`@${namespace}`} disabled readOnly />
          </div>

          <div className="space-y-2">
            <Label>{t('suites.summaryLabel')}</Label>
            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t('suites.summaryPlaceholder')}
              className="bg-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('dialog.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t('suites.updating') : t('suites.updateSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
