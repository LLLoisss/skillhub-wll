import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/client'
import type { User } from '@/api/types'
import { clearSessionScopedQueries } from '@/features/notification/notification-session'

/**
 * 用于将外部平台令牌交换为本地会话（Session）的 Mutation Hook。
 *
 * 当用户从已通过身份验证的外部项目重定向而来时使用。 外部项目通过 URL 传递一个一次性
 * 令牌，此 Mutation 会将其发送至后端以创建浏览器会话并检索用户信息。
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
