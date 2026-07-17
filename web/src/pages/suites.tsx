import { useState } from 'react'
import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { SuiteSummary } from '@/api/types'
import { useAuth } from '@/features/auth/use-auth'
import { SearchBar } from '@/features/search/search-bar'
import { SuiteCard } from '@/features/suite/suite-card'
import { isPublicSuite } from '@/features/suite/suite-visibility'
import { useMySuiteStars, useSearchSuites } from '@/features/suite/use-suite-queries'
import { SkeletonList } from '@/shared/components/skeleton-loader'
import { EmptyState } from '@/shared/components/empty-state'
import { Pagination } from '@/shared/components/pagination'
import { useVisibleLabels } from '@/shared/hooks/use-label-queries'
import { Button } from '@/shared/ui/button'
import { APP_SHELL_PAGE_CLASS_NAME } from '@/app/page-shell-style'

const PAGE_SIZE = 8

function filterStarredSuites(suites: SuiteSummary[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  return suites.filter((suite) => {
    if (!isPublicSuite(suite)) {
      return false
    }
    const matchesQuery = !normalizedQuery || [suite.displayName, suite.summary, suite.namespace, suite.slug]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery))
    return matchesQuery
  })
}

function sortStarredSuites(suites: SuiteSummary[], sort: string) {
  const sorted = [...suites]
  if (sort === 'stars') return sorted.sort((left, right) => right.starCount - left.starCount)
  if (sort === 'rating') return sorted.sort((left, right) => (right.ratingAvg ?? 0) - (left.ratingAvg ?? 0))
  return sorted.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
}

/**
 * Expert suite discovery page. Layout mirrors `SearchPage` (skills) per the requirements doc:
 * search bar, sort buttons, card grid, pagination.
 */
export function SuiteSearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })
  const searchParams = useSearch({ strict: false }) as { q?: string; label?: string; sort?: string; page?: number; starredOnly?: boolean }
  const { isAuthenticated } = useAuth()

  const q = searchParams.q ?? ''
  const selectedLabel = searchParams.label ?? ''
  const sort = searchParams.sort || 'newest'
  const page = searchParams.page ?? 0
  const starredOnly = searchParams.starredOnly ?? false
  const [queryInput, setQueryInput] = useState(q)

  const { data, isLoading } = useSearchSuites({ q, label: selectedLabel || undefined, sort, page, size: PAGE_SIZE })
  const { data: labels } = useVisibleLabels()
  const { data: starredSuites, isLoading: isLoadingStarred } = useMySuiteStars(starredOnly && isAuthenticated)
  const filteredStarredSuites = starredOnly ? sortStarredSuites(filterStarredSuites(starredSuites ?? [], q), sort) : []
  const displayItems = starredOnly
    ? filteredStarredSuites.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : (data?.items ?? []).filter(isPublicSuite)
  const isPageLoading = starredOnly ? isLoadingStarred : isLoading
  const resultCount = starredOnly ? filteredStarredSuites.length : data?.total ?? 0
  const totalPages = starredOnly ? Math.ceil(filteredStarredSuites.length / PAGE_SIZE) : data ? Math.max(Math.ceil(data.total / data.size), 1) : 0

  const navigateToSearch = (next: { q?: string; label?: string; sort?: string; page?: number; starredOnly?: boolean }) => {
    navigate({
      to: '/suites',
      search: {
        q: next.q ?? q,
        label: next.label ?? selectedLabel,
        sort: next.sort ?? sort,
        page: next.page ?? page,
        starredOnly: next.starredOnly ?? starredOnly,
      },
    })
  }

  const handleSearch = (query: string) => {
    setQueryInput(query)
    navigateToSearch({ q: query, page: 0 })
  }

  const handleSortChange = (nextSort: string) => {
    navigateToSearch({ sort: nextSort, page: 0 })
  }

  const handlePageChange = (nextPage: number) => {
    navigateToSearch({ page: nextPage })
  }

  const handleLabelToggle = (label: string) => {
    const nextLabel = selectedLabel === label ? '' : label
    navigateToSearch({ label: nextLabel, page: 0 })
  }

  const handleStarredToggle = () => {
    if (!isAuthenticated) {
      navigate({ to: '/login', search: { returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}` } })
      return
    }
    navigateToSearch({ starredOnly: !starredOnly, page: 0 })
  }

  const handleSuiteClick = (namespace: string, slug: string) => {
    navigate({
      to: `/suites/${namespace}/${encodeURIComponent(slug)}`,
      search: { returnTo: `${location.pathname}${location.searchStr}${location.hash}` },
    })
  }

  return (
    <div className={APP_SHELL_PAGE_CLASS_NAME}>
      <div className="max-w-3xl mx-auto w-full">
        <SearchBar value={queryInput} onChange={setQueryInput} onSearch={handleSearch} placeholder={t('suites.searchPlaceholder')} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">{t('search.sort.label')}</span>
          <div className="flex gap-2">
            {/* <Button variant={sort === 'relevance' ? 'default' : 'outline'} size="sm" onClick={() => handleSortChange('relevance')}>
              {t('suites.sort.relevance')}
            </Button> */}
            <Button variant={sort === 'stars' ? 'default' : 'outline'} size="sm" onClick={() => handleSortChange('stars')}>
              {t('suites.sort.stars')}
            </Button>
            <Button variant={sort === 'rating' ? 'default' : 'outline'} size="sm" onClick={() => handleSortChange('rating')}>
              {t('suites.sort.rating')}
            </Button>
            <Button variant={sort === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => handleSortChange('newest')}>
              {t('suites.sort.newest')}
            </Button>
          </div>
        </div>
        {resultCount > 0 && <div className="text-sm text-muted-foreground">{t('suites.results', { count: resultCount })}</div>}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">{t('suites.filters.label')}</span>
        <Button variant={starredOnly ? 'default' : 'outline'} size="sm" onClick={handleStarredToggle}>
          {t('suites.filterStarred')}
        </Button>
        {!starredOnly && labels?.map((label) => (
          <Button
            key={label.slug}
            variant={selectedLabel === label.slug ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLabelToggle(label.slug)}
          >
            {label.displayName}
          </Button>
        ))}
      </div>

      {isPageLoading ? (
        <SkeletonList count={PAGE_SIZE} />
      ) : displayItems.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {displayItems.map((suite) => (
              <div key={suite.id} className="h-full">
                <SuiteCard suite={suite} onClick={() => handleSuiteClick(suite.namespace, suite.slug)} />
              </div>
            ))}
          </div>
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />}
        </>
      ) : (
        <EmptyState
          title={starredOnly ? t('suites.noStarredResults') : t('suites.noResults')}
          description={starredOnly ? (q ? t('suites.noStarredResultsFor', { q }) : t('suites.noStarredSuites')) : q ? t('suites.noResultsFor', { q }) : t('suites.enterKeyword')}
        />
      )}
    </div>
  )
}
