import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { uploadAudio } from "../api/endpoints"
import { WaveformVisualizer } from "../components/WaveformVisualizer"
import { StepIndicator } from "../components/StepIndicator"
import { useTranslation } from "../i18n/useTranslation"
import { useAppStore } from "../store/useAppStore"

export default function RecorderPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const recordedBlob = useAppStore((s) => s.recordedBlob)
  const audioURL = useAppStore((s) => s.audioURL)
  const setRecordedBlob = useAppStore((s) => s.setRecordedBlob)
  const setCurrentStep = useAppStore((s) => s.setCurrentStep)
  const setError = useAppStore((s) => s.setError)

  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState("")
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  /** Actual container codec from the browser (almost always webm/opus, not wav). */
  const recordedMimeRef = useRef<string>("audio/webm")
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
    void audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null
    setAnalyserNode(null)
  }, [])

  useEffect(() => () => cleanupStream(), [cleanupStream])

  const pickMime = () => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", ""]
    for (const type of types) {
      if (!type || MediaRecorder.isTypeSupported(type)) return type || undefined
    }
    return undefined
  }

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser
      setAnalyserNode(analyser)

      chunksRef.current = []
      const mime = pickMime()
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mediaRecorderRef.current = mr
      recordedMimeRef.current = mr.mimeType || mime || "audio/webm"
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.start()
      setIsRecording(true)
      setStatus("Recording…")
    } catch {
      setStatus("Microphone access denied or unavailable.")
      setError("Could not access microphone.")
    }
  }

  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state === "inactive") return
    mr.onstop = () => {
      const mime = recordedMimeRef.current || "audio/webm"
      const blob = new Blob(chunksRef.current, { type: mime })
      chunksRef.current = []
      const url = URL.createObjectURL(blob)
      setRecordedBlob(blob, url)
      setIsRecording(false)
      cleanupStream()
      setStatus("Recording complete.")
      mediaRecorderRef.current = null
    }
    mr.stop()
  }

  const reRecord = () => {
    setRecordedBlob(null, null)
    setStatus("")
  }

  const onFile = (file: File | null) => {
    if (!file) return
    setError(null)
    const url = URL.createObjectURL(file)
    setRecordedBlob(file, url)
    setStatus(`Loaded file: ${file.name}`)
  }

  const saveAndProceed = async () => {
    if (!recordedBlob) return
    setUploading(true)
    setError(null)
    try {
      await uploadAudio(recordedBlob)
      setCurrentStep(2)
      navigate("/transcribing")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const stepLabels = [t("step.record"), t("step.transcribe"), t("step.slang"), t("step.speak")]

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="text-sm text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
        >
          ← {t("common.back")}
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted">
          Step 1 / 4
        </p>
      </div>
      <StepIndicator currentStep={1} labels={stepLabels} />
      <div>
        <h1 className="font-display text-3xl text-text-primary sm:text-4xl">{t("recorder.title")}</h1>
      </div>
      <WaveformVisualizer analyserNode={analyserNode} isRecording={isRecording} />
      <p className="min-h-[1.25rem] text-center text-sm text-text-muted" role="status">
        {status}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={startRecording}
          disabled={isRecording}
          aria-label="Start recording"
          className="rounded-full border border-accent-red/50 bg-accent-red/15 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-accent-red transition hover:bg-accent-red/25 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
        >
          ⏺ {t("recorder.start")}
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={!isRecording}
          aria-label="Stop recording"
          className={`rounded-full border px-6 py-3 text-sm font-semibold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber ${
            isRecording
              ? "border-accent-red bg-accent-red/25 text-accent-red shadow-glow-red animate-pulse"
              : "border-white/15 bg-bg-secondary text-text-muted"
          }`}
        >
          ⏹ {t("recorder.stop")}
        </button>
        <button
          type="button"
          onClick={reRecord}
          className="rounded-full border border-white/15 bg-bg-secondary px-5 py-3 text-sm font-semibold text-text-muted hover:border-accent-amber/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
        >
          🔄 {t("recorder.rerecord")}
        </button>
      </div>
      <div className="relative">
        <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-text-muted">
          {t("recorder.orUpload")}
        </p>
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) onFile(f)
          }}
          className={[
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center text-sm transition",
            dragOver ? "border-accent-amber bg-accent-amber/10" : "border-accent-amber/35 bg-bg-card/60",
          ].join(" ")}
        >
          <input
            type="file"
            accept=".wav,audio/wav,audio/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-2xl" aria-hidden>
            📂
          </span>
          <span className="mt-2 font-medium text-text-primary">{t("recorder.chooseWav")}</span>
          <span className="mt-1 text-xs text-text-muted">{t("recorder.dropHint")}</span>
        </label>
      </div>
      {audioURL ? (
        <audio controls src={audioURL} className="w-full rounded-lg border border-[color:var(--border)] bg-bg-card p-2">
          <track kind="captions" />
        </audio>
      ) : null}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          disabled={!recordedBlob || uploading}
          onClick={() => void saveAndProceed()}
          className="rounded-full border border-accent-amber/60 bg-accent-amber/15 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-accent-amber shadow-glow-amber transition hover:bg-accent-amber/25 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
        >
          {uploading ? "…" : `${t("common.saveProceed")} →`}
        </button>
      </div>
    </div>
  )
}
