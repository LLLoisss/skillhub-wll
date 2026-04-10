import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/client'
import type { User } from '@/api/types'
import { clearSessionScopedQueries } from '@/features/notification/notification-session'

/**
 * Mutation hook for exchanging an external platform token for a local session.
 *
 * Used when a user is redirected from an already-authenticated external project. The external
 * project passes a one-time token via URL, and this mutation sends it to the backend to create a
 * browser session and retrieve user info.
 */
export function useExternalTokenLogin() {
  const queryClient = useQueryClient()

  return useMutation<User, Error, string>({
    mutationFn: (token) => authApi.externalTokenLogin(token),
    onSuccess: (user) => {
      clearSessionScopedQueries(queryClient)
      queryClient.setQueryData<User | null>(['auth', 'me'], user)
    },
  })
}
