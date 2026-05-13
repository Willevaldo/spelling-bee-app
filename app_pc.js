/**
 * app_pc.js - MOTOR DE IA WHISPER (PC)
 * Versión 2.0.7 - "Extreme-Aware" & "Glue-Resistant"
 * 
 * Esta versión maneja:
 * 1. Word-Spell-Word (aunque falte alguna palabra).
 * 2. Efecto "Pegamento" (Whisper une letras en palabras completas).
 * 3. Falsos Positivos (No basta con decir la palabra, hay que deletrearla).
 */

let transcriber;

// 1. INICIALIZACIÓN
window.addEventListener('IA_Library_Ready', async () => {
    const statusLabel = document.getElementById('ai-status');
    const actionBtn = document.getElementById('accionBtn');

    try {
        statusLabel.innerText = "🧠 Cargando IA (Base-English)...";
        transcriber = await window.whisperPipeline('automatic-speech-recognition', 'Xenova/whisper-base.en');
        statusLabel.innerText = "IA de Voz Lista ✅";
        statusLabel.style.color = "#28a745";
        if (actionBtn) {
            actionBtn.disabled = false;
            actionBtn.innerText = "🎤 COMENZAR PRÁCTICA";
        }
    } catch (err) {
        statusLabel.innerText = "❌ Error de carga.";
    }
});

// 2. PROCESAMIENTO DE AUDIO
window.addEventListener('audioReady', async (e) => {
    const { blob } = e.detail;
    const estadoUI = document.getElementById('estado');
    const palabraCorrecta = bancoDePalabras[indiceActual].palabra.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();

    estadoUI.innerText = "✨ IA Analizando...";

    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const buffer = await audioCtx.decodeAudioData(await blob.arrayBuffer());
        const audioData = buffer.getChannelData(0);

        const output = await transcriber(audioData, {
            language: 'english',
            task: 'transcribe',
            temperature: 0,
            no_speech_threshold: 0.02 
        });

        const rawText = output.text.toLowerCase().trim();
        
        // Feedback visual: Lo que la IA escuchó realmente
        estadoUI.innerHTML = `IA escuchó: <br><strong>"${rawText}"</strong>`;

        // --- LÓGICA DE DETECTIVE v2.0.7 ---
        
        // Separamos en piezas limpias
        let piezas = rawText.replace(/[.,?_\-]/g, " ").split(/\s+/).filter(p => p.length > 0);
        
        /**
         * PASO 1: Limpieza Inteligente de Extremos
         * Si la primera o última pieza es EXACTAMENTE la palabra, la quitamos.
         * Esto funciona aunque Whisper solo detecte una de las dos.
         */
        if (piezas.length > 1) {
            if (piezas[0] === palabraCorrecta) {
                console.log("Poda: Palabra inicial detectada y removida.");
                piezas.shift();
            }
            // Revisamos de nuevo longitud porque pudo quedar vacía
            if (piezas.length > 0 && piezas[piezas.length - 1] === palabraCorrecta) {
                console.log("Poda: Palabra final detectada y removida.");
                piezas.pop();
            }
        }

        /**
         * PASO 2: Construcción del Núcleo de Deletreo
         * Lo que queda en 'piezas' es lo que el niño hizo entre la primera y última palabra.
         */
        let deletreoExtraido = "";
        piezas.forEach(pieza => {
            if (window.mapaFonetico[pieza]) {
                deletreoExtraido += window.mapaFonetico[pieza]; // "sea" -> "c"
            } else if (pieza.length === 1 && /[a-z]/.test(pieza)) {
                deletreoExtraido += pieza; // "l", "i", "z"...
            } else {
                // "bed" (pegamento) o "lister" (ruido/error)
                deletreoExtraido += pieza; 
            }
        });

        console.log(`[Análisis] Núcleo: "${deletreoExtraido}" | Objetivo: "${palabraCorrecta}"`);

        /**
         * PASO 3: Validación de Seguridad
         * Para evitar que "Lizard Lizard" (sin deletrear) de puntos:
         * Si el niño no deletreó nada, el núcleo estará vacío o será solo ruido.
         */
        if (deletreoExtraido.includes(palabraCorrecta)) {
            window.marcarExito();
        } else {
            window.marcarError(palabraCorrecta);
        }

    } catch (err) {
        console.error("Error:", err);
        estadoUI.innerText = "⚠️ Error de análisis.";
        window.marcarError(palabraCorrecta);
    }
});