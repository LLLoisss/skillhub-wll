import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/client'
import type { ThirdPartyLoginRequest, User } from '@/api/types'
import { clearSessionScopedQueries } from '@/features/notification/notification-session'

/**
 * 用于将三方平台令牌交换为本地会话（Session）的 Mutation Hook。
 *
 * 当用户从已通过身份验证的外部项目重定向而来时使用。 外部项目通过 URL 传递
 * `loginMethod`、`platform` 与一次性 `token`，此 Mutation 会将其发送至统一的
 * 三方登录接口 `/api/v1/auth/third-party/login`，以创建浏览器会话并检索用户信息。
 */
export function useThirdPartyLogin() {
  const queryClient = useQueryClient()

  return useMutation<User, Error, ThirdPartyLoginRequest>({
    mutationFn: (request) => authApi.thirdPartyLogin(request),
    onSuccess: async (user) => {
      // 取消任何正在飞行中的 ['auth', 'me'] 查询，防止登录前发出的旧请求（返回 null）
      // 在 setQueryData 之后到达并覆盖刚写入的用户数据，导致导航竞态。
      await queryClient.cancelQueries({ queryKey: ['auth', 'me'] })
      clearSessionScopedQueries(queryClient)
      queryClient.setQueryData<User | null>(['auth', 'me'], user)
    },
  })
}
