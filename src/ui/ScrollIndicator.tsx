import { cx } from '@/lib/cx'
import typography from '@/styles/typography.module.css'
import styles from './ScrollIndicator.module.css'

export function ScrollIndicator() {
  return (
    <div className={styles.indicator}>
      <span className={cx(typography.labelSmall, styles.label)}>Scroll to explore</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.trace} />
      </span>
    </div>
  )
}
