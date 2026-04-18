let mediaRecorder
let audioChunks = []

let audioContext
let analyser
let dataArray
let canvas = document.getElementById("waveform")
let ctx = canvas.getContext("2d")

async function startRecording(){

const stream = await navigator.mediaDevices.getUserMedia({audio:true})

mediaRecorder = new MediaRecorder(stream)

audioContext = new AudioContext()
const source = audioContext.createMediaStreamSource(stream)

analyser = audioContext.createAnalyser()

source.connect(analyser)

analyser.fftSize = 2048

const bufferLength = analyser.frequencyBinCount

dataArray = new Uint8Array(bufferLength)

drawWave()

mediaRecorder.start()

mediaRecorder.ondataavailable = e=>{
audioChunks.push(e.data)
}

document.getElementById("status").innerText="Recording..."
}

function stopRecording(){

mediaRecorder.stop()

mediaRecorder.onstop=()=>{

const blob = new Blob(audioChunks,{type:"audio/wav"})

audioChunks=[]

const audioURL = URL.createObjectURL(blob)

const audio = document.getElementById("audioPlayback")

audio.src = audioURL

window.recordedBlob = blob

document.getElementById("status").innerText="Recording complete"

}
}

function drawWave(){

requestAnimationFrame(drawWave)

analyser.getByteTimeDomainData(dataArray)

ctx.fillStyle="#111"
ctx.fillRect(0,0,canvas.width,canvas.height)

ctx.lineWidth=2
ctx.strokeStyle="#00ffff"

ctx.beginPath()

let sliceWidth = canvas.width / dataArray.length

let x = 0

for(let i=0;i<dataArray.length;i++){

let v = dataArray[i]/128.0

let y = v * canvas.height/2

if(i===0){
ctx.moveTo(x,y)
}
else{
ctx.lineTo(x,y)
}

x += sliceWidth
}

ctx.lineTo(canvas.width,canvas.height/2)

ctx.stroke()

}

async function saveRecording(){

const formData = new FormData()

formData.append("audio",window.recordedBlob,"recording.wav")

await fetch("/upload",{
method:"POST",
body:formData
})

document.getElementById("status").innerText="Saved successfully"
}

function rerecord(){

document.getElementById("audioPlayback").src=""

window.recordedBlob=null

document.getElementById("status").innerText="Ready for new recording"
}

document.getElementById("startBtn").onclick=startRecording

document.getElementById("stopBtn").onclick=stopRecording

document.getElementById("saveBtn").onclick=saveRecording

document.getElementById("reRecordBtn").onclick=rerecord

document.getElementById("nextBtn").onclick=()=>{
    window.location="/transcribing"
}

// ==============================
// FILE UPLOAD HANDLING
// ==============================

document.getElementById("uploadBtn").onclick = () => {
    document.getElementById("fileInput").click()
}

document.getElementById("fileInput").onchange = (e) => {
    const file = e.target.files[0]

    if (!file) return

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".wav") && file.type !== "audio/wav") {
        document.getElementById("status").innerText = "⚠️ Please upload a valid .wav file"
        document.getElementById("fileName").innerText = ""
        return
    }

    // Set as recordedBlob so Save/Proceed work the same way
    window.recordedBlob = file

    // Preview in the audio player
    const audioURL = URL.createObjectURL(file)
    const audio = document.getElementById("audioPlayback")
    audio.src = audioURL

    // Update UI
    document.getElementById("fileName").innerText = "📄 " + file.name
    document.getElementById("status").innerText = "File loaded — click Save Recording to continue"
}