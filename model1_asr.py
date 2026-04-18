import whisper

def wav_to_tamil_text(wav_path):
    """
    Converts a WAV file to Tamil text using Whisper medium model.
    Args:
        wav_path (str): Path to the WAV file.
    Returns:
        str: Transcribed Tamil text.
    """
    model = whisper.load_model("medium")
    result = model.transcribe(wav_path, language="ta")
    return result["text"]