// Configuración del motor de reconocimiento de voz para escritorio
const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.continuous = true;
reconocimiento.interimResults = false; // PC no requiere procesar resultados intermedios

/**
 * Activa el micrófono y actualiza el estado visual del botón
 */
function iniciarGrabacion() {
    escuchando = true;
    listaLetrasConfirmadas = []; // Limpieza de la sesión actual
    btn.innerText = "🛑 TOCAR AL TERMINAR";
    btn.classList.add('btn-grabar');
    
    try {
        reconocimiento.start();
    } catch (e) {
        console.log("Aviso: El reconocimiento de voz ya se encuentra activo.");
    }
}

/**
 * Captura y almacena los resultados finales emitidos por el motor
 */
reconocimiento.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim().toLowerCase();
            listaLetrasConfirmadas.push(transcript);
        }
    }
    // Nota: No se actualiza la UI en tiempo real por requerimiento de diseño
};

/**
 * Detiene la captura y envía la cadena acumulada a la lógica de evaluación del core.js
 */
function finalizarYEvaluar() {
    escuchando = false;
    reconocimiento.stop();
    btn.classList.remove('btn-grabar');
    btn.innerText = "PROCESANDO...";

    // Pequeño delay para asegurar la recepción del último evento del motor
    setTimeout(() => {
        evaluarDeletreo(listaLetrasConfirmadas.join(" "));
    }, 500);
}

// Controlador de interacción para el botón principal
btn.addEventListener('click', () => {
    if (!escuchando) {
        txtResultado.innerText = "";
        pronunciarPalabra(); // Función definida en core.js
    } else {
        finalizarYEvaluar();
    }
});

// Manejo de errores de hardware
reconocimiento.onerror = (event) => {
    if (event.error === 'no-speech') return;
    escuchando = false;
    btn.classList.remove('btn-grabar');
    btn.innerText = "REINTENTAR";
    txtEstado.innerText = "Error: " + event.error;
};