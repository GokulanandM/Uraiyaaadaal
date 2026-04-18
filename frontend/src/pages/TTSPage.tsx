import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { processTTS } from "../api/endpoints"
import { AudioPlayer } from "../components/AudioPlayer"
import { StepIndicator } from "../components/StepIndicator"
import { TranscriptCard } from "../components/TranscriptCard"
import { useTranslation } from "../i18n/useTranslation"
import { useAppStore } from "../store/useAppStore"

export default function TTSPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const setTTSResult = useAppStore((s) => s.setTTSResult)
  const reset = useAppStore((s) => s.reset)
  const ttsText = useAppStore((s) => s.ttsText)

  const query = useQuery({
    queryKey: ["tts_process"],
    queryFn: async () => {
      const data = await processTTS()
      const busted = `${data.audio_url}?t=${Date.now()}`
      setTTSResult(busted, data.text)
      return { ...data, audio_url: busted }
    },
    retry: 1,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  })

  const src = query.data?.audio_url ?? ""

  const displayText = useMemo(() => ttsText || query.data?.text || "", [ttsText, query.data?.text])

  const stepLabels = [t("step.record"), t("step.transcribe"), t("step.slang"), t("step.speak")]

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 pb-24 pt-6 sm:px-6">
      <div className="flex items-center justify-between">
        <Link to="/slang" className="text-sm text-text-muted hover:text-text-primary">
          ← {t("common.back")}
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted">
          Step 4 / 4 ✓
        </p>
      </div>
      <StepIndicator currentStep={4} labels={stepLabels} />
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-text-muted">🔊</p>
        <h1 className="mt-2 font-display text-3xl text-text-primary sm:text-4xl">{t("tts.title")}</h1>
      </div>
      {query.isPending ? (
        <div className="flex flex-col items-center gap-4 py-10" role="status" aria-live="polite">
          <div className="h-14 w-14 animate-spin rounded-full border-2 border-accent-amber/30 border-t-accent-amber" />
          <p className="text-sm text-text-muted">{t("tts.loading")}</p>
        </div>
      ) : null}
      {query.isError ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
          <p>{query.error instanceof Error ? query.error.message : "TTS failed"}</p>
          <button
            type="button"
            className="mt-3 rounded-md border border-red-300/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-red-500/20"
            onClick={() => void query.refetch()}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : null}
      {query.isSuccess && src ? (
        <div className="space-y-6">
          <TranscriptCard title="" text={displayText} />
          <AudioPlayer src={src} autoPlayDelayMs={500} />
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/slang")}
              className="rounded-full border border-white/15 bg-bg-secondary px-5 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted hover:border-accent-amber/40"
            >
              {t("tts.backSlang")}
            </button>
            <button
              type="button"
              onClick={() => {
                reset()
                navigate("/")
              }}
              className="rounded-full border border-accent-amber/60 bg-accent-amber/15 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-accent-amber shadow-glow-amber hover:bg-accent-amber/25"
            >
              🔄 {t("tts.newVoice")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
