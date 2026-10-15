import { useId, type CSSProperties } from 'react'
import styles from './HandDrawnUnderline.module.css'

/*
 * A marker stroke under a word, drawn as if by hand. The stroke is a filled
 * brush shape (blunt where the marker lands, thinning to a dry tip, slightly
 * uneven), revealed along its centre line by an animated mask, so it appears
 * left to right at the pace of a hand. Two faint streaks, where the bristles
 * carried less ink, give it a little texture.
 *
 * Drawn in a 300 × 40 box that stretches with the word, so it sits correctly
 * under the word at any size.
 */

const WIDTH = 300
const SAMPLES = 48

/** The stroke's centre line: rising slightly to the right, with a small hand wobble. */
const centre = (x: number) => 25 - x * 0.03 + Math.sin(x / 47 + 0.6) * 1.6

/** Thickness along the stroke (0–1): lands blunt, thins to a dry tip, pressure varies a little. */
const thickness = (u: number) => {
  const landing = smoothstep(0, 0.07, u)
  const lift = Math.min(1, (1 - u) / 0.3) ** 0.6
  return 3 + 15 * landing * lift * (1 + 0.06 * Math.sin(u * 31))
}

function brushOutline() {
  const top: string[] = []
  const bottom: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES
    const x = 4 + u * (WIDTH - 8)
    const half = thickness(u) / 2
    top.push(`${x.toFixed(1)} ${(centre(x) - half * (1 + 0.05 * Math.sin(x / 6.3))).toFixed(1)}`)
    bottom.push(`${x.toFixed(1)} ${(centre(x) + half * (1 + 0.07 * Math.sin(x / 8.1 + 2))).toFixed(1)}`)
  }
  return `M${top.join(' L')} L${bottom.reverse().join(' L')} Z`
}

function centreLine(offset = 0) {
  const points: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = 4 + (i / SAMPLES) * (WIDTH - 8)
    points.push(`${x.toFixed(1)} ${(centre(x) + offset).toFixed(1)}`)
  }
  return `M${points.join(' L')}`
}

const BRUSH = brushOutline()
const STROKE = centreLine()
const BRISTLES = [centreLine(-3.2), centreLine(2.8)]

interface HandDrawnUnderlineProps {
  /** Seconds from the start of the intro until the hand starts drawing. */
  delay: number
}

export function HandDrawnUnderline({ delay }: HandDrawnUnderlineProps) {
  const id = useId()
  const stroke = `${id}-stroke`
  const ink = `${id}-ink`
  return (
    <svg
      className={styles.underline}
      viewBox={`0 0 ${WIDTH} 40`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ '--delay': `${delay}s` } as CSSProperties}
    >
      {/* Where the hand has been so far */}
      <mask id={stroke} maskUnits="userSpaceOnUse" x="0" y="0" width={WIDTH} height="40">
        <path className={styles.reveal} d={STROKE} pathLength={1} />
      </mask>
      {/* How much ink the brush laid down: full, less along two streaks */}
      <mask id={ink} maskUnits="userSpaceOnUse" x="0" y="0" width={WIDTH} height="40">
        <rect width={WIDTH} height="40" fill="#fff" />
        {BRISTLES.map((d) => (
          <path key={d} className={styles.bristle} d={d} />
        ))}
      </mask>
      <g mask={`url(#${stroke})`}>
        <path d={BRUSH} mask={`url(#${ink})`} />
      </g>
    </svg>
  )
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}
