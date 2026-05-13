/**
 * LAB 15.0 - ELASTIC SHIELD ENGINE
 * Protege los inicios y finales de las letras para evitar mutilación.
 */
let transcriber;
let mediaRecorder;
let chunks = [];
let audioBuffersParaDebug = {};

const btnTest = document.getElementById('btnIniciarTest');
const tableBody = document.getElementById('tablaResultados');
const aiStatus = document.getElementById('ai-status');

const CONFIG_TEST = {
    palabras: ["BROWN", "ORANGE", "SHOE", "CRAYON"],
    perfiles: [
        { id: "NOR", nom: "Normal", rate: 0.9, gap: 500, vol: 0.8 },
        { id: "DUD", nom: "Dudoso", rate: 0.5, gap: 2500, vol: 0.7 },
        { id: "TIM", nom: "Tímido", rate: 0.7, gap: 800, vol: 0.3 },
        { id: "GRI", nom: "Gritón", rate: 1.0, gap: 500, vol: 1.0 }
    ]
};

window.addEventListener('IA_Ready', async () => {
    aiStatus.innerText = "Cerebro Whisper Listo ✅";
    transcriber = await window.whisperPipeline('automatic-speech-recognition', 'Xenova/whisper-base.en');
    btnTest.disabled = false;
});

btnTest.onclick = async () => {
    btnTest.disabled = true;
    tableBody.innerHTML = "";
    for (let p of CONFIG_TEST.palabras) {
        for (let perf of CONFIG_TEST.perfiles) {
            await ejecutarPruebaElastic(p, perf);
        }
    }
    btnTest.disabled = false;
};

async function ejecutarPruebaElastic(palabra, perfil) {
    document.getElementById('test-progress').innerText = `Analizando: ${palabra} (${perfil.nom})`;

    return new Promise(async (resolve) => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        
        mediaRecorder.onstop = async () => {
            const resultAudio = await procesarAudioElastic(chunks);
            const idAudio = `debug_${Date.now()}`;
            audioBuffersParaDebug[idAudio] = resultAudio.buffer;

            // PROMPT DE ALTA ESTRUCTURA
            const prompt = `Task: Spelling. Format: Word, Letters, Word. 
            Example: CAT, C-A-T, CAT. 
            Now: ${palabra}, ${palabra.split('').join('-')}, ${palabra}.`;

            const output = await transcriber(resultAudio.buffer, {
                language: 'english',
                task: 'transcribe',
                initial_prompt: prompt,
                temperature: 0.0,
                repetition_penalty: 1.3
            });

            renderRow(palabra, perfil, resultAudio, output.text, idAudio);
            resolve();
        };

        mediaRecorder.start();
        setTimeout(async () => {
            await hablar(palabra, perfil.vol, 0.9);
            for (let l of palabra.split('')) {
                await new Promise(r => setTimeout(r, perfil.gap));
                await hablar(l, perfil.vol, perfil.rate);
            }
            await new Promise(r => setTimeout(r, 800));
            await hablar(palabra, perfil.vol, 0.9);
            mediaRecorder.stop();
            stream.getTracks().forEach(t => t.stop());
        }, 500);
    });
}

/**
 * PROCESADOR ELASTIC SHIELD
 * Detecta picos y expande la captura para no "mutilar" letras.
 */
async function procesarAudioElastic(chunks) {
    const ctx = new AudioContext({ sampleRate: 16000 });
    const buffer = await ctx.decodeAudioData(await (new Blob(chunks)).arrayBuffer());
    let data = buffer.getChannelData(0);
    
    const threshold = 0.008; // Umbral más sensible
    const padding = 4800; // 300ms de "escudo" antes y después
    const lookahead = 1600; // 100ms de pre-detección
    
    let activeMap = new Uint8Array(data.length);
    let segmentsCount = 0;

    // 1. Detección de zonas de energía con "escudo"
    for (let i = 0; i < data.length; i += 800) {
        let peak = 0;
        for (let j = 0; j < 800 && (i + j) < data.length; j++) {
            if (Math.abs(data[i + j]) > peak) peak = Math.abs(data[i + j]);
        }

        if (peak > threshold) {
            let start = Math.max(0, i - padding);
            let end = Math.min(data.length, i + 800 + padding);
            for (let k = start; k < end; k++) activeMap[k] = 1;
        }
    }

    // 2. Construcción del buffer y conteo de segmentos reales
    let cleanData = [];
    let inSegment = false;
    for (let i = 0; i < data.length; i++) {
        if (activeMap[i] === 1) {
            cleanData.push(data[i]);
            if (!inSegment) { segmentsCount++; inSegment = true; }
        } else {
            inSegment = false;
        }
    }

    let finalBuffer = new Float32Array(cleanData);

    // 3. Normalización Global
    let max = 0;
    for (let i = 0; i < finalBuffer.length; i++) if (Math.abs(finalBuffer[i]) > max) max = Math.abs(finalBuffer[i]);
    if (max > 0) {
        const m = 0.85 / max;
        for (let i = 0; i < finalBuffer.length; i++) finalBuffer[i] *= m;
    }

    return { 
        buffer: finalBuffer, 
        orig: (data.length/16000).toFixed(1), 
        fin: (finalBuffer.length/16000).toFixed(1),
        peak: max.toFixed(3),
        seg: segmentsCount
    };
}

function hablar(t, v, r) {
    return new Promise(resolve => {
        const m = new SpeechSynthesisUtterance(t);
        m.lang = 'en-US'; m.volume = v; m.rate = r; m.onend = resolve;
        window.speechSynthesis.speak(m);
    });
}

window.reproducirDebug = (id) => {
    const buffer = audioBuffersParaDebug[id];
    const ctx = new AudioContext({ sampleRate: 16000 });
    const source = ctx.createBufferSource();
    const audioBuf = ctx.createBuffer(1, buffer.length, 16000);
    audioBuf.getChannelData(0).set(buffer);
    source.buffer = audioBuf; source.connect(ctx.destination); source.start();
};

function renderRow(palabra, perfil, t, raw, idAudio) {
    const row = document.createElement('tr');
    const cleanRaw = (raw || "").toLowerCase();
    const exito = cleanRaw.includes(palabra.toLowerCase());
    row.className = exito ? 'success' : 'fail';
    row.innerHTML = `
        <td><b>${palabra}</b></td>
        <td>${perfil.nom}</td>
        <td>${t.orig}s -> <span class="val">${t.fin}s</span></td>
        <td>Peak: ${t.peak}</td>
        <td>Segmentos: <span class="val">${t.seg}</span></td>
        <td style="font-style:italic;">"${raw || '[VACÍO]'}"</td>
        <td><button class="btn-play" onclick="reproducirDebug('${idAudio}')">▶ OÍR</button></td>
        <td style="text-align:center;">${exito ? '✅' : '❌'}</td>
    `;
    tableBody.appendChild(row);
}