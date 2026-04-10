import { useEffect, useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useExternalTokenLogin } from '@/features/auth/use-external-token-login'

/**
 * External token authentication page.
 *
 * This page is the entry point when a user is redirected from an external already-authenticated
 * project. The external project appends a one-time `token` query parameter to the URL:
 *
 *   https://skillhub.example.com/auth/external?token=xxx&returnTo=/dashboard
 *
 * Flow:
 * 1. Extract `token` from URL search params
 * 2. Call backend API to exchange the token for a session + user info
 * 3. On success: redirect to `returnTo` (defaults to /dashboard)
 * 4. On failure: show error and offer a link to the normal login page
 */
export function ExternalAuthPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/auth/external' })
  const mutation = useExternalTokenLogin()
  const attemptedRef = useRef(false)

  const token = search.token
  const returnTo = search.returnTo && search.returnTo.startsWith('/') ? search.returnTo : '/dashboard'

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
            <a
              href="/login"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              {t('externalAuth.goToLogin')}
            </a>
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
            <a
              href="/login"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              {t('externalAuth.goToLogin')}
            </a>
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
