// Variables de control de estado y navegación
let indiceActual = 0;
let escuchando = false; 
let transcripcionAcumulada = "";

// CAMBIO: CARGA DE SONIDOS DESDE CARPETA LOCAL PARA USO OFFLINE
const sonidoExito = new Audio('./sounds/exito.mp3');
const sonidoError = new Audio('./sounds/error.mp3');

// NUEVO: PRE-CARGA DE AUDIOS PARA EVITAR LATENCIA EN TABLETS
sonidoExito.load();
sonidoError.load();

// Configuración del motor de reconocimiento de voz
const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.continuous = true;
reconocimiento.interimResults = true;

// Referencias a los elementos de la interfaz gráfica
const btn = document.getElementById('accionBtn');
const img = document.getElementById('pistaImagen');
const txtEstado = document.getElementById('estado');
const txtResultado = document.getElementById('resultado');

// Gestiona la reproducción de voz de la palabra actual
function pronunciarPalabra() {
    if (indiceActual >= bancoDePalabras.length) {
        txtEstado.innerText = "¡Felicidades! Completaste la lista.";
        btn.disabled = true;
        return;
    }

    const palabraObjetivo = bancoDePalabras[indiceActual].palabra;
    const mensaje = new SpeechSynthesisUtterance(palabraObjetivo);
    mensaje.lang = 'en-US';
    mensaje.rate = 0.8; 
    
    img.src = bancoDePalabras[indiceActual].imagen;
    img.style.display = 'inline-block';
    txtEstado.innerText = "Escuchando palabra...";
    
    window.speechSynthesis.speak(mensaje);
    
    mensaje.onend = () => {
        iniciarGrabacion();
    };
}

// Activa el micrófono y cambia el estado visual del botón
function iniciarGrabacion() {
    escuchando = true;
    transcripcionAcumulada = ""; 
    btn.innerText = "🛑 TOCAR AL TERMINAR";
    btn.classList.add('btn-grabar');
    
    try {
        reconocimiento.start();
    } catch (e) {
        console.log("Reconocimiento ya activo");
    }
}

// Detiene la escucha y dispara la evaluación del texto capturado
function finalizarYEvaluar() {
    escuchando = false;
    reconocimiento.stop();
    btn.classList.remove('btn-grabar');
    btn.innerText = "PROCESANDO...";

    setTimeout(() => {
        evaluarDeletreo(transcripcionAcumulada.trim());
    }, 500);
}

// Procesa el audio capturado mientras el usuario sigue hablando
reconocimiento.onresult = (event) => {
    let parcial = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            transcripcionAcumulada += event.results[i][0].transcript + " ";
        } else {
            parcial += event.results[i][0].transcript;
        }
    }
    txtEstado.innerText = `Escuché: ${transcripcionAcumulada} ${parcial}`;
};

// Lógica de validación de deletreo con formato "Word-Spell-Word"
function evaluarDeletreo(transcript) {
    const palabraCorrecta = bancoDePalabras[indiceActual].palabra.toLowerCase();
    let piezas = transcript.toLowerCase().split(/\s+/);

    if (piezas.length > 1 && piezas[0] === palabraCorrecta) {
        piezas.shift(); 
    }
    if (piezas.length > 0 && piezas[piezas.length - 1] === palabraCorrecta) {
        piezas.pop(); 
    }

    const deletreoFinal = piezas.join('');

    if (deletreoFinal === palabraCorrecta) {
        txtResultado.innerText = "✅ ¡EXCELENTE!";
        txtResultado.style.color = "green";
        // CAMBIO: REPRODUCCION DE SONIDO LOCAL DE EXITO
        sonidoExito.play();
    } else {
        txtResultado.innerText = `❌ ERROR EN EL DELETREO`;
        txtResultado.style.color = "red";
        // CAMBIO: REPRODUCCION DE SONIDO LOCAL DE ERROR
        sonidoError.play();
        txtEstado.innerText = `Dijiste "${deletreoFinal}" en lugar de "${palabraCorrecta}"`;
    }

    indiceActual++;
    if (indiceActual < bancoDePalabras.length) {
        btn.innerText = "SIGUIENTE PALABRA";
    } else {
        btn.innerText = "🎉 JUEGO TERMINADO";
        btn.disabled = true;
    }
}

// Manejo de errores técnicos del micrófono
reconocimiento.onerror = (event) => {
    btn.classList.remove('btn-grabar');
    btn.innerText = "REINTENTAR";
    escuchando = false;
    txtEstado.innerText = "Error de micrófono: " + event.error;
};

// Controlador de eventos para el botón principal (Play / Stop)
btn.addEventListener('click', () => {
    if (!escuchando) {
        txtResultado.innerText = "";
        pronunciarPalabra();
    } else {
        finalizarYEvaluar();
    }
});

// Sincroniza la visualización de la versión al cargar la página
window.addEventListener('load', () => {
    const display = document.getElementById('version-display');
    if (display && typeof APP_VERSION !== 'undefined') {
        display.innerText = `Versión: ${APP_VERSION}`;
    }
});