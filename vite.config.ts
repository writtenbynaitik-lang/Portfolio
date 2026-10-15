import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Drops emitted images that nothing in the build refers to. Vite emits every
 * imported image, even one whose code was tree-shaken away, such as the
 * screenshots of work switched off in src/content/projects.ts; without this
 * they would still be published.
 */
function dropUnreferencedImages(): Plugin {
  return {
    name: 'drop-unreferenced-images',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const sources = Object.values(bundle).map((file) =>
        file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : '',
      )
      for (const [fileName, file] of Object.entries(bundle)) {
        if (file.type !== 'asset' || !/\.(webp|png|jpe?g|avif)$/.test(fileName)) continue
        const name = fileName.slice(fileName.lastIndexOf('/') + 1)
        if (!sources.some((source) => source.includes(name))) delete bundle[fileName]
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dropUnreferencedImages()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 3D formats Vite doesn't recognise as static assets by default. Lets
  // `import modelUrl from './model.glb'` resolve to a hashed asset URL.
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr', '**/*.exr', '**/*.ktx2'],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    // three.js core is ~740 kB minified and R3F needs all of it, so the
    // default 500 kB limit always fires. 800 still flags any other chunk.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        // Keep large, rarely-changing vendors in their own chunks so app
        // deploys don't invalidate the cached three.js / React bundles.
        codeSplitting: {
          groups: [
            {
              name: 'three',
              test: /node_modules[\\/]three[\\/]/,
              priority: 30,
            },
            {
              name: 'r3f',
              test: /node_modules[\\/](@react-three|three-stdlib)[\\/]/,
              priority: 20,
            },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
