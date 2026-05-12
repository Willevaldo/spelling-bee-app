// 1. DICCIONARIO FONÉTICO: Corrige palabras que la IA pueda confundir con letras individuales.
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

// Variables para el sistema de repaso de palabras fallidas
let listaErrores = [];
let modoRepaso = false;

// Variables para el motor de captura
let listaLetrasConfirmadas = [];
let interimActual = ""; 

// Variables para auditoría técnica y análisis de fallos
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
const btnLog = document.getElementById('btnLog');
const btnExport = document.getElementById('btnExport');

// Configuración de sonidos de retroalimentación
const sonidoExito = new Audio('./sounds/exito.mp3');
const sonidoError = new Audio('./sounds/error.mp3');

/**
 * Genera el menú de selección de niveles basado en bibliotecaPalabras (datos.js)
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
 * Prepara el banco de palabras y cambia la vista hacia el juego
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
 * Gestiona la síntesis de voz, carga de imagen y reseteo de botones de auditoría
 */
function pronunciarPalabra() {
    if (indiceActual >= bancoDePalabras.length) return;

    btnLog.disabled = false;
    btnLog.style.opacity = "1";
    btnLog.innerText = "📝 Registrar Error";

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
 * Lógica de validación. 
 * CAMBIO: Ahora limpia guiones y guiones bajos para procesar deletreos unidos.
 */
function evaluarDeletreo(transcript) {
    ultimaTranscripcionBruta = transcript; 
    const objetoActual = bancoDePalabras[indiceActual];
    const palabraCorrecta = objetoActual.palabra.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    
    // Revelamos la transcripción Raw
    txtEstado.innerHTML = `<span style="color: #666; font-size: 0.9em;">Raw: "${transcript}"</span>`;

    // LIMPIEZA: Reemplazamos guiones, guiones bajos, puntos y comas por espacios.
    let textoLimpio = transcript.toLowerCase().replace(/[.,?_\-]/g, ' ');
    
    // Dividimos por uno o más espacios
    let piezas = textoLimpio.trim().split(/\s+/);
    
    // Traducimos fonética
    let piezasTraducidas = piezas.map(p => mapaFonetico[p] || p);
    
    // Filtramos letras individuales
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
        if (!modoRepaso) {
            listaErrores.push(objetoActual);
        }

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
 * Controla el avance del índice o activa la fase de repaso
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
 * Configura el banco para trabajar sólo con los errores cometidos
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

// --- EVENTOS DE AUDITORÍA TÉCNICA (LOGS) ---

btnLog.onclick = () => {
    const palabraEsperada = bancoDePalabras[indiceActual - 1]?.palabra || "N/A";
    registroSesion.push({
        target: palabraEsperada,
        heard: ultimaTranscripcionBruta,
        timestamp: new Date().toLocaleTimeString()
    });

    btnLog.disabled = true;
    btnLog.style.opacity = "0.5";
    btnLog.innerText = "✅ Guardado";
};

btnExport.onclick = () => {
    if (registroSesion.length === 0) return;
    
    const textoLog = registroSesion.map(e => `[${e.timestamp}] PALABRA: ${e.target} | ESCUCHÓ: "${e.heard}"`).join('\n');
    
    navigator.clipboard.writeText(textoLog).then(() => {
        const originalText = btnExport.innerText;
        btnExport.innerText = "📋 ¡Copiado!";
        setTimeout(() => btnExport.innerText = originalText, 2000);
    });
};

// Inicialización de la interfaz
window.addEventListener('load', () => {
    generarMenu(); 
    if (typeof APP_VERSION !== 'undefined') {
        document.getElementById('version-display').innerText = `Versión: ${APP_VERSION}`;
    }
});