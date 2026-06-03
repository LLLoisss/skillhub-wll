import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPageNumbers(page: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }
  if (page <= 3) {
    return [0, 1, 2, 3, 4, '...', totalPages - 1]
  }
  if (page >= totalPages - 4) {
    return [0, '...', totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1]
  }
  return [0, '...', page - 1, page, page + 1, '...', totalPages - 1]
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 0}
        className="min-w-[80px]"
      >
        {t('pagination.prev')}
      </Button>

      {pageNumbers.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground select-none">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(p)}
            className="min-w-[36px] px-0"
          >
            {p + 1}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="min-w-[80px]"
      >
        {t('pagination.next')}
      </Button>
    </div>
  )
}
