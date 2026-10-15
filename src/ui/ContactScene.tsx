import type { CSSProperties, FocusEvent, Ref } from 'react'
import { CONTACT_ACTIONS, opensNewTab, type ContactAction } from '@/config/contact'
import { SECTION_ID } from '@/config/navigation'
import { cx } from '@/lib/cx'
import { CONTACT_VIEWPORTS } from '@/motion/travel'
import typography from '@/styles/typography.module.css'
import utilities from '@/styles/utilities.module.css'
import styles from './ContactScene.module.css'

interface ContactSceneProps {
  /**
   * `journey`: the end of the scroll journey, pinned over the contact room
   * and revealed in stages as the camera arrives (the scene sets --contact on
   * the section). `static`: an ordinary final section, shown as it is.
   */
  mode: 'journey' | 'static'
  ref?: Ref<HTMLElement>
}

/** The finale: the closing statement and the two ways to get in touch. */
export function ContactScene({ mode, ref }: ContactSceneProps) {
  if (mode === 'static') {
    return (
      <section id={SECTION_ID.contact} className={cx(styles.scene, styles.static)} aria-labelledby="contact-title">
        <ContactContent />
      </section>
    )
  }
  return (
    <section
      ref={ref}
      className={cx(styles.scene, styles.journey)}
      style={{ height: `${CONTACT_VIEWPORTS * 100}svh` }}
      aria-labelledby="contact-title"
    >
      {/* The end of the journey: CONTACT lands here, with the camera at rest in the room */}
      <span id={SECTION_ID.contact} className={styles.anchor} style={{ top: `${(CONTACT_VIEWPORTS - 1) * 100}svh` }} />
      <div className={styles.stage}>
        <ContactContent onFocusAction={revealOnKeyboardFocus} />
      </div>
    </section>
  )
}

/** Keyboard focus reaching an action before the scene has arrived brings the journey to its end. */
function revealOnKeyboardFocus(event: FocusEvent<HTMLAnchorElement>) {
  if (!event.currentTarget.matches(':focus-visible')) return
  const end = document.documentElement.scrollHeight - window.innerHeight
  if (window.scrollY < end - 4) window.scrollTo({ top: end, behavior: 'smooth' })
}

const stagger = (order: number) => ({ '--order': order }) as CSSProperties

function ContactContent({ onFocusAction }: { onFocusAction?: (event: FocusEvent<HTMLAnchorElement>) => void }) {
  return (
    <div className={styles.content}>
      <h2 id="contact-title" className={styles.headline}>
        <span className={styles.mask}>
          <span className={styles.line} style={stagger(0)}>
            Let’s make something
          </span>
        </span>{' '}
        <span className={cx(styles.mask, styles.indented)}>
          <span className={styles.line} style={stagger(1)}>
            Impossible to <em className={styles.accent}>ignore.</em>
          </span>
        </span>
      </h2>
      <p className={cx(styles.support, styles.later)} style={stagger(2)}>
        Have an ambitious idea? Let’s bring it to life.
      </p>
      <div className={cx(styles.actions, styles.later)} style={stagger(3)}>
        <Action action={CONTACT_ACTIONS.primary} kind="primary" onFocus={onFocusAction} />
        <Action action={CONTACT_ACTIONS.secondary} kind="secondary" onFocus={onFocusAction} />
      </div>
    </div>
  )
}

interface ActionProps {
  action: ContactAction
  kind: 'primary' | 'secondary'
  onFocus?: (event: FocusEvent<HTMLAnchorElement>) => void
}

/**
 * A contact action: a real link when its destination is configured,
 * otherwise a plainly marked, non-interactive placeholder (no fake link).
 */
function Action({ action, kind, onFocus }: ActionProps) {
  const className = cx(typography.label, styles.action, styles[kind])
  const arrow = (
    <span className={styles.arrow} aria-hidden="true">
      ↗
    </span>
  )

  if (!action.href) {
    return (
      <span className={cx(className, styles.unconfigured)}>
        <span>
          {action.label}
          {arrow}
        </span>
        <span className={cx(typography.labelSmall, styles.note)}>Not yet configured</span>
      </span>
    )
  }

  const newTab = opensNewTab(action.href)
  return (
    <a
      className={className}
      href={action.href}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onFocus={onFocus}
    >
      {action.label}
      {arrow}
      {action.description && <span className={utilities.visuallyHidden}>, {action.description}</span>}
      {newTab && <span className={utilities.visuallyHidden}> (opens in a new tab)</span>}
    </a>
  )
}
