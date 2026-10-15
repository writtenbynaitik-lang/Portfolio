import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { MathUtils } from 'three'
import { ARRIVAL, CONTACT_REVEAL, HERO_EXIT_VIEWPORTS, TRAVEL_EASING, TRAVEL_VIEWPORTS } from '@/motion/travel'

export interface TravelState {
  /** Progress through the travel track, 0–1, exactly as scrolled. */
  scrolled: number
  /** The same progress eased over time. The camera follows this. */
  eased: number
}

export type TravelRef = RefObject<TravelState>

const HERO_EXIT_PROPERTY = '--hero-exit'
const CONTACT_PROPERTY = '--contact'

/** The contact actions take the pointer once the scene is this far revealed. */
const ARRIVED = 0.7

/**
 * The single source of scroll-driven motion. Samples the scroll position once
 * per frame (priority -2: before any reader), eases toward it, and publishes
 * to CSS how far the opening copy has scrolled away and how far the contact
 * scene has been revealed. No scroll listeners involved.
 *
 * `track` is the element whose height is the travel distance. `copy` receives
 * --hero-exit and `contact` receives --contact (plus data-arrived once its
 * actions can be used): each is set on its own section rather than :root,
 * because changing an inherited property on the root restyles the whole
 * document every frame (measured: a third of frames late during the fade on
 * a low-end GPU).
 */
export function useScrollTravel(
  track: RefObject<HTMLElement | null>,
  copy: RefObject<HTMLElement | null>,
  contact: RefObject<HTMLElement | null>,
  enabled: boolean,
): TravelRef {
  const travel = useRef<TravelState>({ scrolled: 0, eased: 0 })
  const trackLength = useRef(0)
  const publishedExit = useRef(-1)
  const publishedContact = useRef(-1)

  useEffect(() => {
    const element = track.current
    if (!enabled || !element) return
    const measure = () => {
      trackLength.current = element.offsetHeight
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
      trackLength.current = 0
    }
  }, [track, enabled])

  useEffect(() => {
    const element = copy.current
    return () => {
      element?.style.removeProperty(HERO_EXIT_PROPERTY)
    }
  }, [copy])

  useEffect(() => {
    const element = contact.current
    return () => {
      element?.style.removeProperty(CONTACT_PROPERTY)
      element?.removeAttribute('data-arrived')
    }
  }, [contact])

  useFrame((_, delta) => {
    const length = trackLength.current
    const scrollY = length > 0 ? window.scrollY : 0
    const state = travel.current

    state.scrolled = length > 0 ? MathUtils.clamp(scrollY / length, 0, 1) : 0
    state.eased = MathUtils.damp(state.eased, state.scrolled, TRAVEL_EASING, delta)
    if (Math.abs(state.eased - state.scrolled) < 1e-4) state.eased = state.scrolled

    // The copy moves with the native scroll, so its fade uses the raw position, not the eased one
    const viewport = length / TRAVEL_VIEWPORTS
    const exit = viewport > 0 ? MathUtils.clamp(scrollY / (viewport * HERO_EXIT_VIEWPORTS), 0, 1) : 0
    if (copy.current && Math.abs(exit - publishedExit.current) > 0.001) {
      copy.current.style.setProperty(HERO_EXIT_PROPERTY, exit.toFixed(3))
      publishedExit.current = exit
    }

    // The contact scene reveals itself with the camera's arrival, so it follows the eased position
    const at = state.eased * TRAVEL_VIEWPORTS
    const reveal = MathUtils.smoothstep(at, ARRIVAL - CONTACT_REVEAL, ARRIVAL - 0.02)
    // Snapped at the ends, so the scene rests exactly hidden or exactly shown
    const revealed = reveal < 0.002 ? 0 : reveal > 0.998 ? 1 : reveal
    if (contact.current && Math.abs(revealed - publishedContact.current) > 0.002) {
      contact.current.style.setProperty(CONTACT_PROPERTY, revealed.toFixed(3))
      contact.current.toggleAttribute('data-arrived', revealed > ARRIVED)
      publishedContact.current = revealed
    }
  }, -2)

  return travel
}
