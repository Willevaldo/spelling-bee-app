// 1. DICCIONARIO FONÉTICO: Corrige palabras que la tablet confunde con letras
const mapaFonetico = {
    "see": "c", "sea": "c", "si": "c", "se": "c",
    "te": "t", "tea": "t", "tee": "t",
    "eye": "i", "i": "i",
    "hay": "a", "ay": "a", "a": "a",
    "be": "b", "bee": "b",
    "pea": "p", "pee": "p",
    "you": "u", "are": "r", "why": "y", "oh": "o",
    "kay": "k", "el": "l", "and": "n", "em": "m",
    "de": "d", "day": "d", "gee": "g", "jay": "j"
};

// Variables de control de estado y navegación
let indiceActual = 0;
let escuchando = false; 
let transcripcionAcumulada = "";
let puntaje = 0;
let listaErrores = [];
let modoRepaso = false;
let listaLetrasConfirmadas = [];
let interimActual = ""; 

// Variables para auditoría técnica
let registroSesion = []; 
let ultimaTranscripcionBruta = ""; 

// Referencias a los elementos de la interfaz gráfica
const btn = document.getElementById('accionBtn');
const img = document.getElementById('pistaImagen');
const txtEstado = document.getElementById('estado');
const txtResultado = document.getElementById('resultado');
const txtPuntaje = document.getElementById('puntaje');
const menuUI = document.getElementById('menu-inicial');
const juegoUI = document.getElementById('canvas-app');
const scoreUI = document.getElementById('score-container');
const listaGradosUI = document.getElementById('lista-grados');

// Sonidos
const sonidoExito = new Audio('./sounds/exito.mp3');
const sonidoError = new Audio('./sounds/error.mp3');

/**
 * Genera el menú de selección basado en la biblioteca de palabras.
 */
function generarMenu() {
    listaGradosUI.innerHTML = '';
    for (let grado in bibliotecaPalabras) {
        const divGrado = document.createElement('div');
        divGrado.className = 'contenedor-grado';
        
        const btnTodoGrado = document.createElement('button');
        btnTodoGrado.className = 'btn-grado-completo';
        btnTodoGrado.innerText = `▶️ Practicar Todo ${grado}`;
        btnTodoGrado.onclick = () => cargarNivel(grado, null);
        divGrado.appendChild(btnTodoGrado);
        
        const divTests = document.createElement('div');
        divTests.className = 'contenedor-tests';
        for (let test in bibliotecaPalabras[grado]) {
            const btnTest = document.createElement('button');
            btnTest.className = 'btn-test';
            btnTest.innerText = test;
            btnTest.onclick = () => cargarNivel(grado, test);
            divTests.appendChild(btnTest);
        }
        divGrado.appendChild(divTests);
        listaGradosUI.appendChild(divGrado);
    }
}

/**
 * Filtra y aleatoriza el banco de palabras según la selección.
 */
function cargarNivel(grado, test) {
    bancoDePalabras.length = 0; 
    if (test) {
        bancoDePalabras.push(...bibliotecaPalabras[grado][test]);
    } else {
        for (let t in bibliotecaPalabras[grado]) {
            bancoDePalabras.push(...bibliotecaPalabras[grado][t]);
        }
    }
    bancoDePalabras.sort(() => Math.random() - 0.5);
    menuUI.style.display = 'none';
    juegoUI.style.display = 'block';
    scoreUI.style.display = 'block';
}

/**
 * Gestiona la salida de audio y carga de imagen de la palabra actual.
 */
function pronunciarPalabra() {
    if (indiceActual >= bancoDePalabras.length) return;
    let palabraObjetivo = bancoDePalabras[indiceActual].palabra;
    const palabraParaHablar = palabraObjetivo.replace(/\s*\(.*?\)\s*/g, '').trim();
    
    const mensaje = new SpeechSynthesisUtterance(palabraParaHablar);
    mensaje.lang = 'en-US';
    mensaje.rate = 0.8; 
    
    const nombreImagen = palabraObjetivo.replace(/\s*\(.*?\)\s*/g, '_').replace(/\s+/g, '_').replace(/__+/g, '_').trim('_');
    img.src = `./img/${nombreImagen}.jpg`;
    img.style.display = 'inline-block';
    txtEstado.innerText = "Escuchando...";
    
    window.speechSynthesis.speak(mensaje);
    mensaje.onend = () => iniciarGrabacion();
}

/**
 * Valida el deletreo comparando la transcripción bruta con el objetivo.
 * Aplica el mapeo fonético y filtrado de caracteres individuales.
 */
function evaluarDeletreo(transcript) {
    ultimaTranscripcionBruta = transcript; 
    const objetoActual = bancoDePalabras[indiceActual];
    const palabraCorrecta = objetoActual.palabra.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    
    // Muestra la transcripción bruta capturada
    txtEstado.innerHTML = `<span style="color: #666; font-size: 0.9em;">Escuchado: "${transcript}"</span>`;

    // Procesamiento fonético
    let piezas = transcript.toLowerCase().split(/\s+/);
    let piezasTraducidas = piezas.map(p => mapaFonetico[p] || p);
    let letrasDeletreadas = piezasTraducidas.filter(pieza => pieza.length === 1);
    
    const deletreoFinal = letrasDeletreadas.join('');

    if (deletreoFinal === palabraCorrecta) {
        txtResultado.innerText = "✅ ¡EXCELENTE!";
        txtResultado.style.color = "green";
        sonidoExito.play();
        puntaje += 10;
        txtPuntaje.innerText = puntaje;
        avanzarSiguiente();
    } else {
        if (!modoRepaso) listaErrores.push(objetoActual);
        txtResultado.innerText = `❌ LA PALABRA ERA: ${palabraCorrecta.toUpperCase()}`;
        txtResultado.style.color = "red";
        sonidoError.play();
        btn.disabled = true;
        btn.innerText = "MIRA Y ESCUCHA...";
        
        const deletreoAyuda = new SpeechSynthesisUtterance(palabraCorrecta.split('').join(', '));
        deletreoAyuda.lang = 'en-US';
        deletreoAyuda.rate = 0.4; 
        window.speechSynthesis.speak(deletreoAyuda);
        
        const tiempoEspera = Math.max(3500, palabraCorrecta.length * 800);
        setTimeout(() => {
            btn.disabled = false;
            avanzarSiguiente();
        }, tiempoEspera);
    }
}

/**
 * Gestiona la transición a la siguiente palabra o al modo de repaso.
 */
function avanzarSiguiente() {
    indiceActual++;
    if (indiceActual < bancoDePalabras.length) {
        btn.innerText = modoRepaso ? "SIGUIENTE (REPASO)" : "SIGUIENTE PALABRA";
    } else {
        if (!modoRepaso && listaErrores.length > 0) {
            activarModoRepaso();
        } else {
            btn.innerText = "🎉 JUEGO TERMINADO";
            btn.disabled = true;
            txtEstado.innerText = `Puntaje Final: ${puntaje}`;
            img.style.display = 'none';
        }
    }
}

/**
 * Activa la fase de repaso para palabras fallidas.
 */
function activarModoRepaso() {
    modoRepaso = true;
    bancoDePalabras.length = 0; 
    bancoDePalabras.push(...listaErrores);
    bancoDePalabras.sort(() => Math.random() - 0.5);
    indiceActual = 0;
    txtEstado.innerText = "¡VAMOS A REPASAR LAS QUE FALLARON!";
    btn.innerText = "INICIAR REPASO";
}

// --- EVENTOS DE AUDITORÍA TÉCNICA ---

document.getElementById('btnLog').onclick = () => {
    const palabraEsperada = bancoDePalabras[indiceActual - 1]?.palabra || "N/A";
    const entrada = {
        target: palabraEsperada,
        heard: ultimaTranscripcionBruta,
        timestamp: new Date().toLocaleTimeString()
    };
    registroSesion.push(entrada);
    alert(`Registrado: "${palabraEsperada}" -> "${ultimaTranscripcionBruta}"`);
};

document.getElementById('btnExport').onclick = () => {
    if (registroSesion.length === 0) return alert("No hay registros en el log aún.");
    
    const textoLog = registroSesion.map(e => `[${e.timestamp}] PALABRA: ${e.target} | ESCUCHÓ: "${e.heard}"`).join('\n');
    
    navigator.clipboard.writeText(textoLog).then(() => {
        alert("Reporte copiado al portapapeles.");
    });
};

// --- INICIALIZACIÓN ---

window.addEventListener('load', () => {
    generarMenu(); 
    if (typeof APP_VERSION !== 'undefined') {
        document.getElementById('version-display').innerText = `Versión: ${APP_VERSION}`;
    }
});