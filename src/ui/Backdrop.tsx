import { cx } from '@/lib/cx'
import { INTRO, revealTiming } from '@/motion/intro'
import reveal from '@/motion/reveal.module.css'
import styles from './Backdrop.module.css'

/** Atmospheric light behind the 3D scene. Blooms in as the intro begins. */
export function Backdrop() {
  return <div className={cx(styles.backdrop, reveal.bloom)} style={revealTiming(INTRO.backdrop)} aria-hidden="true" />
}
