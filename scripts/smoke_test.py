#!/usr/bin/env python3
"""
Smoke test: .env API keys (presence), Flask pages + API sequence.

Usage (Flask must be running, default http://127.0.0.1:5000):

  cd /path/to/Finnn
  source .venv/bin/activate   # optional
  python scripts/smoke_test.py

  python scripts/smoke_test.py --base http://127.0.0.1:5000
  python scripts/smoke_test.py --with-process   # runs ASR+tone (slow, needs models+keys)
  python scripts/smoke_test.py --with-pipeline # upload + process + slang (very slow)

Requires: pip install requests python-dotenv
"""

from __future__ import annotations

import argparse
import io
import os
import sys
import wave
# Project root = parent of scripts/
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(ROOT, ".env"))
except ImportError:
    pass

import requests

# Keys this app uses (see .env.example + model2/model3)
ENV_KEYS = [
    "GEMINI_API_KEY",
    "GROQ_API_KEY",
    "NVIDIA_API_KEY",
    "NVIDIA_API_KEY_STT",
    "NVIDIA_API_KEY_TRANSLATION",
    "NVIDIA_API_KEY_TTS",
]

SPA_PATHS = ["/", "/recorder", "/transcribing", "/slang", "/tts"]


def minimal_wav_bytes(duration_ms: int = 200, sample_rate: int = 16000) -> bytes:
    """Tiny silent mono PCM WAV for upload tests."""
    nframes = int(sample_rate * duration_ms / 1000)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(b"\x00\x00" * nframes)
    return buf.getvalue()


def mask(s: str | None) -> str:
    if not s:
        return "∅"
    if len(s) <= 8:
        return "***"
    return f"{s[:4]}…{s[-4:]} ({len(s)} chars)"


def check_env() -> bool:
    print("=== Environment (.env / shell) ===")
    ok = True
    for k in ENV_KEYS:
        v = os.getenv(k, "").strip()
        if v:
            print(f"  OK  {k} = {mask(v)}")
        else:
            print(f"  —   {k}  (not set)")
            if k in ("GEMINI_API_KEY", "GROQ_API_KEY"):
                ok = False
    note = "GEMINI + GROQ are required for tone analysis & slang; NVIDIA keys optional if using NVIDIA STT/translate/TTS."
    print(f"\nNote: {note}")
    return ok


def check_pages(base: str, session: requests.Session) -> bool:
    print("\n=== SPA routes (expect 200 + HTML) ===")
    ok = True
    for path in SPA_PATHS:
        url = base.rstrip("/") + path
        try:
            r = session.get(url, timeout=15)
            ctype = r.headers.get("Content-Type", "")
            good = r.status_code == 200 and "text/html" in ctype and "root" in r.text.lower()
            status = "OK " if good else "FAIL"
            print(f"  {status} {r.status_code} {path}")
            if not good:
                ok = False
        except requests.RequestException as e:
            print(f"  FAIL {path}: {e}")
            ok = False
    return ok


def check_apis(
    base: str,
    session: requests.Session,
    with_process: bool,
    with_pipeline: bool,
) -> bool:
    print("\n=== API: upload ===")
    ok = True
    wav = minimal_wav_bytes()
    try:
        r = session.post(
            f"{base.rstrip('/')}/upload",
            files={"audio": ("recording.wav", wav, "audio/wav")},
            timeout=60,
        )
        data = r.json() if r.headers.get("Content-Type", "").startswith("application/json") else {}
        if r.status_code == 200 and data.get("status") == "saved":
            print("  OK  POST /upload → saved")
        else:
            print(f"  FAIL POST /upload {r.status_code}: {data or r.text[:200]}")
            ok = False
    except requests.RequestException as e:
        print(f"  FAIL POST /upload: {e}")
        return False

    r = session.get(f"{base.rstrip('/')}/get_result", timeout=10)
    print(f"  OK  GET /get_result → {r.status_code}")

    if not with_process and not with_pipeline:
        print("\n(Skipping /process — use --with-process to run ASR+tone; needs Whisper/Gemini etc.)")
        return ok

    print("\n=== API: process (ASR + tone + optional translation) — may take minutes ===")
    try:
        r = session.get(f"{base.rstrip('/')}/process", timeout=600)
        data = r.json() if r.content else {}
        if r.status_code == 200 and data.get("transcript") is not None and not data.get("error"):
            print(f"  OK  GET /process → transcript len={len(data.get('transcript', ''))}")
        else:
            print(f"  FAIL GET /process {r.status_code}: {data.get('error', r.text[:300])}")
            ok = False
    except requests.RequestException as e:
        print(f"  FAIL GET /process: {e}")
        ok = False

    if not with_pipeline:
        print("\n(Skipping /slang_process — use --with-pipeline after successful process)")
        return ok

    print("\n=== API: slang_process — may take minutes ===")
    try:
        r = session.get(f"{base.rstrip('/')}/slang_process", timeout=600)
        data = r.json() if r.content else {}
        if r.status_code == 200 and not data.get("error"):
            print("  OK  GET /slang_process")
        else:
            print(f"  FAIL GET /slang_process {r.status_code}: {data.get('error', r.text[:300])}")
            ok = False
    except requests.RequestException as e:
        print(f"  FAIL GET /slang_process: {e}")
        ok = False

    return ok


def main() -> int:
    p = argparse.ArgumentParser(description="Smoke test Uraiyaadaaaal backend + env keys")
    p.add_argument(
        "--base",
        default=os.getenv("SMOKE_BASE", "http://127.0.0.1:5000"),
        help="Flask base URL (not Vite dev server)",
    )
    p.add_argument(
        "--with-process",
        action="store_true",
        help="Call GET /process after upload (loads ML; slow)",
    )
    p.add_argument(
        "--with-pipeline",
        action="store_true",
        help="Also GET /slang_process after process (very slow)",
    )
    args = p.parse_args()
    if args.with_pipeline:
        args.with_process = True

    session = requests.Session()

    env_ok = check_env()
    pages_ok = check_pages(args.base, session)
    api_ok = check_apis(
        args.base,
        session,
        with_process=args.with_process,
        with_pipeline=args.with_pipeline,
    )

    print("\n=== Summary ===")
    print(f"  Env keys (Gemini+Groq recommended): {'PASS' if env_ok else 'WARN/MISSING'}")
    print(f"  Pages: {'PASS' if pages_ok else 'FAIL'}")
    print(f"  API: {'PASS' if api_ok else 'FAIL'}")

    if env_ok and pages_ok and api_ok:
        print("\nSmoke test completed successfully.")
        return 0
    print("\nSome checks failed — fix errors above (start Flask, .env, models).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
