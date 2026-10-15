import type { FocusEvent, RefObject } from 'react'
import type { Project } from '@/content/projects'
import { cx } from '@/lib/cx'
import { momentAt, TRAVEL_VIEWPORTS } from '@/motion/travel'
import type { GalleryInteraction } from '@/scene/gallery/interaction'
import typography from '@/styles/typography.module.css'
import utilities from '@/styles/utilities.module.css'
import { ProjectCaption } from './ProjectCaption'
import styles from './GalleryCaptions.module.css'

interface GalleryCaptionsProps {
  projects: readonly Project[]
  /** Filled with one element per project; the scene positions and fades them under their frames. */
  elements: RefObject<Array<HTMLElement | null>>
  /** Keyboard focus and pointer over a link, reported to the scene. */
  interaction: GalleryInteraction
}

/**
 * The work, as a real list over the canvas: each project's caption, placed
 * under its frame by the scene, with a link to the live site where one is
 * configured. Projects without one say so instead, and nothing about them
 * pretends to be clickable. The links are the keyboard's way into the gallery: focusing one
 * brings its project to its moment and into focus.
 */
export function GalleryCaptions({ projects, elements, interaction }: GalleryCaptionsProps) {
  const focusProject = (index: number, event: FocusEvent<HTMLAnchorElement>) => {
    interaction.focus(index)
    // Only keyboard focus moves the page; clicking a link that's already showing shouldn't
    if (!event.currentTarget.matches(':focus-visible')) return
    const track = event.currentTarget.closest<HTMLElement>('[data-travel-track]')
    if (!track) return
    const viewport = track.offsetHeight / TRAVEL_VIEWPORTS
    const top = momentAt(index) * viewport
    if (Math.abs(window.scrollY - top) > viewport * 0.15) window.scrollTo({ top, behavior: 'smooth' })
  }
  return (
    <ol className={styles.layer}>
      {projects.map((project, index) => (
        <li
          key={project.id}
          ref={(element) => {
            elements.current[index] = element
          }}
          className={styles.caption}
          onPointerEnter={() => interaction.enterCaption(index)}
          onPointerLeave={() => interaction.leaveCaption(index)}
        >
          <ProjectCaption project={project} index={index}>
            {project.url ? (
              <a
                className={cx(typography.labelSmall, styles.action)}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                onFocus={(event) => focusProject(index, event)}
                onBlur={() => interaction.blur(index)}
              >
                <span className={utilities.visuallyHidden}>{project.title}: </span>
                Visit website
                <span aria-hidden="true">↗</span>
                <span className={utilities.visuallyHidden}> (opens in a new tab)</span>
              </a>
            ) : (
              // Said plainly, not styled as a link: there's nowhere to go yet
              <span className={cx(typography.labelSmall, styles.action, styles.unavailable)}>
                Live site not yet published
              </span>
            )}
          </ProjectCaption>
        </li>
      ))}
    </ol>
  )
}
