export const PRELOAD_RECOVERY_STORAGE_KEY = 'skillhub:vite-preload-recovery-attempted'

interface PreloadRecoveryEventTarget {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void
}

interface PreloadRecoveryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface PreloadErrorRecoveryOptions {
  target?: PreloadRecoveryEventTarget
  storage?: PreloadRecoveryStorage
  reload?: () => void
}

/**
 * Reloads once when Vite cannot fetch a lazy-loaded chunk from the current deployment.
 * The session marker survives the reload, preventing a missing or misrouted asset from
 * sending the browser into an infinite refresh loop.
 */
export function installPreloadErrorRecovery(options: PreloadErrorRecoveryOptions = {}) {
  const target = options.target ?? window
  const storage = options.storage ?? window.sessionStorage
  const reload = options.reload ?? (() => window.location.reload())

  const handlePreloadError: EventListener = (event) => {
    try {
      if (storage.getItem(PRELOAD_RECOVERY_STORAGE_KEY) === 'true') {
        return
      }
      storage.setItem(PRELOAD_RECOVERY_STORAGE_KEY, 'true')
    } catch {
      // Without a persistent marker, reloading could create an infinite loop.
      return
    }

    event.preventDefault()
    reload()
  }

  target.addEventListener('vite:preloadError', handlePreloadError)

  return () => {
    target.removeEventListener('vite:preloadError', handlePreloadError)
  }
}
