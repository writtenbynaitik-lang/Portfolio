import { projects } from '@/content/projects'

/**
 * Scroll-driven travel into the environment.
 *
 * The page scrolls natively. Once per frame the scene's loop samples the scroll
 * position (src/scene/useScrollTravel.ts), eases toward it and moves the camera
 * and the gallery; there are no scroll event handlers. The same loop publishes
 * how far the opening copy has scrolled away as the CSS variable --hero-exit (0–1).
 */

/**
 * Pacing of the gallery, in viewport heights of scroll from the top of the
 * page. Each project has a "moment": the scroll position where it is centred
 * and captioned. Between moments one project hands over to the next.
 */
export const GALLERY_TIMING = {
  /** The first project's moment, once the opening copy has gone. */
  firstMoment: 1.35,
  /** Scroll between consecutive moments. */
  spacing: 1.05,
  /** How long each project holds its moment, either side of it. */
  hold: 0.24,
  /** After the last moment: the gallery gathers at the far end of the hall. */
  finale: 1.45,
} as const

/** Scroll position of project `index`'s moment, in viewport heights. */
export const momentAt = (index: number) => GALLERY_TIMING.firstMoment + index * GALLERY_TIMING.spacing

/** Where the gallery has gathered around the threshold at the far end of the hall. */
export const GALLERY_END = momentAt(Math.max(projects.length - 1, 0)) + GALLERY_TIMING.finale

/**
 * The finale, after the gallery: a pause on the gathering, then the passage
 * through the threshold into the contact room, where the journey comes to
 * rest. In viewport heights of scroll.
 */
export const FINALE_TIMING = {
  /** The gathering holds a moment before the camera moves on. */
  hold: 0.3,
  /** From leaving the gathering to arriving in the contact room. */
  passage: 2.3,
} as const

/** The camera leaves the gathering for the threshold. */
export const DEPARTURE = GALLERY_END + FINALE_TIMING.hold

/** The camera has come to rest in the contact room: the end of the journey. */
export const ARRIVAL = DEPARTURE + FINALE_TIMING.passage

/** Scroll distance of the journey after the opening screen, in viewport heights. */
export const TRAVEL_VIEWPORTS = ARRIVAL

/**
 * The contact room's page content: pinned on screen over the last
 * CONTACT_VIEWPORTS of scroll, and revealed in stages as the camera arrives,
 * over `CONTACT_REVEAL` before the end. The pinning starts before the reveal,
 * so the content never slides in with the page.
 */
export const CONTACT_VIEWPORTS = 2
export const CONTACT_REVEAL = 0.95

/** How far (in viewport heights) the opening copy scrolls before it has fully faded. */
export const HERO_EXIT_VIEWPORTS = 0.5

/** Rate at which the camera catches up with the scroll position (higher is snappier). */
export const TRAVEL_EASING = 3.2
