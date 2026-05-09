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

// Variables para el sistema de repaso de palabras fallidas
let listaErrores = [];
let modoRepaso = false;

// CAMBIO: VARIABLES PARA ALMACENAR PIEZAS Y RESCATAR INTERIMS
let listaLetrasConfirmadas = [];
let interimActual = ""; 

// Referencias a los elementos de la interfaz gráfica
const btn = document.getElementById('accionBtn');
const img = document.getElementById('pistaImagen');
const txtEstado = document.getElementById('estado');
const txtResultado = document.getElementById('resultado');
const txtPuntaje = document.getElementById('puntaje');
const debugLog = document.getElementById('debug-log'); 

// Referencias para gestionar el menú y la visibilidad del juego
const menuUI = document.getElementById('menu-inicial');
const juegoUI = document.getElementById('canvas-app');
const scoreUI = document.getElementById('score-container');
const listaGradosUI = document.getElementById('lista-grados');

// Configuración de sonidos de retroalimentación
const sonidoExito = new Audio('./sounds/exito.mp3');
const sonidoError = new Audio('./sounds/error.mp3');
sonidoExito.load();
sonidoError.load();

// Configuración del motor de reconocimiento de voz
const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.continuous = true;

// CAMBIO: Activamos interimResults para capturar letras antes de que el silencio corte el micro
reconocimiento.interimResults = true; 

// Función de utilidad para depuración en tablets
function logDebug(msg) {
    if (!debugLog) return;
    const time = new Date().toLocaleTimeString().split(' ')[0];
    debugLog.innerHTML += `[${time}] ${msg}<br>`;
    debugLog.scrollTop = debugLog.scrollHeight;
}

// Genera el menú de selección de niveles dinámicamente
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

// Prepara el banco de palabras según el nivel seleccionado
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

// Gestiona la síntesis de voz y la carga de imágenes
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

// CAMBIO: INICIO DE GRABACIÓN CON LIMPIEZA DE BAÚL E INTERIMS
function iniciarGrabacion() {
    escuchando = true;
    transcripcionAcumulada = ""; 
    listaLetrasConfirmadas = []; 
    interimActual = ""; // Limpiamos cualquier letra huérfana
    btn.innerText = "🛑 TOCAR AL TERMINAR";
    btn.classList.add('btn-grabar');
    
    logDebug("Iniciando Micrófono...");
    try {
        reconocimiento.start();
    } catch (e) {
        logDebug("Reconocimiento ya activo");
    }
}

// Finaliza la escucha y procesa la cadena resultante rescatando el último interim
function finalizarYEvaluar() {
    escuchando = false; 
    reconocimiento.stop();
    btn.classList.remove('btn-grabar');
    btn.innerText = "PROCESANDO...";

    // CAMBIO: Si quedó una letra procesándose al presionar Stop, la rescatamos
    if (interimActual) {
        logDebug(`Rescate final: "${interimActual}"`);
        listaLetrasConfirmadas.push(interimActual);
        interimActual = "";
    }

    transcripcionAcumulada = listaLetrasConfirmadas.join(" ");
    logDebug("Sesión terminada. Evaluando: " + transcripcionAcumulada);

    setTimeout(() => {
        evaluarDeletreo(transcripcionAcumulada.trim());
    }, 600);
}

// CAMBIO: LÓGICA DE CAPTURA SENSIBLE (FINAL + INTERIM)
reconocimiento.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        const esFinal = event.results[i].isFinal;

        if (esFinal) {
            logDebug(`Confirmado: "${transcript}"`);
            listaLetrasConfirmadas.push(transcript);
            interimActual = ""; // Se confirmó, ya no es huérfana
        } else {
            // Guardamos provisionalmente por si el micro se corta antes de ser final
            interimActual = transcript;
        }
    }
    
    // Actualizamos visualización sumando lo confirmado y lo que está "en el aire"
    const visual = [...listaLetrasConfirmadas];
    if (interimActual) visual.push(interimActual);
    txtEstado.innerText = `Escuchando: ${visual.join(" ").toUpperCase()}`;
};

// CAMBIO: SISTEMA DE RESCATE EN ONEND
reconocimiento.onend = () => {
    if (escuchando) {
        // RESCATE: Si el micro se cortó y había algo en interim, lo pasamos al baúl
        if (interimActual) {
            logDebug(`Rescatando letra huérfana: "${interimActual}"`);
            listaLetrasConfirmadas.push(interimActual);
            interimActual = "";
        }

        logDebug("Micro se cerró por silencio. Reiniciando...");
        setTimeout(() => {
            if (escuchando) {
                try { 
                    reconocimiento.start(); 
                } catch(e) {
                    logDebug("Fallo en reinicio: " + e.message);
                }
            }
        }, 100);
    }
};

// Lógica de validación con TRADUCTOR FONÉTICO y filtrado
function evaluarDeletreo(transcript) {
    const objetoActual = bancoDePalabras[indiceActual];
    const palabraCorrecta = objetoActual.palabra.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    
    let piezas = transcript.toLowerCase().split(/\s+/);

    // CAMBIO: Traducimos palabras cortas a letras (ej: "see" -> "c")
    let piezasTraducidas = piezas.map(p => mapaFonetico[p] || p);

    // Filtramos solo elementos que quedaron de 1 letra
    let letrasDeletreadas = piezasTraducidas.filter(pieza => pieza.length === 1);
    const deletreoFinal = letrasDeletreadas.join('');
    const deletreoVisible = letrasDeletreadas.join(' ').toUpperCase();
    
    if (deletreoFinal === "") {
         txtEstado.innerText = `No escuché el deletreo claro.`;
         logDebug("Evaluación fallida: Sin letras tras traducción.");
    } else {
         txtEstado.innerText = `Escuché: "${deletreoVisible}"`;
    }

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

        const deletreoAyuda = new SpeechSynthesisUtterance();
        deletreoAyuda.text = palabraCorrecta.split('').join(', '); 
        deletreoAyuda.lang = 'en-US';
        deletreoAyuda.rate = 0.4; // Velocidad lenta para facilitar el aprendizaje
        
        window.speechSynthesis.speak(deletreoAyuda);

        // Calculamos 800ms por cada letra para que el niño termine de oír antes de seguir
        const tiempoEspera = Math.max(3500, palabraCorrecta.length * 800);
        setTimeout(() => {
            btn.disabled = false;
            avanzarSiguiente();
        }, tiempoEspera);
    }
}

// Avanza a la siguiente palabra o inicia el modo de repaso
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

// Filtra el banco de palabras para repetir solo los errores previos
function activarModoRepaso() {
    modoRepaso = true;
    bancoDePalabras.length = 0; 
    bancoDePalabras.push(...listaErrores);
    bancoDePalabras.sort(() => Math.random() - 0.5);
    indiceActual = 0;
    
    txtEstado.innerText = "¡VAMOS A REPASAR LAS QUE FALLARON!";
    btn.innerText = "INICIAR REPASO";
    txtResultado.innerText = "Segunda oportunidad";
    txtResultado.style.color = "#007bff";
}

// Gestión de errores técnicos del micrófono
reconocimiento.onerror = (event) => {
    logDebug("Error capturado: " + event.error);
    if (event.error === 'no-speech') return; 
    btn.classList.remove('btn-grabar');
    btn.innerText = "REINTENTAR";
    escuchando = false;
    txtEstado.innerText = "Error de micrófono: " + event.error;
};

// Controlador de eventos para el botón de acción principal
btn.addEventListener('click', () => {
    if (!escuchando) {
        txtResultado.innerText = "";
        pronunciarPalabra();
    } else {
        finalizarYEvaluar();
    }
});

// Inicialización de la interfaz al cargar la ventana
window.addEventListener('load', () => {
    generarMenu(); 
    const display = document.getElementById('version-display');
    if (display && typeof APP_VERSION !== 'undefined') {
        display.innerText = `Versión: ${APP_VERSION}`;
    }
});