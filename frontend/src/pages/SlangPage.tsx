import { useMutation, useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getGroqSlang, getSlangCandidates, refineSlang } from "../api/endpoints"
import { CandidateOption } from "../components/CandidateOption"
import { StepIndicator } from "../components/StepIndicator"
import { TranscriptCard } from "../components/TranscriptCard"
import { useTranslation } from "../i18n/useTranslation"
import type { SlangMode } from "../types"
import { useAppStore } from "../store/useAppStore"

export default function SlangPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [mode, setMode] = useState<SlangMode>("local")

  const aiReply = useAppStore((s) => s.aiReply)
  const candidates = useAppStore((s) => s.candidates)
  const selectedCandidateIndex = useAppStore((s) => s.selectedCandidateIndex)
  const groqSlang = useAppStore((s) => s.groqSlang)
  const setSlangResult = useAppStore((s) => s.setSlangResult)
  const setGroqSlang = useAppStore((s) => s.setGroqSlang)
  const setSelectedCandidateIndex = useAppStore((s) => s.setSelectedCandidateIndex)
  const setRefined = useAppStore((s) => s.setRefined)
  const setCurrentStep = useAppStore((s) => s.setCurrentStep)
  const setError = useAppStore((s) => s.setError)

  const slangQuery = useQuery({
    queryKey: ["slang_process"],
    queryFn: async () => {
      const data = await getSlangCandidates()
      setSlangResult(data.ai_reply, data.candidates ?? [])
      return data
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  useEffect(() => {
    const list = candidates.length ? candidates : slangQuery.data?.candidates ?? []
    if (list.length > 0 && selectedCandidateIndex === null) {
      setSelectedCandidateIndex(0)
    }
  }, [candidates, slangQuery.data?.candidates, selectedCandidateIndex, setSelectedCandidateIndex])

  const groqQuery = useQuery({
    queryKey: ["groq_slang_process"],
    queryFn: async () => {
      const data = await getGroqSlang()
      setGroqSlang(data.ai_reply, data.groq_slang)
      return data
    },
    enabled: mode === "groq",
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const refineMutation = useMutation({
    mutationFn: (idx: number) => refineSlang(idx),
    onSuccess: (data) => {
      setRefined(data.refined)
    },
    onError: (e: Error) => setError(e.message),
  })

  const stepLabels = [t("step.record"), t("step.transcribe"), t("step.slang"), t("step.speak")]

  const busyLocal = slangQuery.isPending
  const busyGroq = groqQuery.isFetching

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-24 pt-6 sm:px-6">
      <div className="flex items-center justify-between">
        <Link to="/transcribing" className="text-sm text-text-muted hover:text-text-primary">
          ← {t("common.back")}
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted">
          Step 3 / 4
        </p>
      </div>
      <StepIndicator currentStep={3} labels={stepLabels} />
      <h1 className="font-display text-3xl text-text-primary sm:text-4xl">{t("slang.title")}</h1>
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted">{t("slang.aiReply")}</p>
        {busyLocal && mode === "local" ? (
          <p className="text-sm text-text-muted" role="status">
            {t("slang.loadingAi")}
          </p>
        ) : (
          <TranscriptCard title="" text={aiReply || slangQuery.data?.ai_reply || ""} />
        )}
      </section>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted">{t("slang.how")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("local")}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber ${
              mode === "local"
                ? "border-accent-amber bg-accent-amber/20 text-accent-amber"
                : "border-white/10 bg-bg-secondary text-text-muted"
            }`}
          >
            {t("slang.modeLocal")}
          </button>
          <button
            type="button"
            onClick={() => setMode("groq")}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber ${
              mode === "groq"
                ? "border-accent-amber bg-accent-amber/20 text-accent-amber"
                : "border-white/10 bg-bg-secondary text-text-muted"
            }`}
          >
            ⚡ {t("slang.modeGroq")}
          </button>
        </div>
      </div>
      {mode === "local" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {slangQuery.isError ? (
            <p className="text-sm text-red-300">{slangQuery.error?.message}</p>
          ) : null}
          {(candidates.length ? candidates : slangQuery.data?.candidates ?? []).map((c, idx) => (
            <CandidateOption
              key={`${c.label}-${idx}`}
              candidate={c}
              index={idx}
              selected={selectedCandidateIndex === idx}
              onSelect={(i) => setSelectedCandidateIndex(i)}
            />
          ))}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={selectedCandidateIndex === null || refineMutation.isPending}
              onClick={() => {
                if (selectedCandidateIndex === null) return
                setError(null)
                refineMutation.mutate(selectedCandidateIndex)
              }}
              className="rounded-full border border-white/15 bg-bg-secondary px-5 py-2 text-xs font-semibold uppercase tracking-wide text-text-primary hover:border-accent-amber/40 disabled:opacity-40"
            >
              {refineMutation.isPending ? "…" : t("slang.refineSelected")}
            </button>
            <button
              type="button"
              disabled={selectedCandidateIndex === null || refineMutation.isPending}
              onClick={() => {
                if (selectedCandidateIndex === null) return
                setError(null)
                refineMutation.mutate(selectedCandidateIndex, {
                  onSuccess: () => {
                    setCurrentStep(4)
                    navigate("/tts")
                  },
                })
              }}
              className="rounded-full border border-accent-amber/60 bg-accent-amber/15 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-accent-amber shadow-glow-amber hover:bg-accent-amber/25 disabled:opacity-40"
            >
              {t("slang.refineTts")}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {busyGroq ? (
            <p className="text-sm text-text-muted" role="status">
              {t("slang.loadingGroq")}
            </p>
          ) : null}
          {groqQuery.isError ? (
            <p className="text-sm text-red-300">{groqQuery.error?.message}</p>
          ) : null}
          <div className="crt-lines rounded-xl border border-accent-amber/35 bg-bg-card p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-amber">⚡ Groq</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary" lang="ta">
              {groqSlang || groqQuery.data?.groq_slang || ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentStep(4)
              navigate("/tts")
            }}
            className="rounded-full border border-accent-amber/60 bg-accent-amber/15 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-accent-amber shadow-glow-amber hover:bg-accent-amber/25"
          >
            {t("slang.goTts")} →
          </button>
        </motion.div>
      )}
    </div>
  )
}
