import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Link, useNavigate } from "react-router-dom"
import { processAudio } from "../api/endpoints"
import { EmotionBadge } from "../components/EmotionBadge"
import { StepIndicator } from "../components/StepIndicator"
import { TranscriptCard } from "../components/TranscriptCard"
import { useTranslation } from "../i18n/useTranslation"
import { useAppStore } from "../store/useAppStore"

function LoadingBars() {
  return (
    <div
      className="flex h-24 items-end justify-center gap-1.5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="w-1.5 origin-bottom rounded-full bg-accent-amber/80"
          style={{
            animation: `bar-pulse 0.9s ease-in-out ${(i % 6) * 0.08}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

export default function TranscribingPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const setProcessResult = useAppStore((s) => s.setProcessResult)
  const setCurrentStep = useAppStore((s) => s.setCurrentStep)
  const setError = useAppStore((s) => s.setError)
  const transcript = useAppStore((s) => s.transcript)
  const language = useAppStore((s) => s.language)
  const emotion = useAppStore((s) => s.emotion)
  const tone = useAppStore((s) => s.tone)
  const translation = useAppStore((s) => s.translation)

  const { isPending, isError, error, refetch, isSuccess } = useQuery({
    queryKey: ["process"],
    queryFn: async () => {
      const data = await processAudio()
      setProcessResult(data)
      return data
    },
    retry: 1,
  })

  const stepLabels = [t("step.record"), t("step.transcribe"), t("step.slang"), t("step.speak")]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pb-20 pt-6 sm:px-6">
      <div className="flex items-center justify-between">
        <Link to="/recorder" className="text-sm text-text-muted hover:text-text-primary">
          ← {t("common.back")}
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted">
          Step 2 / 4
        </p>
      </div>
      <StepIndicator currentStep={2} labels={stepLabels} />
      {isPending ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <LoadingBars />
          <p className="text-sm text-text-muted">{t("transcribing.loading")}</p>
        </div>
      ) : null}
      {isError ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
          <p>{error instanceof Error ? error.message : "Processing failed"}</p>
          <button
            type="button"
            className="mt-3 rounded-md border border-red-300/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            onClick={() => {
              setError(null)
              void refetch()
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : null}
      {isSuccess ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.12 },
            },
          }}
          className="space-y-5"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <TranscriptCard title={t("transcribing.transcript")} text={transcript} />
          </motion.div>
          {translation.trim() ? (
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <TranscriptCard title={t("transcribing.translation")} text={translation} lang="en" />
            </motion.div>
          ) : null}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <EmotionBadge emotion={emotion} tone={tone} language={language} />
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="flex justify-center pt-4">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(3)
                navigate("/slang")
              }}
              className="rounded-full border border-accent-amber/60 bg-accent-amber/15 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-accent-amber shadow-glow-amber hover:bg-accent-amber/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
            >
              {t("transcribing.proceedSlang")} →
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  )
}
