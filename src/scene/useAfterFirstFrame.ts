import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

/**
 * Calls `callback` once, after the scene's first frame has been drawn: the
 * WebGL context exists and shaders are compiled, so the expensive start-up
 * work is over.
 */
export function useAfterFirstFrame(callback: () => void) {
  const scheduled = useRef(false)

  useFrame(() => {
    if (scheduled.current) return
    scheduled.current = true
    // Frame callbacks run before the render, so wait one tick for the draw itself
    requestAnimationFrame(callback)
  })
}
