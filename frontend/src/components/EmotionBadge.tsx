type Props = {
  emotion: string
  tone: string
  language: string
}

function emotionStyles(emotion: string) {
  const e = emotion.toLowerCase()
  if (e.includes("happy") || e.includes("joy")) {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
  }
  if (e.includes("angry") || e.includes("anger")) {
    return "border-red-500/40 bg-red-500/15 text-red-200"
  }
  if (e.includes("sad")) {
    return "border-sky-500/40 bg-sky-500/15 text-sky-100"
  }
  if (e.includes("surprise")) {
    return "border-amber-500/50 bg-amber-500/15 text-amber-100"
  }
  return "border-white/15 bg-white/5 text-text-muted"
}

export function EmotionBadge({ emotion, tone, language }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-text-muted"
        lang="ta"
      >
        {language || "—"}
      </span>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-medium ${emotionStyles(emotion)}`}
      >
        {emotion || "—"}
      </span>
      <span className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-3 py-1 text-xs font-medium text-text-primary">
        {tone || "—"}
      </span>
    </div>
  )
}
