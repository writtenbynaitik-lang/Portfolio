import type { Material } from 'three'

/*
 * Depth and height "fog" that dissolves surfaces into the void instead of
 * tinting them a fog colour. The canvas is transparent over the CSS backdrop,
 * so fading alpha means distant forms melt into exactly what's behind them,
 * with no seam anywhere on screen. Forms also dissolve upward, so tall
 * structures rise out of view rather than ending at a hard top edge.
 */

/** Shared by every faded material, so the whole hall's visibility changes together. */
export const voidFade = {
  uVoidNear: { value: 18 },
  uVoidFar: { value: 32 },
  uVoidHeightStart: { value: 2 },
  uVoidHeightEnd: { value: 12 },
}

/**
 * Final distances once the intro has revealed the hall. A narrow band, so the
 * deep end stays hidden behind the headline at first, and structures come up
 * clearly as the camera approaches them.
 */
export const VOID_DISTANCE = { near: 18, far: 32 }

export const VOID_FADE_GLSL = /* glsl */ `
uniform float uVoidNear;
uniform float uVoidFar;
uniform float uVoidHeightStart;
uniform float uVoidHeightEnd;

float voidVisibility(vec3 worldPosition) {
  float byDistance = smoothstep(uVoidNear, uVoidFar, distance(worldPosition, cameraPosition));
  float byHeight = smoothstep(uVoidHeightStart, uVoidHeightEnd, worldPosition.y);
  return (1.0 - byDistance) * (1.0 - byHeight);
}
`

/** Patches a built-in material (standard, basic…) to fade into the void. */
export function fadeIntoVoid<T extends Material>(material: T): T {
  material.transparent = true
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, voidFade)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vVoidWorld;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvVoidWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vVoidWorld;\n${VOID_FADE_GLSL}`)
      .replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\ngl_FragColor.a *= voidVisibility(vVoidWorld);',
      )
  }
  material.customProgramCacheKey = () => 'void-fade'
  return material
}
