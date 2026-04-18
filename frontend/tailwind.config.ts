import type { Config } from "tailwindcss"

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0E0B07",
        "bg-secondary": "#1A1410",
        "bg-card": "#221C14",
        "accent-amber": "#F59E0B",
        "accent-red": "#EF4444",
        "accent-green": "#10B981",
        "text-primary": "#F5F0E8",
        "text-muted": "#9C8C78",
      },
      fontFamily: {
        display: ["Bebas Neue", "Noto Sans Tamil", "system-ui", "sans-serif"],
        body: ["DM Sans", "Noto Sans Tamil", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Noto Sans Tamil", "monospace"],
      },
      backgroundImage: {
        noise:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.06\'/%3E%3C/svg%3E")',
      },
      boxShadow: {
        "glow-red": "0 0 0 1px rgba(239,68,68,0.35), 0 0 28px rgba(239,68,68,0.45)",
        "glow-amber": "0 0 0 1px rgba(245,158,11,0.25), 0 0 22px rgba(245,158,11,0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config
