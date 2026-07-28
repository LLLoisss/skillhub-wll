import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateSuiteRequest, SuiteDetail, SuiteRatingStatus, SuiteSearchParams, SuiteUpdateRequest } from '@/api/types'
import { suiteApi } from '@/api/suite-client'

/** React Query hooks and cache-key conventions for the Expert Suite feature. */
function getSuiteListQueryKey() {
  return ['suites', 'list'] as const
}

function getSuiteSearchQueryKey(params: SuiteSearchParams) {
  return [...getSuiteListQueryKey(), 'search', params] as const
}

function getMySuitesQueryKey(params: { status?: string; page?: number; size?: number }) {
  return [...getSuiteListQueryKey(), 'my', params] as const
}

function getMySuiteStarsQueryKey() {
  return [...getSuiteListQueryKey(), 'stars'] as const
}

function getSuiteDetailQueryKey(namespace: string, slug: string) {
  return ['suites', 'detail', namespace, slug] as const
}

function getSuiteLabelsQueryKey(namespace: string, slug: string) {
  return [...getSuiteDetailQueryKey(namespace, slug), 'labels'] as const
}

function getSuiteRatingQueryKey(namespace: string, slug: string) {
  return [...getSuiteDetailQueryKey(namespace, slug), 'rating'] as const
}

function invalidateSuiteListQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: getSuiteListQueryKey() })
}

function invalidateSuiteDetailAndListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  namespace: string,
  slug: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: getSuiteDetailQueryKey(namespace, slug), exact: true }),
    invalidateSuiteListQueries(queryClient),
  ])
}

export function useSearchSuites(params: SuiteSearchParams) {
  return useQuery({
    queryKey: getSuiteSearchQueryKey(params),
    queryFn: () => suiteApi.search(params),
  })
}

export function useMySuites(params: { status?: string; page?: number; size?: number } = {}) {
  return useQuery({
    queryKey: getMySuitesQueryKey(params),
    queryFn: () => suiteApi.getMine(params),
  })
}

export function useSuiteDetail(namespace: string, slug: string, enabled = true) {
  return useQuery({
    queryKey: getSuiteDetailQueryKey(namespace, slug),
    queryFn: ({ signal }) => suiteApi.getDetail(namespace, slug, signal),
    enabled: enabled && !!namespace && !!slug,
    refetchOnMount: 'always',
  })
}

export function useSuiteLabels(namespace: string, slug: string, enabled = true) {
  return useQuery({
    queryKey: getSuiteLabelsQueryKey(namespace, slug),
    queryFn: ({ signal }) => suiteApi.getLabels(namespace, slug, signal),
    enabled: enabled && !!namespace && !!slug,
  })
}

export function useMySuiteStars(enabled = true) {
  return useQuery({
    queryKey: getMySuiteStarsQueryKey(),
    queryFn: () => suiteApi.getMyStars(),
    enabled,
  })
}

export function useCreateSuite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateSuiteRequest) => suiteApi.create(request),
    onSuccess: () => invalidateSuiteListQueries(queryClient),
  })
}

export function useUpdateSuite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ namespace, slug, request }: { namespace: string; slug: string; request: SuiteUpdateRequest }) =>
      suiteApi.update(namespace, slug, request),
    onSuccess: (_data, variables) => Promise.all([
      queryClient.invalidateQueries({
        queryKey: getSuiteDetailQueryKey(variables.namespace, variables.slug),
        exact: true,
      }),
      invalidateSuiteListQueries(queryClient),
      ...(variables.request.labelSlugs !== undefined
        ? [queryClient.invalidateQueries({
            queryKey: getSuiteLabelsQueryKey(variables.namespace, variables.slug),
            exact: true,
          })]
        : []),
    ]),
  })
}

export function useSuiteUserRating(namespace: string, slug: string, enabled = true) {
  return useQuery({
    queryKey: getSuiteRatingQueryKey(namespace, slug),
    queryFn: ({ signal }) => suiteApi.getUserRating(namespace, slug, signal),
    enabled: enabled && !!namespace && !!slug,
  })
}

export function useAddSuiteSkills() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ namespace, slug, skillIds }: { namespace: string; slug: string; skillIds: number[] }) =>
      suiteApi.addSkills(namespace, slug, skillIds),
    onSuccess: (_data, variables) =>
      invalidateSuiteDetailAndListQueries(queryClient, variables.namespace, variables.slug),
  })
}

export function useRemoveSuiteSkills() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ namespace, slug, skillIds }: { namespace: string; slug: string; skillIds: number[] }) =>
      suiteApi.removeSkills(namespace, slug, skillIds),
    onSuccess: (_data, variables) =>
      invalidateSuiteDetailAndListQueries(queryClient, variables.namespace, variables.slug),
  })
}

export function useDeleteSuite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ namespace, slug }: { namespace: string; slug: string }) => suiteApi.remove(namespace, slug),
    onSuccess: async (_data, variables) => {
      const deletedSuiteQueryKeys = [
        getSuiteDetailQueryKey(variables.namespace, variables.slug),
        getSuiteLabelsQueryKey(variables.namespace, variables.slug),
        getSuiteRatingQueryKey(variables.namespace, variables.slug),
      ]

      await Promise.all([
        ...deletedSuiteQueryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey, exact: true })),
        queryClient.cancelQueries({ queryKey: getSuiteListQueryKey() }),
      ])
      deletedSuiteQueryKeys.forEach((queryKey) => {
        queryClient.removeQueries({ queryKey, exact: true })
      })

      // Do not let the list route render the deleted suite from stale cache. A stale card
      // would mount its rating query once before the refreshed list response removes it.
      queryClient.removeQueries({ queryKey: getSuiteListQueryKey() })
    },
  })
}

export function useArchiveSuite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ namespace, slug, reason }: { namespace: string; slug: string; reason?: string }) =>
      suiteApi.archive(namespace, slug, reason),
    onSuccess: (_data, variables) =>
      invalidateSuiteDetailAndListQueries(queryClient, variables.namespace, variables.slug),
  })
}

export function useUnarchiveSuite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ namespace, slug }: { namespace: string; slug: string }) => suiteApi.unarchive(namespace, slug),
    onSuccess: (_data, variables) =>
      invalidateSuiteDetailAndListQueries(queryClient, variables.namespace, variables.slug),
  })
}

export function useHideSuite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ suiteId, reason }: { suiteId: number; namespace: string; slug: string; reason?: string }) =>
      suiteApi.hide(suiteId, reason),
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<SuiteDetail>(
        getSuiteDetailQueryKey(variables.namespace, variables.slug),
        (current) => current ? { ...current, hidden: true } : current,
      )
      return invalidateSuiteListQueries(queryClient)
    },
  })
}

export function useUnhideSuite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ suiteId }: { suiteId: number; namespace: string; slug: string }) => suiteApi.unhide(suiteId),
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<SuiteDetail>(
        getSuiteDetailQueryKey(variables.namespace, variables.slug),
        (current) => current ? { ...current, hidden: false } : current,
      )
      return invalidateSuiteListQueries(queryClient)
    },
  })
}

export function usePutSuiteLabels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ namespace, slug, labelSlugs }: { namespace: string; slug: string; labelSlugs: string[] }) => {
      const attachedLabels = []
      for (const labelSlug of labelSlugs) {
        attachedLabels.push(await suiteApi.putLabel(namespace, slug, labelSlug))
      }
      return attachedLabels
    },
    onSuccess: (_data, variables) => Promise.all([
      queryClient.invalidateQueries({
        queryKey: getSuiteLabelsQueryKey(variables.namespace, variables.slug),
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: getSuiteDetailQueryKey(variables.namespace, variables.slug),
        exact: true,
      }),
    ]),
  })
}

export function useDeleteSuiteLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ namespace, slug, labelSlug }: { namespace: string; slug: string; labelSlug: string }) =>
      suiteApi.deleteLabel(namespace, slug, labelSlug),
    onSuccess: (_data, variables) => Promise.all([
      queryClient.invalidateQueries({
        queryKey: getSuiteLabelsQueryKey(variables.namespace, variables.slug),
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: getSuiteDetailQueryKey(variables.namespace, variables.slug),
        exact: true,
      }),
    ]),
  })
}

/** Toggles the current user's star state for one suite. */
export function useToggleSuiteStar(namespace: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (starred: boolean) => (starred ? suiteApi.unstar(namespace, slug) : suiteApi.star(namespace, slug)),
    onSuccess: () => invalidateSuiteDetailAndListQueries(queryClient, namespace, slug),
  })
}

export function useRateSuite(namespace: string, slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (score: number) => suiteApi.rate(namespace, slug, score),
    onSuccess: (_data, score) => {
      queryClient.setQueryData<SuiteRatingStatus>(
        getSuiteRatingQueryKey(namespace, slug),
        { score, rated: true },
      )
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: getSuiteDetailQueryKey(namespace, slug), exact: true }),
        queryClient.invalidateQueries({ queryKey: getSuiteRatingQueryKey(namespace, slug), exact: true }),
        invalidateSuiteListQueries(queryClient),
      ])
    },
  })
}
