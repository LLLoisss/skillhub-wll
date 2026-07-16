import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { SuiteCreateForm } from './suite-create-form'

interface CreateSuiteDialogProps {
  trigger: ReactNode
}

/**
 * Dialog shell for legacy callers. The create flow itself lives in `SuiteCreateForm`.
 */
export function CreateSuiteDialog({ trigger }: CreateSuiteDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[min(calc(100vw-2rem),40rem)]">
        <DialogHeader>
          <DialogTitle>{t('suites.createSuite')}</DialogTitle>
          <DialogDescription>{t('suites.createSuiteDescription')}</DialogDescription>
        </DialogHeader>
        <SuiteCreateForm
          onCreated={() => setOpen(false)}
          cancelAction={(
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('dialog.cancel')}
            </Button>
          )}
        />
      </DialogContent>
    </Dialog>
  )
}