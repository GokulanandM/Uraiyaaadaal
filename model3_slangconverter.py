"""
FLUENT Model 3: Slang Converter

Flow:
Transcript + Emotion -> Groq AI reply -> TinyLlama slang output
Transcript + Emotion -> Groq AI reply -> MT5 slang output
User selects one -> Groq refinement -> TTS
"""

import warnings
warnings.filterwarnings("ignore")

import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import torch
from dotenv import load_dotenv

load_dotenv()

from groq import Groq
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    AutoModelForSeq2SeqLM,
    BitsAndBytesConfig,
    pipeline,
)
from peft import PeftModel


# ==============================
# CONFIG
# ==============================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

tinyllama_base_model_path = os.path.join(BASE_DIR, "models", "tinyllama")
tinyllama_adapter_path = os.path.join(BASE_DIR, "models", "tinylama_slang_lora")
mt5_model_path = os.path.join(BASE_DIR, "models", "mt5-slang-model")


# ==============================
# LOAD GROQ
# ==============================

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ==============================
# LOAD TINYLLAMA
# ==============================

print("🔄 Loading TinyLlama slang model...")

tiny_tokenizer = AutoTokenizer.from_pretrained(
    tinyllama_base_model_path,
    local_files_only=True,
)
tiny_tokenizer.pad_token = tiny_tokenizer.eos_token

tiny_quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
)

tiny_base_model = AutoModelForCausalLM.from_pretrained(
    tinyllama_base_model_path,
    quantization_config=tiny_quant_config,
    device_map="auto",
    local_files_only=True,
)

tiny_model = PeftModel.from_pretrained(
    tiny_base_model,
    tinyllama_adapter_path,
    local_files_only=True,
)

tiny_pipe = pipeline(
    "text-generation",
    model=tiny_model,
    tokenizer=tiny_tokenizer,
)

print("✅ TinyLlama loaded successfully")


# ==============================
# LOAD MT5
# ==============================

print("🔄 Loading MT5 slang model...")

mt5_tokenizer = AutoTokenizer.from_pretrained(
mt5_model_path,
local_files_only=True,
use_fast=True,
extra_special_tokens={}
)

mt5_model = AutoModelForSeq2SeqLM.from_pretrained(
    mt5_model_path,
    device_map="auto",
    local_files_only=True,
)

mt5_pipe = pipeline(
    "text-generation",  # Updated task
    model=mt5_model,
    tokenizer=mt5_tokenizer,
)

print("✅ MT5 loaded successfully")


# ==============================
# HELPERS
# ==============================

def _safe_int(value, default):
    try:
        return int(value)
    except Exception:
        return default


def _safe_float(value, default):
    try:
        return float(value)
    except Exception:
        return default


def normalize_params(model_name, params):
    params = params or {}

    if model_name == "tinylama":
        return {
            "temperature": _safe_float(params.get("temperature"), 0.8),
            "top_p": _safe_float(params.get("top_p"), 0.95),
            "max_new_tokens": _safe_int(params.get("max_new_tokens"), 180),
            "repetition_penalty": _safe_float(params.get("repetition_penalty"), 1.08),
            "do_sample": bool(params.get("do_sample", True)),
        }

    return {
        "num_beams": _safe_int(params.get("num_beams"), 4),
        "max_new_tokens": _safe_int(params.get("max_new_tokens"), 96),
        "length_penalty": _safe_float(params.get("length_penalty"), 1.0),
        "temperature": _safe_float(params.get("temperature"), 1.0),
        "top_p": _safe_float(params.get("top_p"), 1.0),
        "do_sample": bool(params.get("do_sample", False)),
    }


# ==============================
# STEP 1: GROQ AI REPLY
# ==============================

def generate_ai_reply(result):
    prompt = f"""
User said:
{result['transcript']}

Emotion: {result['emotion']}
Tone: {result['tone']}

Respond in Tamil like a helpful assistant.

Rules:
- Short, natural Tamil
- Do NOT repeat input
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("❌ Groq error:", e)
        return "கவலைப்படாதே, சரியாகிடும்."

# ==============================
# STEP 2: BUILD INPUTS
# ==============================

def split_reply_lines(text):
    lines = [x.strip() for x in text.split("\n") if x.strip()]
    if not lines:
        return [text.strip()] if text.strip() else []
    return lines


def build_tinyllama_prompt(line, result):
    return f"""
### Instruction:
Convert this Tamil sentence into natural Coimbatore slang.
Keep meaning exactly same.
Output only Tamil slang sentence.

Emotion: {result['emotion']}
Tone: {result['tone']}

Tamil: {line}

### Response:
""".strip()


def build_mt5_input(line, result):
    return (
        f"Convert to Tamil slang: {line}"
    )


# ==============================
# FIXED PRESETS (NO USER PARAMS)
# ==============================

TINY_PRESETS = [
    {
        "name": "TinyLlama Conservative",
        "params": {
            "max_new_tokens": 60,
            "do_sample": False,
            "temperature": 0.1,
            "top_p": 1.0,
            "repetition_penalty": 1.2,
            "no_repeat_ngram_size": 4,
        },
    },
    {
        "name": "TinyLlama Balanced",
        "params": {
            "max_new_tokens": 75,
            "do_sample": False,
            "temperature": 0.1,
            "top_p": 1.0,
            "repetition_penalty": 1.18,
            "no_repeat_ngram_size": 4,
        },
    },
    {
        "name": "TinyLlama Standard",
        "params": {
            "max_new_tokens": 85,
            "do_sample": False,
            "temperature": 0.1,
            "top_p": 1.0,
            "repetition_penalty": 1.15,
            "no_repeat_ngram_size": 4,
        },
    },
]

MT5_PRESETS = [
    {
        "name": "MT5 Better Output",
        "params": {
            "max_new_tokens": 60,
            "num_beams": 5,
            "length_penalty": 0.8,
            "do_sample": False,
            "no_repeat_ngram_size": 3,
            "early_stopping": True,
        },
    },
]


# ==============================
# STEP 3: GENERATORS
# ==============================

def _is_tamil_like(text):
    if not text:
        return False
    tamil_chars = sum(1 for ch in text if "\u0B80" <= ch <= "\u0BFF")
    return (tamil_chars / max(len(text), 1)) >= 0.25


def generate_tiny_line(line, result, preset):
    prompt = build_tinyllama_prompt(line, result)
    p = preset["params"]

    try:
        output = tiny_pipe(
            prompt,
            max_new_tokens=p["max_new_tokens"],
            do_sample=p["do_sample"],
            temperature=p["temperature"],
            top_p=p["top_p"],
            repetition_penalty=p["repetition_penalty"],
            no_repeat_ngram_size=p["no_repeat_ngram_size"],
            return_full_text=False,
            pad_token_id=tiny_tokenizer.eos_token_id,
            eos_token_id=tiny_tokenizer.eos_token_id,
        )
        text = output[0].get("generated_text", "").strip()
        return text if text else line
    except Exception as e:
        print("TinyLlama line error:", e)
        return line


def generate_mt5_line(line, result, preset):
    inp = build_mt5_input(line, result)
    p = preset["params"]

    try:
        output = mt5_pipe(
            inp,
            max_new_tokens=p["max_new_tokens"],
            num_beams=p["num_beams"],
            length_penalty=p["length_penalty"],
            do_sample=p["do_sample"],
            no_repeat_ngram_size=p["no_repeat_ngram_size"],
            early_stopping=p["early_stopping"],
        )
        text = output[0].get("generated_text", "").strip()

        # fallback to input line if MT5 output is unusable
        if not text or not _is_tamil_like(text):
            return line
        return text
    except Exception as e:
        print("MT5 line error:", e)
        return line


def build_candidate_from_lines(lines, result, model_name, preset):
    converted_lines = []

    for line in lines:
        if model_name == "tinylama":
            converted = generate_tiny_line(line, result, preset)
        else:
            converted = generate_mt5_line(line, result, preset)
        converted_lines.append(converted)

    final_text = "\n".join(converted_lines).strip()

    return {
        "label": preset["name"],
        "model": model_name,
        "params": preset["params"],
        "text": final_text,
    }

def refine_slang(selected_slang, result):
    prompt = f"""
Improve this Coimbatore slang.

Make it:
- More natural
- More fluent
- Local Kovai style

Emotion: {result.get('emotion', 'Neutral')}
Tone: {result.get('tone', 'Neutral')}

Sentence:
{selected_slang}

Return only final slang.
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("Refinement error:", e)
        return selected_slang


# ==============================
# GROQ DIRECT SLANG (FAST PATH)
# ==============================

def generate_groq_slang(ai_reply, result):
    """Generate slang directly with Groq (bypasses TinyLlama/MT5)"""
    
    prompt = f"""
You are a Coimbatore Tamil slang expert.

Convert this Tamil reply into natural Coimbatore slang.
Keep the exact meaning and emotion.

Emotion: {result.get('emotion', 'Neutral')}
Tone: {result.get('tone', 'Neutral')}

Original Tamil:
{ai_reply}

Output only the slang version in Tamil, nothing else.
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print("Groq slang error:", e)
        return ai_reply


# ==============================
# MAIN FUNCTION
# ==============================

def convert_to_slang(result, generation_params=None):
    ai_reply = generate_ai_reply(result)

    lines = split_reply_lines(ai_reply)
    if not lines:
        lines = [ai_reply] if ai_reply else [""]

    candidates = []

    for preset in TINY_PRESETS:
        candidates.append(build_candidate_from_lines(lines, result, "tinylama", preset))

    for preset in MT5_PRESETS:
        candidates.append(build_candidate_from_lines(lines, result, "mt5", preset))

    # always 5 outputs (3 TinyLlama + 2 MT5)
    candidates = candidates[:5]

    return {
        "ai_reply": ai_reply,
        "candidates": candidates,
    }