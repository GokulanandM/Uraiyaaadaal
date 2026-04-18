let currentCandidates = [];
let currentAiReply = "";

async function loadSlang() {
  try {
    const res = await fetch("/slang_process");
    const data = await res.json();

    if (data.error) {
      document.getElementById("reply").innerText = data.error;
      return;
    }

    currentAiReply = data.ai_reply || "";
    document.getElementById("reply").innerText = currentAiReply;
    
    // Show button options
    document.getElementById("candidatesSection").style.display = "none";
    document.getElementById("groqSection").style.display = "none";
    document.getElementById("finalSection").style.display = "none";
  } catch (e) {
    console.error("Load slang error:", e);
    document.getElementById("reply").innerText = "Failed to load slang outputs";
  }
}

async function loadCandidates() {
  try {
    const res = await fetch("/slang_process");
    const data = await res.json();

    if (data.error) {
      alert("Error loading candidates");
      return;
    }

    currentAiReply = data.ai_reply || "";
    document.getElementById("reply").innerText = currentAiReply;
    currentCandidates = data.candidates || [];
    renderCandidates(currentCandidates);

    // Show candidates section
    document.getElementById("candidatesSection").style.display = "block";
    document.getElementById("groqSection").style.display = "none";
    document.getElementById("finalSection").style.display = "none";
  } catch (e) {
    console.error("Load candidates error:", e);
    alert("Failed to load candidates");
  }
}

async function generateGroqSlang() {
  try {
    const res = await fetch("/groq_slang_process");
    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    currentAiReply = data.ai_reply || "";
    document.getElementById("reply").innerText = currentAiReply;
    document.getElementById("groqOutput").innerText = data.groq_slang || "";

    // Show Groq section
    document.getElementById("candidatesSection").style.display = "none";
    document.getElementById("groqSection").style.display = "block";
    document.getElementById("finalSection").style.display = "none";
  } catch (e) {
    console.error("Groq slang error:", e);
    alert("Failed to generate Groq slang");
  }
}

function backToOptions() {
  document.getElementById("candidatesSection").style.display = "none";
  document.getElementById("groqSection").style.display = "none";
  document.getElementById("finalSection").style.display = "none";
}

function renderCandidates(candidates) {
  const box = document.getElementById("candidateList");
  box.innerHTML = "";

  if (!candidates.length) {
    box.innerHTML = "<p>No candidates generated.</p>";
    return;
  }

  candidates.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "option";

    row.innerHTML =
      '<label>' +
      '<input type="radio" name="candidate" value="' + i + '"' + (i === 0 ? " checked" : "") + ">" +
      "<strong>Option " + (i + 1) + " - " + c.label + " (" + c.model + ")</strong>" +
      "<pre>" + escapeHtml(c.text || "") + "</pre>" +
      "</label>";

    box.appendChild(row);
  });
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function refineSelected(goToTts) {
  const selected = document.querySelector('input[name="candidate"]:checked');

  if (!selected) {
    alert("Please choose one output");
    return;
  }

  const idx = Number(selected.value);

  try {
    const res = await fetch("/refine_slang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_index: idx })
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    document.getElementById("final").innerText = data.refined || "";
    document.getElementById("finalSection").style.display = "block";

    if (goToTts) {
      window.location = "/tts";
    }
  } catch (e) {
    console.error("Refine error:", e);
    alert("Refinement failed");
  }
}

function goToTtsWithGroq() {
  window.location = "/tts";
}

window.onload = loadSlang;