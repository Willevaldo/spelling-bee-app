/**
 * Motor de Procesamiento Local con Whisper AI (Tablet)
 * Optimizada para dispositivos con recursos moderados.
 */
let transcriber;
let mediaRecorder;
let chunks = [];

async function initAI() {
    try {
        const aiStatus = document.getElementById('ai-status');
        aiStatus.innerText = "IA Cargando (Tablet)...";
        
        // Cargamos el modelo tiny.en (el más ligero posible)
        transcriber = await window.whisperPipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
        
        aiStatus.innerText = "IA Lista ✅";
        btn.disabled = false;
        btn.innerText = "REPRODUCIR PALABRA";
    } catch (err) {
        console.error("Fallo IA Tablet:", err);
    }
}

async function iniciarGrabacion() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            procesarAudioIA(blob);
        };

        escuchando = true;
        btn.innerText = "🛑 TOCAR AL TERMINAR";
        btn.classList.add('btn-grabar');
        mediaRecorder.start();
    } catch (err) {
        txtEstado.innerText = "Error micrófono.";
    }
}

async function procesarAudioIA(blob) {
    txtEstado.innerText = "Analizando deletreo...";
    
    // Reducción a 16kHz necesaria para el motor Whisper
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const audioData = audioBuffer.getChannelData(0);

    const output = await transcriber(audioData, {
        language: 'english',
        task: 'transcribe'
    });

    evaluarDeletreo(output.text.trim());
}

function finalizarYEvaluar() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        escuchando = false;
        btn.classList.remove('btn-grabar');
        btn.innerText = "ESPERA...";
    }
}

btn.addEventListener('click', () => {
    if (!escuchando) {
        txtResultado.innerText = "";
        pronunciarPalabra();
    } else {
        finalizarYEvaluar();
    }
});

initAI();