/**
 * Vite `base` (e.g. `/static/react/`) controls where **assets** load from in dev & prod.
 * React Router `basename` must match where the **SPA HTML** is mounted in the browser URL.
 *
 * - `npm run dev`: Vite serves the app under `import.meta.env.BASE_URL` → basename must match.
 * - Flask + `react_shell.html` at `/`: pathname is `/`, `/recorder`, … → basename `/`.
 *
 * Override for odd deployments: `VITE_ROUTER_BASENAME=/subdir` at build time.
 */
export function getRouterBasename(): string {
  const raw = import.meta.env.VITE_ROUTER_BASENAME as string | undefined
  if (raw != null && raw !== "") {
    return raw.replace(/\/$/, "") || "/"
  }
  if (import.meta.env.DEV) {
    const base = import.meta.env.BASE_URL
    if (base === "/" || base === "") return "/"
    return base.endsWith("/") ? base.slice(0, -1) : base
  }
  return "/"
}
