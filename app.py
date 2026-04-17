import torch
torch.cuda.empty_cache()
torch.cuda.ipc_collect()
from flask import Flask, render_template, request, jsonify
import os
from speech_slang_module import process_slang_and_tts
app = Flask(__name__)

# ==============================
# CONFIG
# ==============================

UPLOAD_FOLDER = "recordings"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==============================
# IMPORT MODELS
# ==============================

from model1_asr import wav_to_tamil_text
from model2_tone_analyzer import tone_analyzer
from model3_slangconverter import convert_to_slang, refine_slang
from model4_tts import text_to_speech
import tempfile
# ==============================
# GLOBAL STORAGE (prototype only)
# ==============================

last_uploaded_file = None
last_result = {}


# ==============================
# ROUTES (PAGES)
# ==============================

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/recorder")
def recorder():
    return render_template("recorder.html")


@app.route("/transcribing")
def transcribing():
    return render_template("transcribing.html")


@app.route("/slang")
def slang():
    return render_template("slang.html")


@app.route("/tts")
def tts():
    return render_template("tts.html")


# ==============================
# AUDIO UPLOAD
# ==============================

@app.route("/upload", methods=["POST"])
def upload_audio():

    global last_uploaded_file

    if "audio" not in request.files:
        return jsonify({"error": "No audio file"}), 400

    audio = request.files["audio"]

    file_path = os.path.join(UPLOAD_FOLDER, "recording.wav")
    audio.save(file_path)

    last_uploaded_file = file_path

    return jsonify({"status": "saved"})


# ==============================
# PROCESS AUDIO (ASR + TONE)
# ==============================


@app.route("/voice_pipeline", methods=["POST"])
def voice_pipeline():

    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio received"})

        audio_file = request.files["audio"]

        # 🔥 TEMP FILE ONLY (NO STORAGE)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            audio_path = tmp.name
            audio_file.save(audio_path)

        # STEP 1: ASR
        transcript = wav_to_tamil_text(audio_path)

        # STEP 2: Groq + Sarvam
        result = process_slang_and_tts(transcript)

        return jsonify({
            "transcript": transcript,
            "slang": result["groq_slang"],
            "audio": result["audio"]
        })

    except Exception as e:
        print("Pipeline error:", e)
        return jsonify({"error": "Failed processing"})
@app.route("/speech_slang")
def speech_slang_page():
    return render_template("speech_slang.html")


@app.route("/run_speech_slang", methods=["POST"])
def run_speech_slang():
    global last_result

    if not last_result:
        return jsonify({"error": "No processed transcript found"})

    try:
        transcript = last_result.get("transcript", "")
        tone = last_result.get("tone", "")

        result = process_slang_and_tts(transcript, tone)

        last_result["groq_slang"] = result["groq_slang"]
        last_result["tts_audio"] = result["audio"]

        return jsonify({
            "status": "success",
            "transcript": transcript,
            "slang": result["groq_slang"],
            "audio": result["audio"]
        })

    except Exception as e:
        print("Pipeline error:", e)
        return jsonify({"error": "Processing failed"})

@app.route("/process")
def process_audio():

    global last_uploaded_file, last_result

    if not last_uploaded_file:
        return jsonify({"error": "No audio uploaded"})

    try:
        # 1️⃣ ASR
        text = wav_to_tamil_text(last_uploaded_file)

        # 2️⃣ Tone Analysis
        tone_result = tone_analyzer.analyze(last_uploaded_file, transcript=text)

        result = {
            "transcript": text,
            "language": tone_result.language,
            "emotion": tone_result.emotion,
            "tone": tone_result.tone,
            "analysis": tone_result.analysis,
            "reasoning": tone_result.emotion_reasoning
        }

        last_result = result  # store globally

        return jsonify(result)

    except Exception as e:
        print("❌ Process error:", e)
        return jsonify({"error": "Processing failed"})


@app.route("/slang_process", methods=["GET"])
def slang_process():
    global last_result

    if not last_result:
        return jsonify({"error": "No processed data"})

    try:
        output = convert_to_slang(last_result)

        last_result["ai_reply"] = output["ai_reply"]
        last_result["candidates"] = output["candidates"]

        return jsonify(output)

    except Exception as e:
        print("Slang error:", e)
        return jsonify({"error": "Slang generation failed"}), 500

@app.route("/groq_slang_process", methods=["GET"])
def groq_slang_process():
    global last_result

    if not last_result:
        return jsonify({"error": "No processed data"})

    try:
        # First generate AI reply
        from model3_slangconverter import generate_ai_reply, generate_groq_slang
        
        ai_reply = generate_ai_reply(last_result)
        groq_output = generate_groq_slang(ai_reply, last_result)
        
        last_result["ai_reply"] = ai_reply
        last_result["groq_slang"] = groq_output
        last_result["refined"] = groq_output
        
        return jsonify({
            "status": "success",
            "ai_reply": ai_reply,
            "groq_slang": groq_output
        })

    except Exception as e:
        print("Groq slang process error:", e)
        return jsonify({"error": "Groq slang generation failed"}), 500
    
    
@app.route("/refine_slang", methods=["POST"])
def refine_slang_route():
    global last_result

    data = request.get_json(silent=True) or {}
    selected_text = data.get("text")
    candidate_index = data.get("candidate_index")

    if not selected_text and candidate_index is not None:
        try:
            idx = int(candidate_index)
            selected_text = last_result["candidates"][idx]["text"]
        except Exception:
            selected_text = None

    if not selected_text:
        return jsonify({"error": "No slang text selected"}), 400

    try:
        refined = refine_slang(selected_text, last_result)
        last_result["selected_text"] = selected_text
        last_result["refined"] = refined

        return jsonify({
            "status": "success",
            "refined": refined,
            "selected_text": selected_text
        })

    except Exception as e:
        print("Refinement error:", e)
        return jsonify({"error": "Refinement failed"}), 500

# ==============================
# TEXT TO SPEECH (MMS-TTS)
# ==============================

@app.route("/tts_process")
def tts_process():

    global last_result

    if not last_result or ("refined" not in last_result and "ai_reply" not in last_result):
        return jsonify({"error": "No text to convert"})

    try:
        # Use refined slang if available, else use original AI reply
        text_to_convert = last_result.get("refined") or last_result.get("ai_reply")
        
        output_file = "static/recordings/tts_output.wav"
        full_path = os.path.join(app.root_path, output_file)
        
        text_to_speech(text_to_convert, full_path)

        last_result["tts_audio"] = output_file
        
        return jsonify({
            "status": "success",
            "audio_url": "/" + output_file,
            "text": text_to_convert
        })

    except Exception as e:
        print("❌ TTS error:", e)
        return jsonify({"error": "TTS synthesis failed"})


# ==============================
# GET RESULT (OPTIONAL)
# ==============================

@app.route("/get_result")
def get_result():
    return jsonify(last_result)


# ==============================
# RUN
# ==============================

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)