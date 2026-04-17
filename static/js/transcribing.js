async function processAudio(){

const res = await fetch("/process")
const data = await res.json()

document.getElementById("loader").style.display="none"
document.getElementById("results").style.display="block"

document.getElementById("transcript").innerText = data.transcript
document.getElementById("language").innerText = data.language
document.getElementById("emotion").innerText = data.emotion
document.getElementById("tone").innerText = data.tone
document.getElementById("reasoning").innerText = data.reasoning
document.getElementById("analysis").innerText = data.analysis

}

function goNext(){
window.location="/slang"
}

processAudio()