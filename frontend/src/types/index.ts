export interface Candidate {
  label: string
  model: string
  text: string
}

export interface ProcessResult {
  transcript: string
  /** English gloss from NVIDIA translation step (optional). */
  translation?: string
  language: string
  emotion: string
  tone: string
  analysis: string
  reasoning: string
}

export interface SlangResult {
  ai_reply: string
  candidates: Candidate[]
}

export interface GroqSlangResult {
  status?: string
  ai_reply: string
  groq_slang: string
}

export interface RefineResult {
  status?: string
  refined: string
  selected_text: string
}

export interface TTSResult {
  status?: string
  audio_url: string
  text: string
}

export interface ApiErrorBody {
  error?: string
}

export type SlangMode = "local" | "groq"
