import type {
  ApiErrorBody,
  GroqSlangResult,
  ProcessResult,
  RefineResult,
  SlangResult,
  TTSResult,
} from "../types"
import * as mock from "./mock"

const useMock = import.meta.env.VITE_MOCK === "true"

async function parseJson<T>(res: Response): Promise<T & ApiErrorBody> {
  const data = (await res.json()) as T & ApiErrorBody
  return data
}

/** Filename must match real bytes — MediaRecorder is usually WebM/Opus, not WAV. */
function uploadFilenameForBlob(blob: Blob): string {
  const t = (blob.type || "").toLowerCase()
  if (t.includes("webm")) return "recording.webm"
  if (t.includes("ogg")) return "recording.ogg"
  if (t.includes("mp4")) return "recording.mp4"
  if (t.includes("wav")) return "recording.wav"
  if (t.includes("mpeg") || t.includes("mp3")) return "recording.mp3"
  return "recording.webm"
}

export const uploadAudio = async (blob: Blob) => {
  if (useMock) {
    await new Promise((r) => setTimeout(r, 400))
    return { status: "saved" as const }
  }
  const formData = new FormData()
  formData.append("audio", blob, uploadFilenameForBlob(blob))
  const res = await fetch("/upload", { method: "POST", body: formData })
  let data: { status?: string; error?: string } = {}
  try {
    data = await parseJson<{ status?: string }>(res)
  } catch {
    throw new Error(res.status === 500 ? `Server error (${res.status})` : `Upload failed (${res.status})`)
  }
  if (!res.ok || data.error) {
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  return data
}

export const processAudio = async () => {
  if (useMock) {
    await new Promise((r) => setTimeout(r, 800))
    return { ...mock.mockProcessResult }
  }
  const res = await fetch("/process")
  const data = await parseJson<ProcessResult>(res)
  if (data.error) {
    throw new Error(data.error)
  }
  return data as ProcessResult
}

export const getSlangCandidates = async () => {
  if (useMock) {
    await new Promise((r) => setTimeout(r, 600))
    return { ...mock.mockSlangResult }
  }
  const res = await fetch("/slang_process")
  const data = await parseJson<SlangResult>(res)
  if (data.error) {
    throw new Error(data.error)
  }
  return data as SlangResult
}

export const getGroqSlang = async () => {
  if (useMock) {
    await new Promise((r) => setTimeout(r, 500))
    return { ...mock.mockGroqResult }
  }
  const res = await fetch("/groq_slang_process")
  const data = await parseJson<GroqSlangResult>(res)
  if (data.error) {
    throw new Error(data.error)
  }
  return data as GroqSlangResult
}

export const refineSlang = async (candidateIndex: number) => {
  if (useMock) {
    await new Promise((r) => setTimeout(r, 500))
    return { ...mock.mockRefineResult }
  }
  const res = await fetch("/refine_slang", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidate_index: candidateIndex }),
  })
  const data = await parseJson<RefineResult>(res)
  if (!res.ok || data.error) {
    throw new Error(data.error || "Refinement failed")
  }
  return data as RefineResult
}

export const processTTS = async () => {
  if (useMock) {
    await new Promise((r) => setTimeout(r, 700))
    return { ...mock.mockTTSResult }
  }
  const res = await fetch("/tts_process")
  const data = await parseJson<TTSResult>(res)
  if (data.error) {
    throw new Error(data.error)
  }
  return data as TTSResult
}

export const getResult = async () => {
  if (useMock) {
    return {
      ...mock.mockProcessResult,
      ai_reply: mock.mockSlangResult.ai_reply,
      candidates: mock.mockSlangResult.candidates,
      refined: mock.mockRefineResult.refined,
    }
  }
  const res = await fetch("/get_result")
  return parseJson<Record<string, unknown>>(res)
}
