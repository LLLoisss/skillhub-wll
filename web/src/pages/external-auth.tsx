import { useEffect, useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useExternalTokenLogin } from '@/features/auth/use-external-token-login'

/**
 * 外部令牌身份验证页面。
 *
 * 本页面是用户从已通过身份验证的外部项目重定向而来的入口点。
 * 外部项目会在 URL 中附加一个一次性的 `token` 查询参数：
 *
 *   https://skillhub.example.com/auth/external?token=xxx&returnTo=/
 *
 * 流程：
 * 1. 从 URL 查询参数中提取 token
 * 2. 调用后端 API 以令牌换取会话 (Session) 和用户信息
 * 3. 成功时：重定向至 returnTo 页面（默认为 /）
 * 4. 失败时：显示错误信息，并提供指向常规登录页面的链接
 */
export function ExternalAuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/auth/external' })
  const mutation = useExternalTokenLogin()
  const attemptedRef = useRef(false)

  const token = search.token
  const returnTo = search.returnTo && search.returnTo.startsWith('/') ? search.returnTo : '/'

  useEffect(() => {
    if (attemptedRef.current || !token) {
      return
    }
    attemptedRef.current = true

    void mutation.mutateAsync(token, {
      onSuccess: async () => {
        await navigate({ to: returnTo })
      },
      onError: () => {
        // Error state is handled by the mutation.error UI below
      },
    })
  }, [token, returnTo, mutation, navigate])

  // No token provided in URL
  if (!token) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-md space-y-6 text-center animate-fade-up">
          <div className="glass-strong p-8 rounded-2xl space-y-4">
            <p className="text-sm text-red-600">{t('externalAuth.missingToken')}</p>
            {/* <a
              href="/login"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              {t('externalAuth.goToLogin')}
            </a> */}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (mutation.isError) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-md space-y-6 text-center animate-fade-up">
          <div className="glass-strong p-8 rounded-2xl space-y-4">
            <p className="text-sm text-red-600">
              {mutation.error?.message || t('externalAuth.loginFailed')}
            </p>
            {/* <a
              href="/login"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              {t('externalAuth.goToLogin')}
            </a> */}
          </div>
        </div>
      </div>
    )
  }

  // Loading / in-progress state
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6 text-center animate-fade-up">
        <div className="glass-strong p-8 rounded-2xl space-y-4">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <p className="text-sm text-muted-foreground">{t('externalAuth.loggingIn')}</p>
        </div>
      </div>
    </div>
  )
}
