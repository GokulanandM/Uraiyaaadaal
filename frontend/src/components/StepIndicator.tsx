import { motion } from "framer-motion"

type Step = 1 | 2 | 3 | 4

const steps: { id: Step; label: string }[] = [
  { id: 1, label: "Record" },
  { id: 2, label: "Transcribe" },
  { id: 3, label: "Slang" },
  { id: 4, label: "Speak" },
]

type Props = {
  currentStep: Step
  labels?: string[]
}

export function StepIndicator({ currentStep, labels }: Props) {
  return (
    <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 sm:gap-3">
      {steps.map((s, idx) => {
        const done = currentStep > s.id
        const active = currentStep === s.id
        const label = labels?.[idx] ?? s.label
        return (
          <div key={s.id} className="flex items-center gap-2 sm:gap-3">
            <motion.div
              layout
              className={[
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider sm:text-xs",
                done
                  ? "border-accent-amber/60 bg-accent-amber/15 text-accent-amber"
                  : active
                    ? "border-accent-amber bg-accent-amber/25 text-text-primary shadow-glow-amber"
                    : "border-white/10 bg-bg-secondary/80 text-text-muted",
              ].join(" ")}
              aria-current={active ? "step" : undefined}
            >
              <span className="tabular-nums opacity-80">{s.id}</span>
              <span className="hidden sm:inline">{label}</span>
              {done ? (
                <span className="text-accent-amber" aria-hidden>
                  ✓
                </span>
              ) : null}
            </motion.div>
            {idx < steps.length - 1 ? (
              <span className="hidden h-px w-4 bg-gradient-to-r from-accent-amber/40 to-transparent sm:block sm:w-6" />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
