
# Uraiyaaadaal — Tamil Speech-to-Slang Conversion System

**Uraiyaaadaal** (Tamil: **உரையாடல்**) is a Flask + React (Vite) web app that turns Tamil speech into text, analyzes tone and emotion, generates Coimbatore-style slang options, and synthesizes speech again using modern AI models. Earlier codename: **FLUENT**.

## Project overview

1. **Audio recording** — Record in the browser or upload audio (e.g. `.wav` / WebM from MediaRecorder).
2. **Speech recognition (ASR)** — NVIDIA Whisper API or local OpenAI Whisper (Tamil).
3. **Tone & emotion** — Google Gemini (Groq fallback) via `model2_tone_analyzer.py`.
4. **Optional translation** — Tamil → English on the transcribing step when NVIDIA keys are set.
5. **Slang conversion** — TinyLlama + LoRA, MT5, and/or Groq (`model3_slangconverter.py`).
6. **Text-to-speech** — NVIDIA Magpie API or Meta MMS-TTS Tamil (`model4_tts.py`).

## Features

- Single-page **React 18 + TypeScript + Vite** UI (dark “Kovai street studio” theme).
- **Zustand**, **TanStack Query**, **Framer Motion**, **Tailwind CSS**.
- Flask **catch-all** serves the SPA; APIs unchanged for the pipeline.

## Installation

### Prerequisites

- Python 3.10+ (3.11 recommended)
- Node 18+ for the frontend
- FFmpeg (for Whisper ASR)
- Git

### Backend

```bash
git clone https://github.com/GokulanandM/Uraiyaaadaal.git
cd Uraiyaaadaal
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Environment variables

Copy `.env.example` to `.env` and fill in:

- `GROQ_API_KEY`, `GEMINI_API_KEY` — tone + slang stack  
- Optional NVIDIA: `NVIDIA_API_KEY_STT`, `NVIDIA_API_KEY_TRANSLATION`, `NVIDIA_API_KEY_TTS` (or `NVIDIA_API_KEY`)

### Local model weights

Place assets under `models/` as expected by `model3_slangconverter.py` (TinyLlama + LoRA, MT5). Whisper / MMS-TTS may download on first use.

### Frontend build

```bash
cd frontend
npm install
npm run build          # outputs to ../static/react/
```

### Run

**Production-style (Flask serves built React):**

```bash
cd Uraiyaaadaal
source .venv/bin/activate
python app.py
# http://127.0.0.1:5000/
```

**Development (hot reload + API proxy):**

- Terminal 1: `python app.py`
- Terminal 2: `cd frontend && npm run dev`
- Open the URL Vite prints (use the path under `/static/react/` so React Router `basename` matches).

### Smoke test

```bash
python scripts/smoke_test.py
python scripts/smoke_test.py --with-process   # optional; slow, needs ML + keys
```

## Project structure

```
.
├── app.py                    # Flask routes + SPA catch-all
├── nvidia_client.py          # Optional NVIDIA Integrate API (STT / translate / TTS)
├── model1_asr.py             # Whisper ASR
├── model2_tone_analyzer.py   # Gemini / Groq tone
├── model3_slangconverter.py  # Slang models + Groq
├── model4_tts.py             # MMS-TTS Tamil
├── frontend/                 # React + Vite source
├── static/react/             # Vite production build (run npm run build)
├── templates/
│   └── react_shell.html      # SPA shell
├── scripts/smoke_test.py     # API / env checks
├── requirements.txt
└── README.md
```

## API endpoints (unchanged contract)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/upload` | Save uploaded audio |
| GET | `/process` | ASR + tone (+ optional translation) |
| GET | `/slang_process` | TinyLlama / MT5 slang candidates |
| GET | `/groq_slang_process` | Groq slang |
| POST | `/refine_slang` | Refine selected slang |
| GET | `/tts_process` | Synthesize speech |
| GET | `/get_result` | Last pipeline state |

## Notes

- **Never commit `.env`** — it is gitignored.
- Prototype uses in-memory globals (`last_uploaded_file`, `last_result`); production should use sessions or a database.
- GPU optional but recommended for local TinyLlama 4-bit loads.

## Authors

- FLUENT / Uraiyaaadaal — Sem 8 Gen AI Lab (extended with React frontend)

## Support

Open an issue on **https://github.com/GokulanandM/Uraiyaaadaal**.
