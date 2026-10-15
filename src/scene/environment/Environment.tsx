import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import type { QualityTier } from '@/hooks/useQualityTier'
import { easeInOutCubic, segment } from '@/motion/easing'
import { INTRO } from '@/motion/intro'
import type { IntroClockRef } from '../useIntroClock'
import type { PointerDriftRef } from '../usePointerDrift'
import type { TravelRef } from '../useScrollTravel'
import { Architecture } from './Architecture'
import { ContactRoom } from './ContactRoom'
import { Dust } from './Dust'
import { Lights } from './Lights'
import { VOID_DISTANCE, voidFade } from './voidFade'

interface EnvironmentProps {
  intro: IntroClockRef
  travel: TravelRef
  drift: PointerDriftRef
  reducedMotion: boolean
  quality: QualityTier
}

/**
 * The exhibition hall: its forms, light and air, and the contact room beyond
 * its threshold. During the intro it emerges from the void.
 */
export function Environment({ intro, travel, drift, reducedMotion, quality }: EnvironmentProps) {
  const aspect = useThree((state) => state.viewport.aspect)

  useFrame(() => {
    const { start, duration } = INTRO.scene.reveal
    const reveal = easeInOutCubic(segment(intro.current.elapsed, start, duration))
    // Visibility reaches further into the hall as the intro plays
    voidFade.uVoidNear.value = MathUtils.lerp(1, VOID_DISTANCE.near, reveal)
    voidFade.uVoidFar.value = MathUtils.lerp(4, VOID_DISTANCE.far, reveal)
  })

  return (
    <>
      <Lights intro={intro} travel={travel} drift={drift} aspect={aspect} />
      <Architecture travel={travel} aspect={aspect} />
      <ContactRoom travel={travel} drift={drift} aspect={aspect} />
      <Dust intro={intro} travel={travel} reducedMotion={reducedMotion} quality={quality} aspect={aspect} />
    </>
  )
}
