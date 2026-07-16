import { useEffect, useState } from 'react'

export const SUITE_DIALOG_TRANSITION_MS = 360

export const SUITE_DIALOG_ANIMATION_CLASS_NAME = 'suite-dialog-motion'

/** Keeps a dialog mounted long enough for both its enter and exit transitions. */
export function useAnimatedDialogPresence(open: boolean) {
  const [isMounted, setIsMounted] = useState(open)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let firstAnimationFrameId: number | undefined
    let secondAnimationFrameId: number | undefined
    let closeTimeoutId: number | undefined

    if (open) {
      setIsMounted(true)
      firstAnimationFrameId = window.requestAnimationFrame(() => {
        secondAnimationFrameId = window.requestAnimationFrame(() => setIsVisible(true))
      })
    } else {
      setIsVisible(false)
      closeTimeoutId = window.setTimeout(
        () => setIsMounted(false),
        SUITE_DIALOG_TRANSITION_MS,
      )
    }

    return () => {
      if (firstAnimationFrameId !== undefined) window.cancelAnimationFrame(firstAnimationFrameId)
      if (secondAnimationFrameId !== undefined) window.cancelAnimationFrame(secondAnimationFrameId)
      if (closeTimeoutId !== undefined) window.clearTimeout(closeTimeoutId)
    }
  }, [open])

  return { isMounted, isVisible }
}
