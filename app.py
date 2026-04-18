from flask import Flask, render_template, request, jsonify
import os
import shutil

from werkzeug.utils import secure_filename

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)

# ==============================
# CONFIG
# ==============================
# Always resolve uploads relative to this app package (not process cwd), so
# `flask run` / IDE / different terminals still write where ASR expects.
UPLOAD_FOLDER = os.path.join(app.root_path, "recordings")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Heavy ML deps (Whisper, Torch, Gemini, …) are imported lazily inside each route so
# `/upload` can succeed even if ASR/TTS deps are broken or still installing.

try:
    import nvidia_client
except ImportError:
    nvidia_client = None  # type: ignore

# ==============================
# GLOBAL STORAGE (prototype only)
# ==============================

last_uploaded_file = None
last_result = {}


# ==============================
# AUDIO UPLOAD
# ==============================

@app.route("/upload", methods=["POST"])
def upload_audio():

    global last_uploaded_file

    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file"}), 400

        audio = request.files["audio"]
        if audio is None:
            return jsonify({"error": "No audio file"}), 400

        # Filename extension should match real audio bytes (e.g. WebM from MediaRecorder, not fake .wav).
        raw_name = (getattr(audio, "filename", None) or "").strip()
        if not raw_name:
            raw_name = "recording.webm"
        safe = secure_filename(raw_name) or "recording.webm"
        _base, ext = os.path.splitext(safe.lower())
        allowed = (".wav", ".webm", ".mp3", ".ogg", ".opus", ".flac", ".m4a", ".mp4")
        if ext not in allowed:
            ext = ".webm"
        disk_name = f"recording{ext}"

        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        file_path = os.path.join(UPLOAD_FOLDER, disk_name)

        # Stream to disk (more reliable than FileStorage.save for some multipart/proxy combos)
        stream = audio.stream
        try:
            stream.seek(0)
        except (OSError, AttributeError):
            pass
        with open(file_path, "wb") as out:
            shutil.copyfileobj(stream, out, length=1024 * 1024)

        if not os.path.isfile(file_path):
            return jsonify({"error": "Audio was not written to disk"}), 500
        if os.path.getsize(file_path) == 0:
            return jsonify({"error": "Uploaded audio file is empty"}), 400

        last_uploaded_file = os.path.abspath(file_path)

        return jsonify({"status": "saved"})
    except OSError as e:
        print("❌ Upload I/O error:", e)
        return jsonify({"error": f"Could not save recording: {e}"}), 500
    except Exception as e:
        print(
            "❌ Upload error:",
            repr(e),
            "| content_type=",
            getattr(request, "content_type", None),
            "| file_keys=",
            list(request.files.keys()),
        )
        return jsonify({"error": f"Upload failed: {e}"}), 500


# ==============================
# PROCESS AUDIO (ASR + TONE)
# ==============================

@app.route("/process")
def process_audio():

    global last_uploaded_file, last_result

    if not last_uploaded_file:
        return jsonify({"error": "No audio uploaded"})

    try:
        from model1_asr import wav_to_tamil_text
        from model2_tone_analyzer import tone_analyzer

        # 1️⃣ ASR — NVIDIA (Tamil) when configured, else local Whisper
        text = ""
        if nvidia_client and nvidia_client.is_stt_configured():
            try:
                text = nvidia_client.transcribe_audio_file(last_uploaded_file)
                print("✅ ASR via NVIDIA")
            except Exception as e:
                print("⚠️ NVIDIA STT failed, using local Whisper:", e)
                text = wav_to_tamil_text(last_uploaded_file)
        else:
            text = wav_to_tamil_text(last_uploaded_file)

        # 2️⃣ Tone Analysis (unchanged; uses same audio + transcript)
        tone_result = tone_analyzer.analyze(last_uploaded_file, transcript=text)

        # 3️⃣ Tamil → English (Transcribing UI) via NVIDIA chat when configured
        translation = ""
        if nvidia_client and nvidia_client.is_translation_configured() and text.strip():
            try:
                translation = nvidia_client.translate_tamil_to_english(text)
                print("✅ Translation via NVIDIA")
            except Exception as e:
                print("⚠️ NVIDIA translation failed:", e)

        result = {
            "transcript": text,
            "translation": translation,
            "language": tone_result.language,
            "emotion": tone_result.emotion,
            "tone": tone_result.tone,
            "analysis": tone_result.analysis,
            "reasoning": tone_result.emotion_reasoning,
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
        from model3_slangconverter import convert_to_slang

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
        from model3_slangconverter import refine_slang as refine_slang_model

        refined = refine_slang_model(selected_text, last_result)
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
        from model4_tts import text_to_speech

        # Use refined slang if available, else use original AI reply
        text_to_convert = last_result.get("refined") or last_result.get("ai_reply")

        os.makedirs(os.path.join(app.root_path, "static", "recordings"), exist_ok=True)
        output_file = "static/recordings/tts_output.wav"
        full_path = os.path.join(app.root_path, output_file)

        if nvidia_client and nvidia_client.is_tts_configured():
            try:
                written = nvidia_client.synthesize_speech_to_file(text_to_convert, full_path)
                rel = os.path.relpath(written, app.root_path).replace(os.sep, "/")
                output_file = rel
                print("✅ TTS via NVIDIA →", output_file)
            except Exception as e:
                print("⚠️ NVIDIA TTS failed, using local MMS-TTS:", e)
                text_to_speech(text_to_convert, full_path)
                output_file = "static/recordings/tts_output.wav"
        else:
            text_to_speech(text_to_convert, full_path)

        last_result["tts_audio"] = output_file

        return jsonify({
            "status": "success",
            "audio_url": "/" + output_file,
            "text": text_to_convert,
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
# REACT SPA (catch-all; register last)
# ==============================


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def catch_all(path):
    return render_template("react_shell.html")


# ==============================
# RUN
# ==============================

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)