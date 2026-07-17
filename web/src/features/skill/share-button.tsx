import { useTranslation } from 'react-i18next'
import { Share2, Check } from 'lucide-react'
import { useCopyToClipboard } from '@/shared/lib/clipboard'
import { getWebAppBaseUrl } from './install-command'

interface ShareButtonProps {
  namespace: string
  slug: string
  description?: string
  resourcePath?: string
  displayName?: string
  translationPrefix?: 'skillDetail.share' | 'suites.share'
  testId?: string
}

/**
 * Build share text for a skill with full description
 */
export function buildResourceShareText(
  displayName: string,
  description: string | undefined,
  resourceUrl: string,
  defaultDescription: string,
): string {
  return `${displayName}\n${description || defaultDescription}\n${resourceUrl}`
}

export function buildShareText(
  namespace: string,
  slug: string,
  description: string | undefined,
  baseUrl: string,
  t: (key: string) => string,
): string {
  const skillUrl = `${baseUrl}/space/${namespace}/${encodeURIComponent(slug)}`
  const displayName = namespace === 'global' ? slug : `${namespace}/${slug}`

  return buildResourceShareText(
    displayName,
    description,
    skillUrl,
    t('skillDetail.share.defaultDescription'),
  )
}

export function ShareButton({
  namespace,
  slug,
  description,
  resourcePath,
  displayName,
  translationPrefix = 'skillDetail.share',
  testId = 'share-skill-button',
}: ShareButtonProps) {
  const { t } = useTranslation()
  const [copied, copy] = useCopyToClipboard()

  const handleShare = async () => {
    try {
      const baseUrl = getWebAppBaseUrl()
      const shareText = resourcePath
        ? buildResourceShareText(
            displayName ?? `${namespace}/${slug}`,
            description,
            `${baseUrl}${resourcePath}`,
            t(`${translationPrefix}.defaultDescription`),
          )
        : buildShareText(namespace, slug, description, baseUrl, t)
      await copy(shareText)
    } catch (err) {
      console.error('Failed to copy share text:', err)
    }
  }

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={handleShare}
      className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-muted/50 px-4 py-3 transition-colors hover:bg-muted/70 active:bg-muted/80"
    >
      <div className="flex items-center justify-center gap-2">
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        <span className="text-[13px] leading-relaxed text-foreground sm:text-sm">
          {copied ? t(`${translationPrefix}.copied`) : t(`${translationPrefix}.button`)}
        </span>
      </div>
    </button>
  )
}
