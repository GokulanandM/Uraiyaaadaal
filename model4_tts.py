import torch
from transformers import VitsModel, AutoTokenizer
import scipy.io.wavfile
import os

# ==============================
# CONFIG
# ==============================
MODEL_NAME = "facebook/mms-tts-tam"

# ==============================
# LOAD MODEL (Lazy Loading)
# ==============================
_tokenizer = None
_model = None

def load_model():
    """Load the MMS-TTS model for Tamil if not already loaded."""
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        print(f"🔄 Loading TTS Model ({MODEL_NAME})...")
        try:
            _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            _model = VitsModel.from_pretrained(MODEL_NAME)
            print("✅ TTS model loaded.")
        except Exception as e:
            print(f"❌ Error loading TTS model: {e}")
            raise e
    return _tokenizer, _model

# ==============================
# TTS GENERATION
# ==============================
def text_to_speech(text, output_path):
    """
    Converts Tamil text to speech and saves as a .wav file.
    
    Args:
        text (str): The Tamil text to convert.
        output_path (str): The path where the .wav file will be saved.
    """
    tokenizer, model = load_model()
    
    # Preprocess text
    inputs = tokenizer(text=text, return_tensors="pt")
    
    # Generate waveform
    with torch.no_grad():
        output = model(**inputs).waveform
    
    # Save as .wav
    sampling_rate = model.config.sampling_rate
    audio_data = output.squeeze().cpu().numpy()
    
    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    scipy.io.wavfile.write(output_path, rate=sampling_rate, data=audio_data)
    
    return output_path

if __name__ == "__main__":
    # Quick test
    test_text = "வணக்கம், இது தமிழ் பேச்சு மாற்று கருவி."
    out_file = "recordings/test_tts.wav"
    try:
        text_to_speech(test_text, out_file)
        print(f"✅ Success! Saved to {out_file}")
    except Exception as e:
        print(f"❌ Test failed: {e}")
