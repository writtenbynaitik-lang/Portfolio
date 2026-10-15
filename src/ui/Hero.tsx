import type { CSSProperties, Ref } from 'react'
import { SECTION_ID } from '@/config/navigation'
import { cx } from '@/lib/cx'
import { INTRO, revealTiming } from '@/motion/intro'
import reveal from '@/motion/reveal.module.css'
import { TYPING, typeOut, type Keystroke } from '@/motion/typing'
import utilities from '@/styles/utilities.module.css'
import { HandDrawnUnderline } from './HandDrawnUnderline'
import { ScrollIndicator } from './ScrollIndicator'
import styles from './Hero.module.css'

/** One stretch of the headline in a single style. */
interface Run {
  text: string
  /** Set in the serif italic, for contrast. */
  accent?: boolean
  /** Marked with the hand-drawn underline once it has been typed. */
  underline?: boolean
}

/** The headline, line by line. Its plain reading is HEADLINE_TEXT. */
const HEADLINE: readonly (readonly Run[])[] = [
  [{ text: 'I build' }],
  [{ text: 'Digital ' }, { text: 'worlds', accent: true, underline: true }, { text: '.', accent: true }],
]
const HEADLINE_TEXT = 'I build digital worlds.'

const typing = typeOut(HEADLINE.map((line) => line.map((run) => run.text).join('')))
const typedAt = (seconds: number) => INTRO.headline.start + TYPING.lead + seconds
const lastKeystroke = typing.keystrokes.flat().at(-1)

/** When the underline starts: just after its word's last letter appears. */
const underlineAt = (() => {
  let index = 0
  for (const [lineIndex, line] of HEADLINE.entries()) {
    for (const run of line) {
      index += run.text.length
      if (run.underline) return typedAt(typing.keystrokes[lineIndex]?.[index - 1]?.at ?? 0) + 0.12
    }
    index = 0
  }
  return typedAt(typing.end)
})()

interface HeroProps {
  /** The section element; the scene sets --hero-exit on it while scrolling. */
  ref?: Ref<HTMLElement>
  /** Only invite scrolling when there's somewhere to scroll to. */
  scrollCue: boolean
}

/** Opening scene: the typed headline and the scroll cue over the backdrop. */
export function Hero({ ref, scrollCue }: HeroProps) {
  const settled = typedAt(typing.end)
  return (
    <section ref={ref} id={SECTION_ID.top} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.composition}>
        <h1 id="hero-title" className={styles.headline}>
          {/* Read once, as a sentence; the typed letters are for the eye */}
          <span className={utilities.visuallyHidden}>{HEADLINE_TEXT}</span>
          <span aria-hidden="true">
            {HEADLINE.map((line, lineIndex) => (
              <span key={lineIndex} className={cx(styles.line, lineIndex > 0 && styles.indented)}>
                {lineIndex === 0 && (
                  <span className={cx(styles.char, styles.lead)} style={timing(INTRO.headline.start, TYPING.lead)} />
                )}
                {renderLine(line, typing.keystrokes[lineIndex] ?? [], lineIndex === HEADLINE.length - 1)}
              </span>
            ))}
          </span>
        </h1>
      </div>

      {scrollCue && (
        <div className={styles.cue}>
          <div className={reveal.fade} style={revealTiming(settled + 0.55)}>
            <ScrollIndicator />
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * A line as words of single characters, each appearing at its keystroke. Words
 * never break inside; the spaces between them are where a narrow screen wraps.
 */
function renderLine(line: readonly Run[], keystrokes: readonly Keystroke[], isLast: boolean) {
  let index = 0
  return line.map((run, runIndex) => {
    const words = run.text.split(/(\s+)/).filter(Boolean)
    const content = words.map((word, wordIndex) => (
      <span key={wordIndex} className={/\s/.test(word) ? undefined : styles.word}>
        {[...word].map((character, characterIndex) => {
          const keystroke = keystrokes[index++]
          const final = isLast && keystroke === lastKeystroke
          return (
            <span
              key={characterIndex}
              className={cx(styles.char, final && styles.final)}
              style={keystroke ? timing(typedAt(keystroke.at), keystroke.hold) : undefined}
            >
              {character}
            </span>
          )
        })}
      </span>
    ))
    return (
      <span key={runIndex} className={cx(run.accent && styles.accent, run.underline && styles.marked)}>
        {content}
        {run.underline && <HandDrawnUnderline delay={underlineAt} />}
      </span>
    )
  })
}

/** A character's moment: when it appears and how long the caret stays after it. */
const timing = (at: number, hold: number) => ({ '--at': `${at.toFixed(3)}s`, '--hold': `${hold.toFixed(3)}s` }) as CSSProperties
