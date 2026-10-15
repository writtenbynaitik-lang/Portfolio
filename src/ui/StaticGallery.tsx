import { useState } from 'react'
import { SECTION_ID } from '@/config/navigation'
import type { Project } from '@/content/projects'
import { cx } from '@/lib/cx'
import typography from '@/styles/typography.module.css'
import utilities from '@/styles/utilities.module.css'
import { ProjectCaption } from './ProjectCaption'
import styles from './StaticGallery.module.css'

interface StaticGalleryProps {
  projects: readonly Project[]
}

/**
 * The gallery without the journey, for visitors who prefer reduced motion or
 * whose browser can't run the 3D scene: the same previews and captions, laid
 * out as a still, asymmetric page that scrolls normally.
 */
export function StaticGallery({ projects }: StaticGalleryProps) {
  return (
    <section id={SECTION_ID.work} className={styles.gallery} aria-labelledby="work-title">
      <h2 id="work-title" className={utilities.visuallyHidden}>
        Selected work
      </h2>
      <ol className={styles.list}>
        {projects.map((project, index) => (
          <li key={project.id} className={styles.item}>
            {project.url ? (
              <a className={styles.link} href={project.url} target="_blank" rel="noopener noreferrer">
                <Exhibit project={project} index={index} />
              </a>
            ) : (
              <Exhibit project={project} index={index} />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

/** One project: its framed preview and caption, with "Visit website" when it links out. */
function Exhibit({ project, index }: { project: Project; index: number }) {
  return (
    <figure className={styles.figure}>
      <div className={styles.frame}>
        <div className={styles.bar} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <Preview project={project} />
      </div>
      <figcaption>
        <ProjectCaption project={project} index={index}>
          {project.url ? (
            <span className={cx(typography.labelSmall, styles.action)}>
              Visit website <span aria-hidden="true">↗</span>
              <span className={utilities.visuallyHidden}> (opens in a new tab)</span>
            </span>
          ) : (
            <span className={cx(typography.labelSmall, styles.action, styles.unavailable)}>
              Live site not yet published
            </span>
          )}
        </ProjectCaption>
      </figcaption>
    </figure>
  )
}

function Preview({ project }: { project: Project }) {
  const [failed, setFailed] = useState(false)
  const { preview } = project

  if (!preview || failed) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderTitle}>{project.title}</span>
        <span className={cx(typography.labelSmall, styles.placeholderNote)}>
          {preview ? 'Preview unavailable' : 'Preview coming soon'}
        </span>
      </div>
    )
  }

  return (
    <img
      className={styles.image}
      src={preview.sources[0]?.src}
      srcSet={preview.sources.map((source) => `${source.src} ${source.width}w`).join(', ')}
      sizes="(max-width: 767px) 100vw, 64vw"
      width={preview.width}
      height={preview.height}
      alt={`Opening screen of the ${project.title} website`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
