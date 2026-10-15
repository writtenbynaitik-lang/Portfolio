import { NAV_ITEMS } from '@/config/navigation'
import { cx } from '@/lib/cx'
import typography from '@/styles/typography.module.css'
import styles from './SiteNav.module.css'

export function SiteNav() {
  return (
    <nav aria-label="Primary">
      <ul className={styles.list}>
        {NAV_ITEMS.map((item) => (
          <li key={item.target}>
            <a className={cx(typography.label, styles.link)} href={`#${item.target}`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
