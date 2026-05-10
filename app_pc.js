/**
 * Motor de Procesamiento Local con Whisper AI (PC)
 * Basado en Transformers.js para ejecución en el navegador.
 */
let transcriber;
let mediaRecorder;
let chunks = [];

/**
 * Inicialización automática de la IA al cargar el script.
 */
async function initAI() {
    try {
        const aiStatus = document.getElementById('ai-status');
        aiStatus.innerText = "Cargando cerebro de IA (Whisper)...";
        
        // Cargamos el pipeline de transcripción. 
        // Usamos 'Xenova/whisper-tiny.en' por ser el más rápido (75MB aprox).
        transcriber = await window.whisperPipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
        
        aiStatus.innerText = "IA Lista ✅";
        btn.disabled = false;
        btn.innerText = "REPRODUCIR PALABRA";
        txtEstado.innerText = "Presiona el botón para iniciar";
    } catch (err) {
        console.error("Fallo al cargar IA:", err);
        const aiStatus = document.getElementById('ai-status');
        if (aiStatus) aiStatus.innerText = "Error cargando IA ❌";
    }
}

/**
 * Inicia la captura de audio mediante MediaRecorder (Audio crudo).
 */
async function iniciarGrabacion() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            procesarAudioIA(blob);
        };

        escuchando = true;
        btn.innerText = "🛑 TOCAR AL TERMINAR";
        btn.classList.add('btn-grabar');
        mediaRecorder.start();
    } catch (err) {
        console.error("Error micrófono:", err);
        txtEstado.innerText = "Error: Acceso al micrófono denegado.";
    }
}

/**
 * Prepara el audio y ejecuta la transcripción con Whisper.
 */
async function procesarAudioIA(blob) {
    txtEstado.innerText = "Procesando audio con IA...";
    
    // Whisper requiere audio a 16000Hz (Mono)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const audioData = audioBuffer.getChannelData(0); // Canal mono

    // Transcripción local
    const output = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
        return_timestamps: false
    });

    // Enviamos el texto resultante a la lógica del core.js
    evaluarDeletreo(output.text.trim());
}

/**
 * Detiene el MediaRecorder para disparar el procesamiento.
 */
function finalizarYEvaluar() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        escuchando = false;
        btn.classList.remove('btn-grabar');
        btn.innerText = "PROCESANDO...";
    }
}

// Controlador de eventos del botón principal
btn.addEventListener('click', () => {
    if (!escuchando) {
        txtResultado.innerText = "";
        pronunciarPalabra();
    } else {
        finalizarYEvaluar();
    }
});

// Iniciamos la descarga del modelo al cargar el script
initAI();