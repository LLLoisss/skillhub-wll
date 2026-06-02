import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/client'

export function useNamespaceReviewList(
  status: string,
  page = 0,
  size = 20,
  sortDirection: 'ASC' | 'DESC' = 'DESC',
  enabled = true,
) {
  return useQuery({
    queryKey: ['namespace-reviews', status, page, size, sortDirection],
    queryFn: () => adminApi.getNamespaceApplications({ status, page, size, sortDirection }),
    enabled,
  })
}

export function useApproveNamespaceReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) =>
      adminApi.approveNamespaceApplication(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['namespace-reviews'] })
    },
  })
}

export function useRejectNamespaceReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      adminApi.rejectNamespaceApplication(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['namespace-reviews'] })
    },
  })
}
