import emberHouse1280 from '@/assets/projects/ember-house-1280.webp'
import emberHouse1600 from '@/assets/projects/ember-house-1600.webp'
import emberHouse960 from '@/assets/projects/ember-house-960.webp'
import rajuUncle1280 from '@/assets/projects/raju-uncle-1280.webp'
import rajuUncle1600 from '@/assets/projects/raju-uncle-1600.webp'
import rajuUncle960 from '@/assets/projects/raju-uncle-960.webp'
import serein1280 from '@/assets/projects/serein-1280.webp'
import serein1600 from '@/assets/projects/serein-1600.webp'
import serein960 from '@/assets/projects/serein-960.webp'
import middleRoom1280 from '@/assets/projects/middle-room-1280.webp'
import middleRoom1600 from '@/assets/projects/middle-room-1600.webp'
import middleRoom960 from '@/assets/projects/middle-room-960.webp'
import riverstone1280 from '@/assets/projects/riverstone-1280.webp'
import riverstone1600 from '@/assets/projects/riverstone-1600.webp'
import riverstone960 from '@/assets/projects/riverstone-960.webp'
import theThirdPlace1280 from '@/assets/projects/the-third-place-1280.webp'
import theThirdPlace1600 from '@/assets/projects/the-third-place-1600.webp'
import theThirdPlace960 from '@/assets/projects/the-third-place-960.webp'
import vora1280 from '@/assets/projects/vora-1280.webp'
import vora1600 from '@/assets/projects/vora-1600.webp'
import vora960 from '@/assets/projects/vora-960.webp'

/** One size of a preview image. */
export interface PreviewSource {
  src: string
  /** Pixel width of this file. */
  width: number
}

/**
 * A real screenshot of a project's site, as the same capture at several
 * sizes, so each screen loads (and holds on the GPU) only what it can show.
 */
export interface ProjectPreview {
  /** Smallest first. */
  sources: readonly PreviewSource[]
  /** Pixel size of the capture; only the ratio matters. */
  width: number
  height: number
}

/** A website shown in the gallery, in the order the visitor meets them. */
export interface Project {
  /** Stable, URL-safe identifier. */
  id: string
  title: string
  /** A shorter form of the title (the site's own wordmark), for captions where space is tight. */
  shortTitle?: string
  /** Short descriptor shown under the title. */
  category?: string
  /**
   * Screenshot of the site, or null until one exists. Without one the gallery
   * shows a plain surface labelled with the title, never a stand-in image.
   */
  preview: ProjectPreview | null
  /**
   * The live site, opened in a new tab. Only a verified, published address;
   * without one the project is shown but nothing about it is clickable.
   */
  url: string | null
}

/**
 * Whether to include work whose owners (the venue, the brand) haven't yet
 * agreed to it being shown. Set to false before publishing the portfolio:
 * that work is then left out of the build entirely, screenshots included.
 * Once permission is confirmed, move the project into the main list instead.
 */
export const SHOW_UNCONFIRMED_WORK = false

/**
 * Previews are the opening screen of each site, captured at 1440 × 900 (2×)
 * from the project's own source or its live site, and downscaled to
 * 960 / 1280 / 1600 px WebP.
 */
const desktop = (w960: string, w1280: string, w1600: string): ProjectPreview => ({
  sources: [
    { src: w960, width: 960 },
    { src: w1280, width: 1280 },
    { src: w1600, width: 1600 },
  ],
  width: 1440,
  height: 900,
})

/*
 * URLs are each repository's published production address (its GitHub
 * homepage, deployed on Vercel), checked to serve the matching site.
 */

/**
 * An unofficial concept built on the venue's own photography: shown only
 * while SHOW_UNCONFIRMED_WORK is true, until the owners have agreed.
 */
const theThirdPlace: Project = {
  id: 'the-third-place',
  title: 'The Third Place',
  category: 'Coffee house & wine bar',
  preview: desktop(theThirdPlace960, theThirdPlace1280, theThirdPlace1600),
  url: 'https://the-third-place-olive.vercel.app/',
}

export const projects: readonly Project[] = [
  {
    id: 'riverstone',
    title: 'Riverstone',
    category: 'Fine dine & bar',
    preview: desktop(riverstone960, riverstone1280, riverstone1600),
    url: 'https://riverstone-web.vercel.app/',
  },
  {
    id: 'vora',
    title: 'VORA',
    category: 'Protein shake concept',
    preview: desktop(vora960, vora1280, vora1600),
    url: 'https://vora-website-nine.vercel.app/',
  },
  {
    id: 'middle-room',
    title: 'Middle Room',
    category: 'Listening bar',
    preview: desktop(middleRoom960, middleRoom1280, middleRoom1600),
    url: 'https://middle-room-website.vercel.app/',
  },
  {
    id: 'raju-uncle',
    title: 'Raju Uncle Ke Chole Bhature',
    shortTitle: 'Raju Uncle',
    category: 'North Indian comfort food',
    preview: desktop(rajuUncle960, rajuUncle1280, rajuUncle1600),
    url: 'https://raju-uncle-ke-chole-bhature-website.vercel.app/',
  },
  {
    id: 'ember-house',
    title: 'Ember House',
    category: 'Live-fire restaurant',
    preview: desktop(emberHouse960, emberHouse1280, emberHouse1600),
    url: 'https://ember-house-website.vercel.app/',
  },
  {
    id: 'serein',
    title: 'Serein',
    // The site presents itself as a fictional concept
    category: 'Mediterranean restaurant concept',
    preview: desktop(serein960, serein1280, serein1600),
    url: 'https://serein-website-iota.vercel.app/',
  },
  // Written inline so that, switched off, the build drops it and its files
  ...(SHOW_UNCONFIRMED_WORK ? [theThirdPlace] : []),
  {
    // No screenshot, source or published site for PULP yet
    id: 'pulp',
    title: 'PULP',
    preview: null,
    url: null,
  },
]
