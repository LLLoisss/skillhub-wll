import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useCopyToClipboard } from '@/shared/lib/clipboard'

interface InstallCommandProps {
  namespace: string
  slug: string
  version?: string
}

export function buildInstallTarget(namespace: string, slug: string): string {
  return namespace === 'global' ? slug : `${namespace}--${slug}`
}

export function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const runtimeConfig = window.__SKILLHUB_RUNTIME_CONFIG__
  const configuredUrl = runtimeConfig?.appBaseUrl
  // Use configured URL only if it's set and not localhost
  if (configuredUrl && !configuredUrl.includes('localhost')) {
    return configuredUrl
  }
  // Fallback to current page origin
  return `${window.location.protocol}//${window.location.host}`
}

/**
 * Returns the web app base URL (origin + vite base path).
 * Use this for share links that point to browser-navigable pages.
 * For API registry URLs, use getBaseUrl() instead.
 */
export function getWebAppBaseUrl(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const runtimeConfig = window.__SKILLHUB_RUNTIME_CONFIG__
  const configuredUrl = runtimeConfig?.appBaseUrl
  let origin: string
  if (configuredUrl && !configuredUrl.includes('localhost')) {
    origin = configuredUrl.replace(/\/$/, '')
  } else {
    origin = `${window.location.protocol}//${window.location.host}`
  }
  // Append base path if not already present
  if (basePath && !origin.endsWith(basePath)) {
    return origin + basePath
  }
  return origin
}

export function buildInstallCommand(namespace: string, slug: string, baseUrl: string): string {
  const installTarget = buildInstallTarget(namespace, slug)
  return `npx clawhub install ${installTarget} --registry ${baseUrl}`
}

export function InstallCommand({ namespace, slug }: InstallCommandProps) {
  const { t } = useTranslation()
  const [copied, copy] = useCopyToClipboard()

  const baseUrl = useMemo(() => getBaseUrl(), [])

  const command = useMemo(() => buildInstallCommand(namespace, slug, baseUrl), [baseUrl, namespace, slug])

  const handleCopy = async () => {
    try {
      await copy(command)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/50">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        title={copied ? t('copyButton.copied') : t('copyButton.copy')}
        aria-label={copied ? t('copyButton.copied') : t('copyButton.copy')}
        className="absolute right-2 top-2 z-10 h-8 w-8 rounded-md bg-background/80 backdrop-blur hover:bg-background"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="px-4 py-3 pr-14 whitespace-pre-wrap break-all">
        <code className="font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-all sm:text-sm">
          {command}
        </code>
      </pre>
    </div>
  )
}
