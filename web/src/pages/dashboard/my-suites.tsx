import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { SuiteCard } from '@/features/suite/suite-card'
import { useMySuites } from '@/features/suite/use-suite-queries'
import { EmptyState } from '@/shared/components/empty-state'
import { Pagination } from '@/shared/components/pagination'
import { SkeletonList } from '@/shared/components/skeleton-loader'

const PAGE_SIZE = 12

/**
 * Dashboard page for expert suites owned by the current user.
 */
export function MySuitesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const { data, isLoading } = useMySuites({ page, size: PAGE_SIZE })
  const totalPages = data ? Math.max(Math.ceil(data.total / data.size), 1) : 0

  return (
    <div className="space-y-8 animate-fade-up">
      {isLoading ? (
        <SkeletonList count={PAGE_SIZE} />
      ) : data && data.items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data.items.map((suite) => (
              <div key={suite.id} className="h-full">
                <SuiteCard
                  suite={suite}
                  onClick={() => navigate({
                    to: `/suites/${suite.namespace}/${encodeURIComponent(suite.slug)}`,
                    search: { returnTo: '/dashboard/suites' },
                  })}
                />
              </div>
            ))}
          </div>
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      ) : (
        <EmptyState title={t('myAssets.suitesEmptyTitle')} description={t('myAssets.suitesEmptyDescription')} />
      )}
    </div>
  )
}
