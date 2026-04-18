import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"

type Props = {
  src: string
  autoPlayDelayMs?: number
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function AudioPlayer({ src, autoPlayDelayMs = 0 }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.pause()
    el.load()
    setPlaying(false)
    setCurrent(0)

    const onLoaded = () => setDuration(el.duration || 0)
    const onTime = () => setCurrent(el.currentTime || 0)
    const onEnded = () => setPlaying(false)

    el.addEventListener("loadedmetadata", onLoaded)
    el.addEventListener("timeupdate", onTime)
    el.addEventListener("ended", onEnded)

    let timer: ReturnType<typeof setTimeout> | undefined
    if (autoPlayDelayMs > 0) {
      timer = setTimeout(() => {
        void el.play().then(() => setPlaying(true)).catch(() => {})
      }, autoPlayDelayMs)
    }

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded)
      el.removeEventListener("timeupdate", onTime)
      el.removeEventListener("ended", onEnded)
      if (timer) clearTimeout(timer)
    }
  }, [src, autoPlayDelayMs])

  const toggle = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => {})
    }
  }, [playing])

  const seek = useCallback((ratio: number) => {
    const el = audioRef.current
    if (!el || !duration) return
    el.currentTime = Math.min(Math.max(ratio, 0), 1) * duration
  }, [duration])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        toggle()
      }
      if (e.key === "ArrowLeft") {
        const el = audioRef.current
        if (el) el.currentTime = Math.max(0, el.currentTime - 5)
      }
      if (e.key === "ArrowRight") {
        const el = audioRef.current
        if (el) el.currentTime = Math.min(duration, el.currentTime + 5)
      }
    },
    [duration, toggle],
  )

  const progress = duration ? current / duration : 0

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-bg-card p-4"
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="group"
      aria-label="Audio playback"
    >
      <audio ref={audioRef} src={src} preload="auto" className="hidden" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const el = audioRef.current
            if (!el) return
            el.currentTime = 0
          }}
          className="rounded-lg border border-white/10 bg-bg-secondary px-2 py-2 text-xs text-text-muted hover:border-accent-amber/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
          aria-label="Skip to start"
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={toggle}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-amber/60 bg-accent-amber/20 text-lg text-accent-amber shadow-glow-amber hover:bg-accent-amber/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="flex flex-1 flex-col gap-1">
          <div
            className="relative h-2 w-full cursor-pointer rounded-full bg-bg-secondary"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
              const ratio = (e.clientX - rect.left) / rect.width
              seek(ratio)
            }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Seek"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") seek(progress - 0.05)
              if (e.key === "ArrowRight") seek(progress + 0.05)
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent-amber"
              style={{ width: `${progress * 100}%` }}
            />
            <div
              className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border border-accent-amber bg-bg-card"
              style={{ left: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[11px] text-text-muted">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
