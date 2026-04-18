type Props = {
  title?: string
  text: string
  /** BCP-47 language for the text node (Tamil transcript vs English translation). */
  lang?: string
}

export function TranscriptCard({ title, text, lang = "ta" }: Props) {
  return (
    <div className="crt-lines relative overflow-hidden rounded-xl border border-[color:var(--border)] bg-bg-card p-5 shadow-inner">
      {title ? (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">{title}</p>
      ) : null}
      <p
        className="font-mono text-base leading-relaxed text-text-primary sm:text-lg"
        lang={lang}
        aria-live="polite"
      >
        {text || "—"}
      </p>
    </div>
  )
}
