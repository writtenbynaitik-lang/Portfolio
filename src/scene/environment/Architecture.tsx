import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MathUtils, MeshBasicMaterial, MeshStandardMaterial, type Mesh } from 'three'
import { TRAVEL_VIEWPORTS } from '@/motion/travel'
import { PALETTE } from '@/styles/palette'
import type { TravelRef } from '../useScrollTravel'
import {
  FLOOR_Y,
  hallSpread,
  journeyLighting,
  monolithLayout,
  PASSAGE,
  PILLARS,
  RENDER_ORDER,
  SLABS,
  THRESHOLD_SLIT,
} from './layout'
import { fadeIntoVoid } from './voidFade'

interface ArchitectureProps {
  travel: TravelRef
  aspect: number
}

const SLIT_COLOR = new Color(PALETTE.paper)

/** The hall's built forms: floor, the prominent monolith, smaller structures and the colonnade. */
export function Architecture({ travel, aspect }: ArchitectureProps) {
  const spread = hallSpread(aspect)
  const monolith = useMemo(() => monolithLayout(aspect), [aspect])

  // Three shared materials for the whole hall: few programs, cheap to draw. The
  // emissive term stands in for bounce light: it sets each surface's base tone
  // close to the backdrop, so unlit areas read as dim rather than black holes.
  const materials = useMemo(
    () => ({
      stone: fadeIntoVoid(
        new MeshStandardMaterial({
          color: '#41363b',
          emissive: '#120c10',
          roughness: 0.74,
          metalness: 0.05,
          dithering: true,
        }),
      ),
      floor: fadeIntoVoid(
        new MeshStandardMaterial({
          color: '#3d3338',
          emissive: '#130d11',
          roughness: 0.52,
          metalness: 0,
          dithering: true,
        }),
      ),
      light: fadeIntoVoid(new MeshBasicMaterial({ color: PALETTE.paper })),
    }),
    [],
  )
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])

  const slitX = THRESHOLD_SLIT.x * spread
  // The slit narrows with the hall, so it stays a line of light on phones
  const gap = THRESHOLD_SLIT.gap * spread
  // Opened in the finale: always wide enough for the camera to pass through
  const openGap = Math.max(PASSAGE.openGap * spread, 1.8)
  const slabs = useRef<Array<Mesh | null>>([])
  // The slit's light in two halves, one along each slab's inner edge: closed
  // they are one line of light; as the slabs part, the light splits and rides
  // the edges apart, fading, and the opening behind it is left dark
  const lightHalves = useRef<Array<Mesh | null>>([])

  // The slit of light glows with its spotlight (see journeyLighting); in the
  // finale the slabs part around it and its light gives way to the opening
  useFrame(() => {
    const journey = journeyLighting(travel.current.eased * TRAVEL_VIEWPORTS)
    // Barely there while the gallery plays in front of it, so it never reads as a pole behind a frame;
    // in the finale it dissolves (rather than dimming to grey) as it splits
    materials.light.color.copy(SLIT_COLOR).multiplyScalar(journey.threshold ** 4)
    const opening = MathUtils.lerp(gap, openGap, journey.opening)
    slabs.current.forEach((slab, index) => {
      if (slab) slab.position.x = slitX + (index === 0 ? -1 : 1) * (opening / 2 + THRESHOLD_SLIT.slab[0] / 2)
    })
    lightHalves.current.forEach((half, index) => {
      if (!half) return
      // Each half thins as it rides its edge outward
      const width = gap * MathUtils.lerp(0.45, 0.2, journey.opening)
      half.scale.x = width / (gap * 0.45)
      half.position.x = slitX + (index === 0 ? -1 : 1) * (opening / 2 - width / 2)
      half.visible = journey.slit > 0.001
      const material = half.material as MeshBasicMaterial
      material.opacity = journey.slit
    })
  })

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, FLOOR_Y, -20]}
        material={materials.floor}
        renderOrder={RENDER_ORDER.floor}
      >
        <planeGeometry args={[140, 140]} />
      </mesh>

      <RoundedBox
        args={monolith.size}
        radius={0.05}
        smoothness={3}
        position={monolith.position}
        rotation-y={monolith.yaw}
        material={materials.stone}
      />

      {SLABS.map(({ x, z, size, yaw }) => (
        <mesh
          key={`${x}:${z}`}
          position={[x * spread, FLOOR_Y + size[1] / 2, z]}
          rotation-y={yaw}
          material={materials.stone}
        >
          <boxGeometry args={size} />
        </mesh>
      ))}

      {/* The threshold: two slabs either side of a narrow slit of light */}
      {[-1, 1].map((side, index) => (
        <mesh
          key={side}
          ref={(mesh) => {
            slabs.current[index] = mesh
          }}
          position={[
            slitX + side * (gap / 2 + THRESHOLD_SLIT.slab[0] / 2),
            FLOOR_Y + THRESHOLD_SLIT.slab[1] / 2,
            THRESHOLD_SLIT.z,
          ]}
          material={materials.stone}
        >
          <boxGeometry args={THRESHOLD_SLIT.slab} />
        </mesh>
      ))}
      {[-1, 1].map((side, index) => (
        <mesh
          key={side}
          ref={(mesh) => {
            lightHalves.current[index] = mesh
          }}
          position={[slitX + side * (gap * 0.45) / 2, FLOOR_Y + THRESHOLD_SLIT.height / 2, THRESHOLD_SLIT.z]}
          material={materials.light}
        >
          <planeGeometry args={[gap * 0.45, THRESHOLD_SLIT.height]} />
        </mesh>
      ))}

      {PILLARS.positions.map(([x, z]) => (
        <mesh
          key={`${x}:${z}`}
          position={[x * spread, FLOOR_Y + PILLARS.size[1] / 2, z]}
          material={materials.stone}
        >
          <boxGeometry args={PILLARS.size} />
        </mesh>
      ))}
    </group>
  )
}
