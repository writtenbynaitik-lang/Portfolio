import { useRef, useState } from 'react'
import { projects } from '@/content/projects'
import { useFinePointer } from '@/hooks/useFinePointer'
import { useFontsReady } from '@/hooks/useFontsReady'
import { useIntroGate } from '@/hooks/useIntroGate'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useQualityTier } from '@/hooks/useQualityTier'
import { TRAVEL_VIEWPORTS } from '@/motion/travel'
import { GalleryInteraction } from '@/scene/gallery/interaction'
import { Stage } from '@/scene/Stage'
import { Backdrop } from '@/ui/Backdrop'
import { Hero } from '@/ui/Hero'
import { SiteHeader } from '@/ui/SiteHeader'
import { ContactScene } from '@/ui/ContactScene'
import { StaticGallery } from '@/ui/StaticGallery'
import { WorkTrack } from '@/ui/WorkTrack'

/** Faces visible in the opening scene; the intro waits for them. */
const INTRO_FONTS = [
  'condensed 860 1em "Archivo Variable"',
  'italic 400 1em "Instrument Serif"',
  '500 1em "Geist Variable"',
] as const

export function App() {
  const root = useRef<HTMLDivElement>(null)
  const travelTrack = useRef<HTMLDivElement>(null)
  const heroCopy = useRef<HTMLElement>(null)
  const contactScene = useRef<HTMLElement>(null)
  const galleryCaptions = useRef<Array<HTMLElement | null>>([])
  const [galleryInteraction] = useState(() => new GalleryInteraction())
  const reducedMotion = usePrefersReducedMotion()
  const finePointer = useFinePointer()
  const quality = useQualityTier()
  const fontsReady = useFontsReady(INTRO_FONTS)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)
  // WebGL start-up blocks the main thread for a moment; let it finish before anything moves
  const introPlaying = useIntroGate(fontsReady && sceneReady)
  // Scrolling moves the camera through the hall and its gallery. Without the
  // scene, or with reduced motion, the work is shown as a still page instead.
  const travelEnabled = !reducedMotion && !sceneFailed

  return (
    <div ref={root} data-intro={introPlaying ? 'play' : 'pending'} data-work={travelEnabled ? 'journey' : 'static'}>
      <Backdrop />
      <Stage
        eventSource={root}
        introPlaying={introPlaying}
        reducedMotion={reducedMotion}
        quality={quality}
        parallax={finePointer && !reducedMotion}
        travelTrack={travelTrack}
        heroCopy={heroCopy}
        contactScene={contactScene}
        travelEnabled={travelEnabled}
        galleryCaptions={galleryCaptions}
        galleryInteraction={galleryInteraction}
        onReady={() => setSceneReady(true)}
        onFailure={() => {
          setSceneFailed(true)
          setSceneReady(true)
        }}
      />
      <SiteHeader />
      <main>
        <Hero ref={heroCopy} scrollCue={travelEnabled || projects.length > 0} />
        {travelEnabled ? (
          // The scroll distance of the whole journey: the gallery, then the contact scene
          <div ref={travelTrack} style={{ height: `${TRAVEL_VIEWPORTS * 100}svh` }} data-travel-track>
            <WorkTrack projects={projects} captions={galleryCaptions} interaction={galleryInteraction} />
            <ContactScene ref={contactScene} mode="journey" />
          </div>
        ) : (
          <>
            {projects.length > 0 && <StaticGallery projects={projects} />}
            <ContactScene mode="static" />
          </>
        )}
      </main>
    </div>
  )
}
