import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatLocalDateTime } from '@/shared/lib/date-time'
import { toast } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Textarea } from '@/shared/ui/textarea'
import {
  useApproveNamespaceReview,
  useNamespaceReviewList,
  useRejectNamespaceReview,
} from '@/features/review/use-namespace-review-list'
import type { NamespaceApplicationItem } from '@/api/types'
import { EmptyState } from '@/shared/components/empty-state'
import { Pagination } from '@/shared/components/pagination'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type TimeSortDirection = 'ASC' | 'DESC'

const PAGE_SIZE = 10

export function NamespaceReviewTable() {
  const { t, i18n } = useTranslation()
  const [selectedItem, setSelectedItem] = useState<NamespaceApplicationItem | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [pages, setPages] = useState<Record<ReviewStatus, number>>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  })
  const [activeStatus, setActiveStatus] = useState<ReviewStatus>('PENDING')
  const [sortDirection, setSortDirection] = useState<TimeSortDirection>('DESC')

  const pendingQuery = useNamespaceReviewList('PENDING', pages.PENDING, PAGE_SIZE, sortDirection, activeStatus === 'PENDING')
  const approvedQuery = useNamespaceReviewList('APPROVED', pages.APPROVED, PAGE_SIZE, sortDirection, activeStatus === 'APPROVED')
  const rejectedQuery = useNamespaceReviewList('REJECTED', pages.REJECTED, PAGE_SIZE, sortDirection, activeStatus === 'REJECTED')

  const approveMutation = useApproveNamespaceReview()
  const rejectMutation = useRejectNamespaceReview()

  const formatDate = (dateString: string) => formatLocalDateTime(dateString, i18n.language)

  function handleApproveClick(item: NamespaceApplicationItem) {
    setSelectedItem(item)
    setApproveDialogOpen(true)
  }

  function handleRejectClick(item: NamespaceApplicationItem) {
    setSelectedItem(item)
    setRejectComment('')
    setRejectDialogOpen(true)
  }

  async function confirmApprove() {
    if (!selectedItem) return
    try {
      await approveMutation.mutateAsync({ id: selectedItem.id })
      toast.success(t('namespaceReview.approveSuccess'))
    } catch {
      toast.error(t('namespaceReview.approveFailed'))
    } finally {
      setApproveDialogOpen(false)
      setSelectedItem(null)
    }
  }

  async function confirmReject() {
    if (!selectedItem || !rejectComment.trim()) return
    try {
      await rejectMutation.mutateAsync({ id: selectedItem.id, comment: rejectComment.trim() })
      toast.success(t('namespaceReview.rejectSuccess'))
    } catch {
      toast.error(t('namespaceReview.rejectFailed'))
    } finally {
      setRejectDialogOpen(false)
      setSelectedItem(null)
      setRejectComment('')
    }
  }

  function changePage(status: ReviewStatus, nextPage: number) {
    setPages((current) => ({ ...current, [status]: nextPage }))
  }

  function handleSortChange(value: string) {
    setSortDirection(value as TimeSortDirection)
    setPages({ PENDING: 0, APPROVED: 0, REJECTED: 0 })
  }

  function renderPagination(status: ReviewStatus, totalElements: number, totalPages: number) {
    const currentPage = pages[status]
    return (
      <div className="flex flex-col gap-3 border-t border-border/60 px-6 py-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>{t('namespaceReview.pageSummary', { total: totalElements, page: currentPage + 1 })}</p>
        <Pagination
          page={currentPage}
          totalPages={Math.max(totalPages, 1)}
          onPageChange={(nextPage) => changePage(status, nextPage)}
        />
      </div>
    )
  }

  function renderTable(query: typeof pendingQuery, status: ReviewStatus) {
    if (query.isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-shimmer rounded-xl" />
          ))}
        </div>
      )
    }

    const items = query.data?.items
    if (!items || items.length === 0) {
      return <EmptyState title={t('namespaceReview.empty')} />
    }

    return (
      <div className="overflow-hidden rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/35">
              <TableHead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('namespaceReview.colSlug')}</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('namespaceReview.colDisplayName')}</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('namespaceReview.colApplicant')}</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('namespaceReview.colAppliedAt')}</TableHead>
              {status !== 'PENDING' && (
                <>
                  <TableHead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('namespaceReview.colReviewer')}</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('namespaceReview.colReviewedAt')}</TableHead>
                </>
              )}
              {status === 'PENDING' && (
                <TableHead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('namespaceReview.colActions')}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-medium">@{item.slug}</TableCell>
                <TableCell>{item.displayName}</TableCell>
                <TableCell>{item.applicantName || item.applicantId}</TableCell>
                <TableCell>{formatDate(item.appliedAt)}</TableCell>
                {status !== 'PENDING' && (
                  <>
                    <TableCell>{item.reviewerName || item.reviewerId || '-'}</TableCell>
                    <TableCell>{item.reviewedAt ? formatDate(item.reviewedAt) : '-'}</TableCell>
                  </>
                )}
                {status === 'PENDING' && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveClick(item)}
                      >
                        {t('namespaceReview.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRejectClick(item)}
                      >
                        {t('namespaceReview.reject')}
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {query.data && renderPagination(status, query.data.totalElements, query.data.totalPages)}
      </div>
    )
  }

  return (
    <>
      <Card className="glass-strong overflow-hidden border-border/60 shadow-sm hover:shadow-sm">
        <div className="h-1 bg-gradient-to-r from-slate-900 via-purple-700 to-violet-500" />
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {t('namespaceReview.typeLabel')}
              </div>
              <CardTitle>{t('namespaceReview.queueTitle')}</CardTitle>
              <CardDescription>{t('namespaceReview.queueSubtitle')}</CardDescription>
            </div>
            <div className="w-full max-w-48">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('namespaceReview.sortLabel')}
              </p>
              <Select value={sortDirection} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESC">{t('namespaceReview.sortNewest')}</SelectItem>
                  <SelectItem value="ASC">{t('namespaceReview.sortOldest')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeStatus} onValueChange={(v) => setActiveStatus(v as ReviewStatus)}>
            <TabsList className="gap-4 rounded-xl border-b-0 bg-muted/70 p-1 shadow-none">
              <TabsTrigger
                value="PENDING"
                className="mb-0 rounded-lg border-b-0 px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                {t('namespaceReview.tabPending')}
              </TabsTrigger>
              <TabsTrigger
                value="APPROVED"
                className="mb-0 rounded-lg border-b-0 px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                {t('namespaceReview.tabApproved')}
              </TabsTrigger>
              <TabsTrigger
                value="REJECTED"
                className="mb-0 rounded-lg border-b-0 px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
              >
                {t('namespaceReview.tabRejected')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="PENDING" className="mt-6">
              {renderTable(pendingQuery, 'PENDING')}
            </TabsContent>
            <TabsContent value="APPROVED" className="mt-6">
              {renderTable(approvedQuery, 'APPROVED')}
            </TabsContent>
            <TabsContent value="REJECTED" className="mt-6">
              {renderTable(rejectedQuery, 'REJECTED')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approve dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('namespaceReview.confirmApproveTitle')}</DialogTitle>
            <DialogDescription>
              {selectedItem
                ? t('namespaceReview.confirmApproveDesc', {
                    slug: selectedItem.slug,
                    name: selectedItem.displayName,
                  })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              {t('dialog.cancel')}
            </Button>
            <Button onClick={confirmApprove} disabled={approveMutation.isPending}>
              {t('namespaceReview.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('namespaceReview.confirmRejectTitle')}</DialogTitle>
            <DialogDescription>{t('namespaceReview.confirmRejectDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            className="mt-2"
            placeholder={t('namespaceReview.rejectPlaceholder')}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('dialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectComment.trim() || rejectMutation.isPending}
            >
              {t('namespaceReview.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
