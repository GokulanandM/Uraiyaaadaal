import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

const flaskTarget = "http://127.0.0.1:5000"

/**
 * `base` = public URL prefix for emitted JS/CSS/chunks (must match Flask static path).
 * It is NOT the same as React Router `basename`: see `src/routerBasename.ts`.
 */
export default defineConfig({
  plugins: [react()],
  base: "/static/react/",
  build: {
    outDir: "../static/react",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/main.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Long timeout: recorded audio can be large; default proxy timeouts may surface as 500/502 in the browser.
      "/upload": { target: flaskTarget, changeOrigin: true, timeout: 600_000 },
      "/process": { target: flaskTarget, changeOrigin: true },
      "/slang_process": { target: flaskTarget, changeOrigin: true },
      "/groq_slang_process": { target: flaskTarget, changeOrigin: true },
      "/refine_slang": { target: flaskTarget, changeOrigin: true },
      "/tts_process": { target: flaskTarget, changeOrigin: true },
      "/get_result": { target: flaskTarget, changeOrigin: true },
      "/static/recordings": { target: flaskTarget, changeOrigin: true },
    },
  },
})
