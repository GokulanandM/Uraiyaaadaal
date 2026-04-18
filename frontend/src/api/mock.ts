import type { ProcessResult, SlangResult, GroqSlangResult, RefineResult, TTSResult } from "../types"

export const mockProcessResult: ProcessResult = {
  transcript: "வணக்கம் மச்சா, நீ எப்படி இருக்க?",
  translation: "Hello, bro, how are you?",
  language: "Tamil",
  emotion: "Happy",
  tone: "Casual",
  analysis: "Greeting between friends",
  reasoning: "Upward inflection, relaxed cadence",
}

export const mockSlangResult: SlangResult = {
  ai_reply: "டா மச்சா, நான் சூப்பரா இருக்கேன்!",
  candidates: [
    {
      label: "Creative",
      model: "TinyLlama",
      text: "டா பையா, ரொம்ப நல்லா இருக்கேன்!",
    },
    {
      label: "Balanced",
      model: "TinyLlama",
      text: "என்னடா, கொஞ்சம் சரியா இருக்கேன்",
    },
    {
      label: "Slang-heavy",
      model: "MT5",
      text: "மச்சி, மொக்க போடாத, ஓகே-வா?",
    },
  ],
}

export const mockGroqResult: GroqSlangResult = {
  status: "success",
  ai_reply: mockSlangResult.ai_reply,
  groq_slang: "டா பையா, வாயில வந்துட்டியா? சூப்பர்!",
}

export const mockRefineResult: RefineResult = {
  status: "success",
  refined: "டா மச்சி, எப்படி இருக்க? ரொம்ப நல்லா இருக்கேன்!",
  selected_text: mockSlangResult.candidates[0]?.text ?? "",
}

export const mockTTSResult: TTSResult = {
  status: "success",
  audio_url: "/static/recordings/tts_output.wav",
  text: mockRefineResult.refined,
}
