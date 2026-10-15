import type { RefObject } from 'react'
import { SECTION_ID } from '@/config/navigation'
import type { Project } from '@/content/projects'
import { CONTACT_VIEWPORTS, GALLERY_TIMING, TRAVEL_VIEWPORTS } from '@/motion/travel'
import type { GalleryInteraction } from '@/scene/gallery/interaction'
import utilities from '@/styles/utilities.module.css'
import { GalleryCaptions } from './GalleryCaptions'
import styles from './WorkTrack.module.css'

interface WorkTrackProps {
  projects: readonly Project[]
  /** Caption elements, positioned by the scene under their frames. */
  captions: RefObject<Array<HTMLElement | null>>
  interaction: GalleryInteraction
}

/**
 * The part of the journey where the 3D gallery plays out (everything before
 * the contact scene). It holds the work itself as a list (the captions and
 * their links), and the #work target, placed at the first project's moment.
 */
export function WorkTrack({ projects, captions, interaction }: WorkTrackProps) {
  return (
    <section
      className={styles.track}
      style={{ height: `${(TRAVEL_VIEWPORTS - CONTACT_VIEWPORTS) * 100}svh` }}
      aria-labelledby="work-title"
    >
      {/* The track begins one screen down, so this lands exactly on the first moment */}
      <span
        id={SECTION_ID.work}
        className={styles.anchor}
        style={{ top: `${(GALLERY_TIMING.firstMoment - 1) * 100}svh` }}
      />
      <h2 id="work-title" className={utilities.visuallyHidden}>
        Selected work
      </h2>
      <GalleryCaptions projects={projects} elements={captions} interaction={interaction} />
    </section>
  )
}
