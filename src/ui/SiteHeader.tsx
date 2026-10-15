import { INTRO, revealTiming } from '@/motion/intro'
import reveal from '@/motion/reveal.module.css'
import { Signature } from './Signature'
import { SiteNav } from './SiteNav'
import styles from './SiteHeader.module.css'

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={reveal.fade} style={revealTiming(INTRO.signature)}>
        <Signature />
      </div>
      <div className={reveal.fade} style={revealTiming(INTRO.nav)}>
        <SiteNav />
      </div>
    </header>
  )
}
