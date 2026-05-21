/**
 * CORE.JS - SPELLING BEE TRAINER v2.0.4
 * Versión: Dataset Builder (Estabilidad v2.0.2 + Reintento Único)
 */

// --- 1. VARIABLES DE ESTADO ---
let usuarioActual = "";
let modoJuego = ""; 
let nivelEscritura = 0; 
let indiceActual = 0;
let puntaje = 0;
let listaErrores = []; // Almacenará objetos { palabra: string, tipo: 'VOZ' | 'ESCRITURA' }
let ultimoAudioBlob = null;
let reintentoActivo = false; // Único control nuevo para el flujo de reintento

// --- 2. REFERENCIAS UI ---
const pantallas = {
    perfil: document.getElementById('pantalla-perfil'),
    menu: document.getElementById('menu-inicial'),
    modo: document.getElementById('selector-modo'),
    dificultad: document.getElementById('selector-dificultad-escritura'),
    app: document.getElementById('canvas-app')
};

const UI = {
    nombreInput: document.getElementById('input-nombre'),
    btnEntrar: document.getElementById('btn-entrar'),
    listaGrados: document.getElementById('lista-grados'),
    imagen: document.getElementById('pistaImagen'),
    estado: document.getElementById('estado'),
    resultado: document.getElementById('resultado'),
    btnAccion: document.getElementById('accionBtn'),
    inputEscritura: document.getElementById('input-escritura'),
    contenedorLetras: document.getElementById('contenedor-letras-disponibles'),
    btnRescate: document.getElementById('btn-deletré-bien'),
    txtPuntaje: document.getElementById('puntaje')
};

window.mapaFonetico = {
    "see": "c", "sea": "c", "si": "c", "eye": "i", "hay": "a", "ay": "a",
    "be": "b", "bee": "b", "pea": "p", "you": "u", "are": "r", "why": "y",
    "oh": "o", "and": "n", "de": "d", "day": "d", "gee": "g", "jay": "j"
};

// --- 3. FLUJO DE INICIO ---

window.addEventListener('load', () => {
    if (window.APP_VERSION) {
        document.getElementById('version-display').innerText = window.APP_VERSION;
    }
    usuarioActual = "";
    UI.nombreInput.value = "";
    mostrarPantalla('perfil');
    generarMenu();
});

UI.btnEntrar.onclick = () => {
    const nombre = UI.nombreInput.value.trim();
    if (nombre) {
        usuarioActual = nombre;
        mostrarPantalla('menu');
    }
};

function mostrarPantalla(id) {
    Object.values(pantallas).forEach(p => p.style.display = 'none');
    const t = pantallas[id] || document.getElementById(id);
    if (t) t.style.display = 'block';
}

// --- 4. SELECCIÓN DE NIVELES ---

function cargarNivel(grado, test) {
    bancoDePalabras.length = 0; 
    if (test) {
        bancoDePalabras.push(...bibliotecaPalabras[grado][test]);
    } else {
        for (let t in bibliotecaPalabras[grado]) bancoDePalabras.push(...bibliotecaPalabras[grado][t]);
    }
    bancoDePalabras.sort(() => Math.random() - 0.5);
    mostrarPantalla('modo');
}

document.getElementById('btn-modo-hablar').onclick = () => {
    if (window.esTablet) return alert("Usa modo escritura en Tablet.");
    modoJuego = "VOZ"; iniciarApp();
};

document.getElementById('btn-modo-escribir').onclick = () => mostrarPantalla('dificultad');
document.getElementById('btn-escribir-n1').onclick = () => { modoJuego = "ESCRITURA"; nivelEscritura = 1; iniciarApp(); };
document.getElementById('btn-escribir-n2').onclick = () => { modoJuego = "ESCRITURA"; nivelEscritura = 2; iniciarApp(); };

function iniciarApp() {
    indiceActual = 0; puntaje = 0;
    listaErrores = []; // Reiniciar registro de errores al iniciar la práctica
    UI.txtPuntaje.innerText = "0";
    mostrarPantalla('app');
    document.getElementById('score-container').style.display = 'block';
    siguientePalabra();
}

// --- 5. LÓGICA DE JUEGO Y VOZ AUTOMÁTICA ---

function siguientePalabra() {
    if (indiceActual >= bancoDePalabras.length) {
        finalizarPractica();
        return;
    }

    UI.resultado.innerText = "";
    UI.btnRescate.style.display = 'none';
    UI.btnRescate.disabled = false;
    UI.btnRescate.innerText = "✨ ¡Lo deletreé bien! (Guardar)";
    UI.inputEscritura.value = "";
    UI.inputEscritura.style.display = (modoJuego === "ESCRITURA") ? 'block' : 'none';
    UI.contenedorLetras.innerHTML = "";
    UI.btnAccion.disabled = true; 
    
    configurarEntrada();
    pronunciarPalabra();
}

function pronunciarPalabra() {
    const p = bancoDePalabras[indiceActual];
    const texto = p.palabra.replace(/\s*\(.*?\)\s*/g, '').trim();
    
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = 'en-US';
    msg.rate = 0.8;
    
    UI.imagen.src = p.imagen;
    UI.imagen.style.display = 'block';
    
    // Feedback de estado de intento
    UI.estado.innerText = reintentoActivo ? "¡Segundo intento! Escucha de nuevo..." : "Escuchando palabra...";

    msg.onend = () => {
        if (modoJuego === "VOZ") {
            iniciarGrabacion();
        } else {
            UI.btnAccion.disabled = false;
            UI.btnAccion.innerText = "✔️ COMPROBAR";
            UI.btnAccion.onclick = evaluarEscritura; // CORREGIDO: "UI" en mayúsculas corregido aquí
        }
    };

    window.speechSynthesis.speak(msg);
}

function configurarEntrada() {
    if (modoJuego === "ESCRITURA") {
        UI.inputEscritura.focus();
        if (nivelEscritura === 1) {
            const palabra = bancoDePalabras[indiceActual].palabra.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
            palabra.split('').sort(() => Math.random() - 0.5).forEach(l => {
                const tile = document.createElement('div');
                tile.className = 'letra-tile';
                tile.innerText = l.toUpperCase();
                tile.onclick = () => { UI.inputEscritura.value += l; UI.inputEscritura.focus(); };
                UI.contenedorLetras.appendChild(tile);
            });
        }
        UI.inputEscritura.onkeydown = (e) => { if (e.key === "Enter") evaluarEscritura(); };
    }
}

// --- 6. GESTIÓN DE MICRO ---

let mediaRecorder;
let audioBlobs = [];

async function iniciarGrabacion() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioBlobs = [];
        
        mediaRecorder.ondataavailable = e => audioBlobs.push(e.data);
        mediaRecorder.onstop = () => {
            ultimoAudioBlob = new Blob(audioBlobs, { type: 'audio/webm' });
            window.dispatchEvent(new CustomEvent('audioReady', { detail: { blob: ultimoAudioBlob } }));
        };
        
        mediaRecorder.start();
        UI.btnAccion.disabled = false;
        UI.btnAccion.innerText = "🛑 PARAR DELETREO";
        UI.btnAccion.classList.add('btn-grabar');
        UI.btnAccion.onclick = detenerGrabacion;
        UI.estado.innerText = "🎤 ¡Deletrea ahora!";
    } catch (err) {
        alert("Micro bloqueado.");
    }
}

function detenerGrabacion() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        UI.btnAccion.disabled = true;
        UI.btnAccion.innerText = "ANALIZANDO...";
        UI.btnAccion.classList.remove('btn-grabar');
    }
}

// --- 7. EVALUACIÓN Y LÓGICA DE REINTENTO ---

function evaluarEscritura() {
    const intento = UI.inputEscritura.value.trim().toLowerCase();
    const correcta = bancoDePalabras[indiceActual].palabra.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    if (intento === correcta) marcarExito(); else marcarError(correcta);
}

window.marcarExito = () => {
    reintentoActivo = false; // Reset al acertar
    puntaje += 10; UI.txtPuntaje.innerText = puntaje;
    UI.resultado.innerText = "✅ ¡EXCELENTE!";
    UI.resultado.style.color = "#28a745";
    new Audio('./sounds/exito.mp3').play();
    if (modoJuego === "VOZ") guardarClipLocalmente(); 
    setTimeout(avanzar, 1500);
};

window.marcarError = (correcta) => {
    UI.btnAccion.disabled = true;
    UI.resultado.innerText = `❌ ERA: ${correcta.toUpperCase()}`;
    UI.resultado.style.color = "#dc3545";
    new Audio('./sounds/error.mp3').play();
    if (modoJuego === "VOZ") UI.btnRescate.style.display = 'block';

    // REGISTRO DE ERROR: Almacena la palabra si falla el intento (evita duplicados si falla ambos intentos)
    const palabraOriginal = bancoDePalabras[indiceActual].palabra;
    const yaExiste = listaErrores.some(err => err.palabra === palabraOriginal && err.tipo === modoJuego);
    if (!yaExiste) {
        listaErrores.push({
            palabra: palabraOriginal,
            tipo: modoJuego
        });
    }

    const msg = new SpeechSynthesisUtterance(correcta.split('').join(', '));
    msg.lang = 'en-US';
    msg.rate = 0.5;
    
    msg.onend = () => {
        setTimeout(() => {
            if (!reintentoActivo) {
                // Primer error: Repetir palabra actual
                reintentoActivo = true;
                siguientePalabra();
            } else {
                // Segundo error: Avanzar definitivamente
                reintentoActivo = false;
                if (modoJuego !== "VOZ") {
                    avanzar();
                } else {
                    UI.btnAccion.disabled = false;
                    UI.btnAccion.innerText = "SIGUIENTE";
                    UI.btnAccion.onclick = avanzar;
                }
            }
        }, 1000);
    };
    window.speechSynthesis.speak(msg);
};

function avanzar() { 
    reintentoActivo = false; 
    indiceActual++; 
    siguientePalabra(); 
}

function guardarClipLocalmente() {
    if (!ultimoAudioBlob || !usuarioActual) return;
    const p = bancoDePalabras[indiceActual].palabra.replace(/\s+/g, '_').replace(/[()]/g, '');
    const nombre = `${usuarioActual}_${p}_${Date.now()}.webm`;
    const url = URL.createObjectURL(ultimoAudioBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url; a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

UI.btnRescate.onclick = () => {
    guardarClipLocalmente();
    UI.btnRescate.innerText = "✅ GUARDADO";
    UI.btnRescate.disabled = true;
};

// --- FUNCIÓN: FINALIZACIÓN Y RENDERIZADO DE REPORTE DE ERRORES ---
function finalizarPractica() {
    // Ocultar elementos operativos de la app de juego
    UI.imagen.style.display = 'none';
    UI.contenedorLetras.innerHTML = "";
    UI.inputEscritura.style.display = 'none';
    UI.btnAccion.style.display = 'none';
    UI.btnRescate.style.display = 'none';
    
    UI.estado.innerText = "Práctica Terminada";
    UI.resultado.innerText = "";

    // Crear dinámicamente el contenedor del reporte
    const contenedorReporte = document.createElement('div');
    contenedorReporte.id = 'reporte-errores-final';
    contenedorReporte.style.cssText = `
        margin: 20px auto;
        padding: 20px;
        background: #fff5f5;
        border: 2px solid #feb2b2;
        border-radius: 10px;
        font-family: sans-serif;
        text-align: left;
        max-width: 500px;
    `;

    if (listaErrores.length === 0) {
        contenedorReporte.innerHTML = `
            <h3 style="color: #2f855a; margin-top: 0;">🎉 ¡Felicidades, ${usuarioActual}!</h3>
            <p style="color: #38a169; margin-bottom: 0;">No tuviste errores en esta sesión de práctica.</p>
        `;
    } else {
        let itemsHtml = '';
        listaErrores.forEach(item => {
            const colorEtiqueta = item.tipo === 'VOZ' ? '#3182ce' : '#dd6b20';
            const textoEtiqueta = item.tipo === 'VOZ' ? 'Hablado' : 'Escrito';
            
            itemsHtml += `
                <li style="margin-bottom: 10px; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 5px;">
                    <strong style="color: #2d3748;">${item.palabra}</strong>
                    <span style="background: ${colorEtiqueta}; color: white; font-size: 0.8rem; padding: 3px 8px; border-radius: 5px; font-weight: bold; text-transform: uppercase;">
                        ${textoEtiqueta}
                    </span>
                </li>
            `;
        });

        contenedorReporte.innerHTML = `
            <h3 style="color: #9b2c2c; margin-top: 0; border-bottom: 2px solid #feb2b2; padding-bottom: 10px;">📋 Palabras por Repasar</h3>
            <ul style="list-style: none; padding: 0; margin: 15px 0 0 0;">
                ${itemsHtml}
            </ul>
        `;
    }

    // Botón de salida para reiniciar la interfaz
    const btnSalir = document.createElement('button');
    btnSalir.innerText = "VOLVER AL MENÚ";
    btnSalir.style.cssText = `
        margin-top: 20px;
        padding: 10px 20px;
        font-size: 1rem;
        background: #4a5568;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        width: 100%;
    `;
    btnSalir.onclick = () => location.reload();
    contenedorReporte.appendChild(btnSalir);

    // Inyectar el reporte dentro del canvas principal del juego
    pantallas.app.appendChild(contenedorReporte);
}

// --- 8. GENERACIÓN DE MENÚ ---

function generarMenu() {
    UI.listaGrados.innerHTML = '';
    for (let g in bibliotecaPalabras) {
        const div = document.createElement('div');
        div.className = 'contenedor-grado';
        const b = document.createElement('button');
        b.className = 'btn-grado-completo';
        b.innerText = `▶️ ${g}`;
        b.onclick = () => cargarNivel(g, null);
        div.appendChild(b);
        const tCont = document.createElement('div');
        tCont.className = 'contenedor-tests';
        for (let t in bibliotecaPalabras[g]) {
            const bt = document.createElement('button');
            bt.className = 'btn-test'; bt.innerText = t;
            bt.onclick = () => cargarNivel(g, t);
            tCont.appendChild(bt);
        }
        div.appendChild(tCont);
        UI.listaGrados.appendChild(div);
    }
}