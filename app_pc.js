/**
 * Motor de Procesamiento Local con Whisper AI (PC)
 * Versión con Diagnóstico de Volumen y Resiliencia
 */
let transcriber;
let mediaRecorder;
let chunks = [];

async function initAI() {
    try {
        const aiStatus = document.getElementById('ai-status');
        aiStatus.innerText = "Cargando cerebro de IA (Whisper)...";
        
        // Usamos el modelo tiny.en de Xenova
        transcriber = await window.whisperPipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
        
        aiStatus.innerText = "IA Lista ✅";
        btn.disabled = false;
        btn.innerText = "REPRODUCIR PALABRA";
        txtEstado.innerText = "IA preparada y esperando...";
    } catch (err) {
        console.error("Fallo al cargar IA:", err);
        document.getElementById('ai-status').innerText = "Error cargando IA ❌";
    }
}

async function iniciarGrabacion() {
    try {
        // Solicitamos audio con configuraciones de limpieza
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            if (chunks.length === 0) {
                console.error("No se capturaron datos de audio.");
                txtEstado.innerText = "Error: No se capturó audio.";
                return;
            }
            const blob = new Blob(chunks, { type: 'audio/webm' });
            procesarAudioIA(blob);
        };

        escuchando = true;
        btn.innerText = "🛑 TOCAR AL TERMINAR";
        btn.classList.add('btn-grabar');
        mediaRecorder.start();
        console.log("Grabación iniciada...");
    } catch (err) {
        console.error("Error micrófono:", err);
        txtEstado.innerText = "Error: Acceso al micrófono denegado.";
    }
}

async function procesarAudioIA(blob) {
    txtEstado.innerText = "IA analizando sonidos...";
    console.log("Iniciando procesamiento de Blob de tamaño:", blob.size);

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const audioData = audioBuffer.getChannelData(0);

        // DIAGNÓSTICO DE VOLUMEN
        let maxAmp = 0;
        for (let i = 0; i < audioData.length; i++) {
            if (Math.abs(audioData[i]) > maxAmp) maxAmp = Math.abs(audioData[i]);
        }
        console.log("Amplitud máxima detectada:", maxAmp);

        if (maxAmp < 0.01) {
            console.warn("Audio demasiado bajo o silencio total detectado.");
            txtEstado.innerText = "⚠️ No se escuchó nada. ¡Habla más fuerte!";
            evaluarDeletreo(""); // Enviamos vacío para limpiar el estado
            return;
        }

        // Ejecución de Whisper
        const output = await transcriber(audioData, {
            language: 'english',
            task: 'transcribe',
            return_timestamps: false
        });

        console.log("Resultado Whisper:", output.text);
        evaluarDeletreo(output.text.trim());

    } catch (err) {
        console.error("Error en el procesamiento de IA:", err);
        txtEstado.innerText = "Error procesando el audio.";
    }
}

function finalizarYEvaluar() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        // Detenemos los tracks del micrófono para liberar el hardware
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        escuchando = false;
        btn.classList.remove('btn-grabar');
        btn.innerText = "PROCESANDO...";
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