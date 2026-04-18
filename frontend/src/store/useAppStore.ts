import { create } from "zustand"
import type { Candidate, ProcessResult } from "../types"

export interface AppState {
  recordedBlob: Blob | null
  audioURL: string | null

  transcript: string
  translation: string
  language: string
  emotion: string
  tone: string
  analysis: string
  reasoning: string

  aiReply: string
  candidates: Candidate[]
  selectedCandidateIndex: number | null
  refined: string
  groqSlang: string

  ttsAudioURL: string | null
  ttsText: string

  currentStep: 1 | 2 | 3 | 4
  error: string | null

  setRecordedBlob: (blob: Blob | null, url: string | null) => void
  setProcessResult: (result: ProcessResult) => void
  setSlangResult: (aiReply: string, candidates: Candidate[]) => void
  setGroqSlang: (aiReply: string, groq: string) => void
  setSelectedCandidateIndex: (index: number | null) => void
  setRefined: (refined: string) => void
  setTTSResult: (audioURL: string, text: string) => void
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void
  setError: (msg: string | null) => void
  reset: () => void
}

const initial = {
  recordedBlob: null as Blob | null,
  audioURL: null as string | null,
  transcript: "",
  translation: "",
  language: "",
  emotion: "",
  tone: "",
  analysis: "",
  reasoning: "",
  aiReply: "",
  candidates: [] as Candidate[],
  selectedCandidateIndex: null as number | null,
  refined: "",
  groqSlang: "",
  ttsAudioURL: null as string | null,
  ttsText: "",
  currentStep: 1 as 1 | 2 | 3 | 4,
  error: null as string | null,
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initial,

  setRecordedBlob: (blob, url) =>
    set((state) => {
      const prev = state.audioURL
      if (prev && prev !== url) {
        try {
          URL.revokeObjectURL(prev)
        } catch {
          /* ignore */
        }
      }
      return { recordedBlob: blob, audioURL: url, error: null }
    }),

  setProcessResult: (result) =>
    set({
      transcript: result.transcript ?? "",
      translation: result.translation ?? "",
      language: result.language ?? "",
      emotion: result.emotion ?? "",
      tone: result.tone ?? "",
      analysis: result.analysis ?? "",
      reasoning: result.reasoning ?? "",
      error: null,
    }),

  setSlangResult: (aiReply, candidates) =>
    set({
      aiReply,
      candidates,
      error: null,
    }),

  setGroqSlang: (aiReply, groq) =>
    set({
      aiReply,
      groqSlang: groq,
      refined: groq,
      error: null,
    }),

  setSelectedCandidateIndex: (index) => set({ selectedCandidateIndex: index }),

  setRefined: (refined) => set({ refined, error: null }),

  setTTSResult: (audioURL, text) =>
    set({
      ttsAudioURL: audioURL,
      ttsText: text,
      error: null,
    }),

  setCurrentStep: (step) => set({ currentStep: step }),

  setError: (msg) => set({ error: msg }),

  reset: () => {
    const prev = get().audioURL
    if (prev) {
      try {
        URL.revokeObjectURL(prev)
      } catch {
        /* ignore */
      }
    }
    set({ ...initial })
  },
}))
