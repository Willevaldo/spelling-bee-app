// Configuración de alta sensibilidad para dispositivos táctiles/móviles
const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.continuous = true;
reconocimiento.interimResults = true; // Necesario para rescatar letras en cortes de silencio

/**
 * Prepara el entorno de captura reseteando los acumuladores de piezas e interims
 */
function iniciarGrabacion() {
    escuchando = true;
    listaLetrasConfirmadas = [];
    interimActual = "";
    btn.innerText = "🛑 TOCAR AL TERMINAR";
    btn.classList.add('btn-grabar');
    
    try {
        reconocimiento.start();
    } catch (e) {
        console.log("Aviso: El reconocimiento ya está en ejecución.");
    }
}

/**
 * Procesa resultados finales e intermedios para asegurar que ninguna letra se pierda
 */
reconocimiento.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        if (event.results[i].isFinal) {
            listaLetrasConfirmadas.push(transcript);
            interimActual = ""; // Limpiamos el interim al confirmarse la pieza
        } else {
            interimActual = transcript; // Almacenamos provisionalmente la letra "en el aire"
        }
    }
};

/**
 * Sistema Keep-Alive: Rescata la última letra detectada y reinicia el motor si el juego sigue activo
 */
reconocimiento.onend = () => {
    if (escuchando) {
        // RESCATE: Si el micro se cortó por silencio, guardamos el interim pendiente
        if (interimActual) {
            listaLetrasConfirmadas.push(interimActual);
            interimActual = "";
        }
        
        // Reinicio con delay de 100ms para evitar bloqueos del sistema operativo
        setTimeout(() => {
            if (escuchando) {
                try { reconocimiento.start(); } catch(e) {}
            }
        }, 100);
    }
};

/**
 * Finalización controlada: Asegura el rescate del último fragmento antes de evaluar
 */
function finalizarYEvaluar() {
    escuchando = false; 
    reconocimiento.stop();
    btn.classList.remove('btn-grabar');
    btn.innerText = "PROCESANDO...";

    if (interimActual) {
        listaLetrasConfirmadas.push(interimActual);
        interimActual = "";
    }

    setTimeout(() => {
        evaluarDeletreo(listaLetrasConfirmadas.join(" "));
    }, 600);
}

// Controlador de interacción
btn.addEventListener('click', () => {
    if (!escuchando) {
        txtResultado.innerText = "";
        pronunciarPalabra();
    } else {
        finalizarYEvaluar();
    }
});

// Gestión de fallos técnicos
reconocimiento.onerror = (event) => {
    if (event.error === 'no-speech') return;
    escuchando = false;
    btn.classList.remove('btn-grabar');
    btn.innerText = "REINTENTAR";
    txtEstado.innerText = "Error Micro: " + event.error;
};