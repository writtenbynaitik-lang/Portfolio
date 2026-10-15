import { useSyncExternalStore } from 'react'

/** Phones and touch-first devices get a lighter scene. */
const LOW_QUERY = '(max-width: 767px), (pointer: coarse)'

export type QualityTier = 'high' | 'low'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(LOW_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useQualityTier(): QualityTier {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(LOW_QUERY).matches ? 'low' : 'high'),
    () => 'high',
  )
}
