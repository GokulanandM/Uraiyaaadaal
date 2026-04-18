"""
FLUENT ToneAnalyzer (Optimized Version)
Speech → Transcript → Tone → Emotion → Analysis
With Groq fallback for when Gemini quota is exceeded
"""

import os
import base64
import json
import time
from dataclasses import dataclass
from typing import Optional, Tuple

from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq

load_dotenv()


# ==============================
# DATA MODELS
# ==============================

@dataclass
class ToneResult:
    transcript: str
    tone: str
    emotion: str
    language: str
    analysis: str
    emotion_reasoning: str
    confidence: Optional[float] = None
    raw: Optional[str] = None


@dataclass
class ToneAnalyzerConfig:
    api_key: str = ""
    model: str = "gemini-2.5-flash"
    retries: int = 1


# ==============================
# MAIN CLASS
# ==============================

class ToneAnalyzer:

    def __init__(self, config: Optional[ToneAnalyzerConfig] = None):

        if config is None:
            config = ToneAnalyzerConfig()

        if not config.api_key:
            config.api_key = os.getenv("GEMINI_API_KEY", "")

        if not config.api_key:
            raise ValueError("❌ GEMINI_API_KEY missing in .env")

        self.config = config

        genai.configure(api_key=config.api_key)

        self.model = genai.GenerativeModel(config.model)
        
        # Initialize Groq as fallback
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

    # ==============================
    # MAIN FUNCTION
    # ==============================

    def analyze(self, audio_source: str | bytes, transcript: str = None) -> ToneResult:
        """
        Analyze audio for tone/emotion.
        If Gemini fails, use Groq with transcript (if provided).
        """
    
        audio_bytes, mime = self._load_audio(audio_source)
        audio_b64 = self._to_base64(audio_bytes)
    
        for attempt in range(self.config.retries + 1):
    
            try:
                raw = self._call_gemini(audio_b64, mime)
                return self._parse(raw)
    
            except Exception as e:
                error_str = str(e)
                # Check if quota exceeded (429 error)
                if "429" in error_str or "quota" in error_str.lower():
                    print(f"⚠️ Gemini quota exceeded, using Groq fallback")
                    return self._analyze_with_groq_fallback(transcript or "")
                
                print(f"⚠️ Retry {attempt+1}: {e}")
                time.sleep(1)
    
        # Final fallback: return neutral defaults
        return ToneResult(
            transcript=transcript or "Unable to analyze audio",
            tone="Neutral",
            emotion="Neutral",
            language="Tamil",
            analysis="Analysis unavailable - API quota exceeded",
            emotion_reasoning="Using default values",
        )

    # ==============================
    # GEMINI CALL
    # ==============================

    def _call_gemini(self, audio_b64: str, mime: str) -> str:

        response = self.model.generate_content(
            contents=[
                self._prompt(),
                {
                    "inline_data": {
                        "mime_type": mime,
                        "data": audio_b64,
                    }
                }
            ],
            generation_config={
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        )

        return response.text or "{}"

    # ==============================
    # GROQ FALLBACK (when Gemini quota exceeded)
    # ==============================

    def _analyze_with_groq_fallback(self, transcript: str) -> ToneResult:
        """Use Groq to analyze transcript when Gemini quota is hit"""
        
        if not transcript:
            return ToneResult(
                transcript="No transcript available",
                tone="Neutral",
                emotion="Neutral",
                language="Tamil",
                analysis="Groq fallback - no transcript provided",
                emotion_reasoning="Unable to analyze",
            )
        
        prompt = f"""
    Analyze this Tamil transcript for emotion and tone.
    
    Transcript:
    {transcript}
    
    Respond ONLY with valid JSON (no extra text):
    {{
      "emotion": "one word emotion like Happy, Sad, Angry, Confused, Neutral, Distressed, Excited, etc",
      "tone": "communication style like Casual, Formal, Complaining, Questioning, Assertive, etc",
      "emotionReasoning": "1-2 sentences why",
      "analysis": "brief summary"
    }}
    """
    
        try:
            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            
            raw_text = response.choices[0].message.content.strip()
            
            try:
                data = json.loads(raw_text)
            except:
                # If JSON parse fails, extract what we can
                data = {
                    "emotion": "Neutral",
                    "tone": "Casual",
                    "emotionReasoning": "Unable to parse analysis",
                    "analysis": raw_text[:100]
                }
            
            return ToneResult(
                transcript=transcript,
                tone=data.get("tone", "Neutral"),
                emotion=data.get("emotion", "Neutral"),
                language="Tamil",
                analysis=data.get("analysis", "Groq analysis completed"),
                emotion_reasoning=data.get("emotionReasoning", ""),
                confidence=0.75,
            )
            
        except Exception as e:
            print(f"Groq fallback error: {e}")
            return ToneResult(
                transcript=transcript,
                tone="Neutral",
                emotion="Neutral",
                language="Tamil",
                analysis=f"Groq fallback failed: {str(e)[:50]}",
                emotion_reasoning="Error during analysis",
            )

    # ==============================
    # HELPERS
    # ==============================

    def _load_audio(self, source: str | bytes) -> Tuple[bytes, str]:

        if isinstance(source, (bytes, bytearray)):
            return bytes(source), "audio/webm"

        ext = os.path.splitext(source)[-1].lower()

        mime_map = {
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".webm": "audio/webm",
            ".ogg": "audio/ogg",
            ".m4a": "audio/mp4",
        }

        mime = mime_map.get(ext, "audio/webm")

        with open(source, "rb") as f:
            return f.read(), mime

    def _to_base64(self, audio_bytes: bytes) -> str:
        return base64.b64encode(audio_bytes).decode("utf-8")

    # ==============================
    # PROMPT
    # ==============================

    def _prompt(self) -> str:

        return """
You are an advanced speech analysis AI.

TASK:
1. Transcribe the audio accurately.
2. Detect language.
3. Identify emotion (precise).
4. Identify tone (communication style).
5. Explain WHY the emotion was chosen.
6. Give short summary.

IMPORTANT:
- Output ONLY valid JSON
- No extra text

FORMAT:
{
  "text": "...",
  "language": "...",
  "emotion": "...",
  "tone": "...",
  "emotionReasoning": "...",
  "analysis": "...",
  "confidence": 0.95
}
"""

    # ==============================
    # PARSER
    # ==============================

    def _parse(self, raw: str) -> ToneResult:

        try:
            data = json.loads(raw)
        except:
            print("⚠️ JSON parse failed")
            data = {}

        return ToneResult(
            transcript=data.get("text", "No transcription"),
            language=data.get("language", "Unknown"),
            emotion=data.get("emotion", "Neutral"),
            tone=data.get("tone", "Neutral"),
            analysis=data.get("analysis", ""),
            emotion_reasoning=data.get("emotionReasoning", ""),
            confidence=self._safe_float(data.get("confidence")),
            raw=raw
        )

    def _safe_float(self, val):
        try:
            return float(val)
        except:
            return None


# ==============================
# SINGLETON
# ==============================

tone_analyzer = ToneAnalyzer()


# ==============================
# TEST
# ==============================

if __name__ == "__main__":

    path = "test.wav"

    result = tone_analyzer.analyze(path)

    print("\n===== RESULT =====")
    print("Transcript :", result.transcript)
    print("Language   :", result.language)
    print("Emotion    :", result.emotion)
    print("Tone       :", result.tone)
    print("Reasoning  :", result.emotion_reasoning)
    print("Analysis   :", result.analysis)
    print("Confidence :", result.confidence)