document.addEventListener("DOMContentLoaded", () => {
    startTTS();
});

async function startTTS() {
    const statusText = document.getElementById("status-text");
    const loader = document.getElementById("loader");
    const audioSection = document.getElementById("audio-section");
    const audioPlayer = document.getElementById("audio-player");
    const textPreview = document.getElementById("text-preview");

    try {
        console.log("Calling TTS process...");
        const response = await fetch("/tts_process");
        const data = await response.json();

        if (data.error) {
            statusText.innerText = "Error: " + data.error;
            loader.style.display = "none";
            return;
        }

        console.log("TTS Success:", data);

        // Update UI
        statusText.innerText = "Conversion Complete!";
        loader.style.display = "none";
        textPreview.innerText = `"${data.text}"`;
        
        // Setup Audio
        audioPlayer.src = data.audio_url + "?t=" + new Date().getTime(); // Avoid cache
        audioSection.style.display = "block";
        
        // Auto-play (optional, some browsers block this)
        setTimeout(() => {
            audioPlayer.play().catch(e => console.log("Auto-play blocked:", e));
        }, 500);

    } catch (err) {
        console.error("TTS Fetch Error:", err);
        statusText.innerText = "Connection failed.";
        loader.style.display = "none";
    }
}

function goHome() {
    window.location.href = "/";
}

function goBack() {
    window.location.href = "/slang";
}
