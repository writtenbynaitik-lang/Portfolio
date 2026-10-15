import type { RefObject } from 'react'
import type { QualityTier } from '@/hooks/useQualityTier'
import { CameraRig } from './CameraRig'
import { Environment } from './environment/Environment'
import { Gallery } from './gallery/Gallery'
import type { GalleryInteraction } from './gallery/interaction'
import { useAfterFirstFrame } from './useAfterFirstFrame'
import { useIntroClock } from './useIntroClock'
import { usePointerDrift } from './usePointerDrift'
import { useScrollTravel } from './useScrollTravel'

export interface WorldProps {
  introPlaying: boolean
  reducedMotion: boolean
  quality: QualityTier
  /** The environment responds subtly to the pointer (mouse/trackpad only, not with reduced motion). */
  parallax: boolean
  /** Element whose height is the scroll distance of the travel; absent when travel is off. */
  travelTrack: RefObject<HTMLElement | null>
  /** The opening copy, which fades as the travel begins. */
  heroCopy: RefObject<HTMLElement | null>
  /** The contact scene's page layer, revealed as the journey arrives. */
  contactScene: RefObject<HTMLElement | null>
  travelEnabled: boolean
  /** Caption elements for the gallery's projects, in project order. */
  galleryCaptions: RefObject<Array<HTMLElement | null>>
  /** What the visitor is doing with the gallery through the page (keyboard, links). */
  galleryInteraction: GalleryInteraction
  onReady: () => void
}

/** Root of the 3D environment. */
export function World({
  introPlaying,
  reducedMotion,
  quality,
  parallax,
  travelTrack,
  heroCopy,
  contactScene,
  travelEnabled,
  galleryCaptions,
  galleryInteraction,
  onReady,
}: WorldProps) {
  const intro = useIntroClock(introPlaying, reducedMotion)
  const travel = useScrollTravel(travelTrack, heroCopy, contactScene, travelEnabled)
  const drift = usePointerDrift(parallax, galleryInteraction)
  useAfterFirstFrame(onReady)

  return (
    <>
      <CameraRig intro={intro} travel={travel} drift={drift} />
      <Environment intro={intro} travel={travel} drift={drift} reducedMotion={reducedMotion} quality={quality} />
      {/* The gallery lives along the journey; without it the page shows a static one instead */}
      {travelEnabled && <Gallery intro={intro} quality={quality} travel={travel} captions={galleryCaptions} interaction={galleryInteraction} />}
    </>
  )
}
