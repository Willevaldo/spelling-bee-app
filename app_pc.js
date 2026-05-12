/**
 * Motor Whisper AI - VERSIÓN AUDITORÍA TOTAL
 * Objetivo: Capturar métricas de audio y preservar logs detallados para análisis.
 */
let transcriber;
let mediaRecorder;
let chunks = [];

window.addEventListener('IA_Library_Ready', () => {
    console.log("%c [SISTEMA] Librería cargada. Inicializando IA...", "color: blue; font-weight: bold;");
    initAI();
});

async function initAI() {
    const aiStatus = document.getElementById('ai-status');
    try {
        aiStatus.innerText = "Cargando Cerebro Base-English (145MB)...";
        // Usamos base.en por estabilidad en fonética inglesa
        transcriber = await window.whisperPipeline('automatic-speech-recognition', 'Xenova/whisper-base.en');
        aiStatus.innerText = "IA English Lista ✅";
        btn.disabled = false;
        btn.innerText = "REPRODUCIR PALABRA";
    } catch (err) {
        console.error("[DEBUG ERROR] Fallo carga IA:", err);
        aiStatus.innerText = "Error: " + err.message;
    }
}

async function iniciarGrabacion() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                autoGainControl: true, 
                noiseSuppression: true, 
                echoCancellation: true 
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            procesarAudioIA(blob);
        };

        escuchando = true;
        btn.innerText = "🛑 TOCAR AL TERMINAR";
        btn.classList.add('btn-grabar');
        mediaRecorder.start();
    } catch (err) {
        txtEstado.innerText = "Error Micro: " + err.message;
    }
}

async function procesarAudioIA(blob) {
    const palabraEsperada = bancoDePalabras[indiceActual]?.palabra || "N/A";
    txtEstado.innerText = "IA Analizando...";

    console.log(`%c >>> PROCESANDO: [${palabraEsperada.toUpperCase()}] <<< `, "background: #222; color: #bada55; padding: 5px;");

    try {
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        let audioData = audioBuffer.getChannelData(0);

        // --- MÉTRICAS DE AUDIO ---
        let maxPeak = 0;
        let sumaCuadrados = 0;
        for (let i = 0; i < audioData.length; i++) {
            const absVal = Math.abs(audioData[i]);
            if (absVal > maxPeak) maxPeak = absVal;
            sumaCuadrados += audioData[i] * audioData[i];
        }
        let rms = Math.sqrt(sumaCuadrados / audioData.length);

        console.log(`[MÉTRICAS] Pico Máx: ${maxPeak.toFixed(4)} | RMS (Energía): ${rms.toFixed(4)}`);

        // --- NORMALIZACIÓN POR PICO (No destructiva) ---
        // Solo aplicamos si hay sonido para evitar amplificar silencio absoluto
        let multiplier = 1;
        if (maxPeak > 0.001) {
            multiplier = 0.9 / maxPeak;
            for (let i = 0; i < audioData.length; i++) {
                audioData[i] *= multiplier;
            }
            console.log(`[AJUSTE] Multiplicador aplicado: x${multiplier.toFixed(2)}`);
        }

        // --- LLAMADA A IA CON LOGS DE RESULTADO ---
        const output = await transcriber(audioData, {
            language: 'english',
            task: 'transcribe',
            no_speech_threshold: 0.1, // Sensibilidad alta
            logprob_threshold: -1.5,
            temperature: 0.0
        });

        // LOG DETALLADO DEL OBJETO IA
        console.log("[IA RAW OBJECT]:", output);
        
        let rawText = output.text ? output.text.trim() : "";
        console.log(`%c [IA RESULT]: "${rawText}" `, "background: #efefef; color: #333; font-weight: bold;");

        // Si el resultado es vacío pero había energía, generamos evidencia
        if (rawText === "" && maxPeak > 0.05) {
            console.warn("[ALERTA] Audio con volumen pero IA no devolvió texto.");
            generarBotonDescarga(blob, palabraEsperada);
        }

        // Limpieza final antes de mandar al core
        let cleanText = rawText.replace(/[.,?_\-]/g, " ").replace(/\[.*?\]/g, "").trim();
        evaluarDeletreo(cleanText);

    } catch (err) {
        console.error("[ERROR CRÍTICO]:", err);
        txtEstado.innerText = "Error procesando audio.";
    }
}

/**
 * Función de evidencia: Permite descargar el audio exacto que falló
 */
function generarBotonDescarga(blob, palabra) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fallo_${palabra}_${Date.now()}.webm`;
    link.innerText = "⬇️ Descargar audio del fallo";
    link.style = "display:block; color:red; font-size:12px; margin-top:5px; text-decoration:underline; cursor:pointer;";
    txtEstado.appendChild(link);
}

function finalizarYEvaluar() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
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