import type { ReactNode, Ref } from 'react'
import type { Project } from '@/content/projects'
import { cx } from '@/lib/cx'
import typography from '@/styles/typography.module.css'
import styles from './ProjectCaption.module.css'

interface ProjectCaptionProps {
  ref?: Ref<HTMLDivElement>
  project: Project
  /** Position in the gallery, from 0. */
  index: number
  className?: string
  /** Shown under the caption, aligned with the title (e.g. a link to the site). */
  children?: ReactNode
}

/** A project's caption, museum-label style: number, title, and what it is. */
export function ProjectCaption({ ref, project, index, className, children }: ProjectCaptionProps) {
  return (
    <div ref={ref} className={cx(styles.caption, className)}>
      <span className={cx(typography.labelSmall, styles.index)}>{String(index + 1).padStart(2, '0')}</span>
      <span className={styles.title}>
        {project.shortTitle ? (
          <>
            <span className={styles.full}>{project.title}</span>
            {/* Shown instead where space is tight; the full title is still read out */}
            <span className={styles.short} aria-hidden="true">
              {project.shortTitle}
            </span>
          </>
        ) : (
          project.title
        )}
      </span>
      {project.category && <span className={cx(typography.labelSmall, styles.category)}>{project.category}</span>}
      {children && <span className={styles.extra}>{children}</span>}
    </div>
  )
}
