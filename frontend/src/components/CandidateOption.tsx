import type { Candidate } from "../types"

type Props = {
  candidate: Candidate
  index: number
  selected: boolean
  onSelect: (index: number) => void
}

export function CandidateOption({ candidate, index, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(index)}
      className={[
        "group w-full rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber",
        selected
          ? "border-accent-amber bg-accent-amber/10 shadow-glow-amber"
          : "border-[color:var(--border)] bg-bg-card hover:border-accent-amber/35",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={[
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-accent-amber bg-accent-amber" : "border-text-muted/60",
          ].join(" ")}
          aria-hidden
        >
          {selected ? <span className="h-2 w-2 rounded-full bg-bg-primary" /> : null}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Option {index + 1} · {candidate.label}
        </span>
        <span className="ml-auto rounded bg-bg-secondary px-2 py-0.5 font-mono text-[10px] text-accent-amber/90">
          {candidate.model}
        </span>
      </div>
      <p className="whitespace-pre-wrap font-body text-sm leading-relaxed text-text-primary" lang="ta">
        {candidate.text}
      </p>
    </button>
  )
}
