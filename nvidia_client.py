"""
NVIDIA Build / Integrate API (OpenAI-compatible) for ASR, translation, and TTS.

Set API keys in environment (see .env.example). Never commit real keys to git.

Docs (overview): https://integrate.api.nvidia.com/v1 — speech routes mirror OpenAI-style
`/v1/audio/transcriptions` and `/v1/audio/speech` where enabled for your account.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import requests

NVIDIA_BASE_V1 = os.getenv("NVIDIA_API_BASE", "https://integrate.api.nvidia.com/v1").rstrip("/")


def _api_key_stt() -> str | None:
    return (os.getenv("NVIDIA_API_KEY_STT") or os.getenv("NVIDIA_API_KEY") or "").strip() or None


def _api_key_translation() -> str | None:
    return (os.getenv("NVIDIA_API_KEY_TRANSLATION") or os.getenv("NVIDIA_API_KEY") or "").strip() or None


def _api_key_tts() -> str | None:
    return (os.getenv("NVIDIA_API_KEY_TTS") or os.getenv("NVIDIA_API_KEY") or "").strip() or None


def is_stt_configured() -> bool:
    return _api_key_stt() is not None


def is_translation_configured() -> bool:
    return _api_key_translation() is not None


def is_tts_configured() -> bool:
    return _api_key_tts() is not None


def _headers_json(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def transcribe_audio_file(audio_path: str, api_key: str | None = None) -> str:
    """
    Speech-to-text for Tamil (or auto) via NVIDIA `/v1/audio/transcriptions`.
    """
    key = api_key or _api_key_stt()
    if not key:
        raise RuntimeError("NVIDIA STT API key not configured")

    model = os.getenv("NVIDIA_ASR_MODEL", "openai/whisper-large-v3")
    # Whisper uses ISO-639-1; Tamil = "ta"
    language = os.getenv("NVIDIA_ASR_LANGUAGE", "ta")
    url = f"{NVIDIA_BASE_V1}/audio/transcriptions"
    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(audio_path)

    with path.open("rb") as f:
        files = {"file": (path.name, f, "audio/wav")}
        data: dict[str, Any] = {"model": model}
        if language and language.lower() not in ("auto", "multi", ""):
            data["language"] = language
        r = requests.post(
            url,
            headers={"Authorization": f"Bearer {key}"},
            files=files,
            data=data,
            timeout=int(os.getenv("NVIDIA_ASR_TIMEOUT", "300")),
        )

    if not r.ok:
        try:
            detail = r.json()
        except Exception:
            detail = r.text[:500]
        raise RuntimeError(f"NVIDIA STT HTTP {r.status_code}: {detail}")

    payload = r.json()
    text = (payload.get("text") or "").strip()
    if not text:
        raise RuntimeError(f"NVIDIA STT empty transcript: {payload}")
    return text


def translate_tamil_to_english(tamil_text: str, api_key: str | None = None) -> str:
    """
    Tamil → English for the Transcribing step (chat completions).
    """
    key = api_key or _api_key_translation()
    if not key:
        raise RuntimeError("NVIDIA translation API key not configured")
    text = (tamil_text or "").strip()
    if not text:
        return ""

    model = os.getenv("NVIDIA_TRANSLATION_MODEL", "meta/llama-3.1-8b-instruct")
    url = f"{NVIDIA_BASE_V1}/chat/completions"
    body = {
        "model": model,
        "temperature": float(os.getenv("NVIDIA_TRANSLATION_TEMPERATURE", "0.2")),
        "max_tokens": int(os.getenv("NVIDIA_TRANSLATION_MAX_TOKENS", "1024")),
        "messages": [
            {
                "role": "system",
                "content": (
                    "You translate Tamil text into clear, natural English. "
                    "Output only the English translation, with no quotes or explanations."
                ),
            },
            {"role": "user", "content": text},
        ],
    }
    r = requests.post(
        url,
        headers=_headers_json(key),
        data=json.dumps(body),
        timeout=int(os.getenv("NVIDIA_TRANSLATION_TIMEOUT", "120")),
    )
    if not r.ok:
        try:
            detail = r.json()
        except Exception:
            detail = r.text[:500]
        raise RuntimeError(f"NVIDIA translation HTTP {r.status_code}: {detail}")

    data = r.json()
    try:
        return (data["choices"][0]["message"]["content"] or "").strip()
    except (KeyError, IndexError, TypeError) as e:
        raise RuntimeError(f"NVIDIA translation unexpected response: {data}") from e


def synthesize_speech_to_file(text: str, output_path: str, api_key: str | None = None) -> str:
    """
    Text-to-speech via NVIDIA `/v1/audio/speech` (binary audio).
    Returns path to written file (extension may be .wav or .mp3 from Content-Type).
    """
    key = api_key or _api_key_tts()
    if not key:
        raise RuntimeError("NVIDIA TTS API key not configured")
    content = (text or "").strip()
    if not content:
        raise ValueError("Empty text for TTS")

    model = os.getenv("NVIDIA_TTS_MODEL", "nvidia/magpie-tts-multilingual")
    voice = os.getenv(
        "NVIDIA_TTS_VOICE",
        # Magpie can speak Tamil-like text using an Indic-adjacent or EN-US voice; override in .env if needed.
        "Magpie-Multilingual.HI-IN.Aria",
    )
    url = f"{NVIDIA_BASE_V1}/audio/speech"

    # OpenAI-compatible shape used by NVIDIA gateway (see NemoClaw #1520).
    body: dict[str, Any] = {
        "model": model,
        "input": content,
        "voice": voice,
        "response_format": os.getenv("NVIDIA_TTS_RESPONSE_FORMAT", "wav"),
    }

    r = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "audio/*,*/*",
        },
        data=json.dumps(body),
        timeout=int(os.getenv("NVIDIA_TTS_TIMEOUT", "300")),
    )
    if not r.ok:
        try:
            detail = r.json()
        except Exception:
            detail = r.text[:500]
        raise RuntimeError(f"NVIDIA TTS HTTP {r.status_code}: {detail}")

    raw = r.content
    ctype = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    if "mpeg" in ctype or raw[:3] == b"ID3" or (len(raw) > 1 and raw[0] == 0xFF and (raw[1] & 0xE0) == 0xE0):
        suffix = ".mp3"
    elif "wav" in ctype or raw[:4] == b"RIFF":
        suffix = ".wav"
    else:
        suffix = ".wav"

    target = out.with_suffix(suffix)
    target.write_bytes(raw)
    return str(target.resolve())
