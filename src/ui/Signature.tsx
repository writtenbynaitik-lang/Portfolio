import { SECTION_ID } from '@/config/navigation'
import { cx } from '@/lib/cx'
import typography from '@/styles/typography.module.css'
import styles from './Signature.module.css'

interface SignatureProps {
  className?: string
}

/** The "PORTFOLIO" mark. Links back to the opening scene. */
export function Signature({ className }: SignatureProps) {
  return (
    <a className={cx(typography.label, styles.signature, className)} href={`#${SECTION_ID.top}`}>
      Portfolio
    </a>
  )
}
