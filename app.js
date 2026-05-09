// Variables de control de estado y navegación
let indiceActual = 0;
let escuchando = false; 
let transcripcionAcumulada = "";
// NUEVO: CONTROL DE PUNTAJE
let puntaje = 0;

// Configuración de sonidos de retroalimentación
const sonidoExito = new Audio('./sounds/exito.mp3');
const sonidoError = new Audio('./sounds/error.mp3');
sonidoExito.load();
sonidoError.load();

// MEZCLA ALEATORIA: DESORDENA EL BANCO DE PALABRAS AL INICIAR
bancoDePalabras.sort(() => Math.random() - 0.5);

// Configuración del motor de reconocimiento de voz
const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.continuous = true;
// SE MANTIENE TRUE INTERNAMENTE PERO YA NO SE MUESTRA AL USUARIO
reconocimiento.interimResults = true;

// Referencias a los elementos de la interfaz gráfica
const btn = document.getElementById('accionBtn');
const img = document.getElementById('pistaImagen');
const txtEstado = document.getElementById('estado');
const txtResultado = document.getElementById('resultado');
const txtPuntaje = document.getElementById('puntaje');

// Gestiona la reproducción de voz de la palabra actual
function pronunciarPalabra() {
    if (indiceActual >= bancoDePalabras.length) {
        txtEstado.innerText = "¡Juego terminado!";
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

// Procesa el audio capturado (MODIFICADO: YA NO MUESTRA EL TEXTO AL NIÑO)
reconocimiento.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            transcripcionAcumulada += event.results[i][0].transcript + " ";
        }
    }
    // COMENTADO O ELIMINADO PARA NO MOSTRAR EL DELETREO EN PANTALLA
    // txtEstado.innerText = ... 
};

// Lógica de validación de deletreo con sistema de ayuda y puntaje
function evaluarDeletreo(transcript) {
    const palabraCorrecta = bancoDePalabras[indiceActual].palabra.toLowerCase();
    let piezas = transcript.toLowerCase().split(/\s+/);

    if (piezas.length > 1 && piezas[0] === palabraCorrecta) piezas.shift();
    if (piezas.length > 0 && piezas[piezas.length - 1] === palabraCorrecta) piezas.pop();

    const deletreoFinal = piezas.join('');

    if (deletreoFinal === palabraCorrecta) {
        // ACCION EN CASO DE EXITO
        txtResultado.innerText = "✅ ¡EXCELENTE!";
        txtResultado.style.color = "green";
        sonidoExito.play();
        
        // ACTUALIZACION DE PUNTAJE
        puntaje += 10;
        txtPuntaje.innerText = puntaje;
        
        avanzarSiguiente();
    } else {
        txtResultado.innerText = `❌ LA PALABRA ERA: ${palabraCorrecta.toUpperCase()}`;
        txtResultado.style.color = "red";
        sonidoError.play();
        
        btn.disabled = true;
        btn.innerText = "MIRA Y ESCUCHA...";

        // AYUDA AUDITIVA: DELETREAR LA PALABRA CORRECTA
        const deletreoAyuda = new SpeechSynthesisUtterance();
        
        // CAMBIO: USAMOS COMA PARA FORZAR PAUSAS ENTRE LETRAS
        deletreoAyuda.text = palabraCorrecta.split('').join(', '); 
        
        deletreoAyuda.lang = 'en-US';
        
        // CAMBIO: REDUCIMOS LA VELOCIDAD (Antes 0.6, ahora 0.4 o 0.3)
        deletreoAyuda.rate = 0.4; 
        
        window.speechSynthesis.speak(deletreoAyuda);

        // AJUSTE: AUMENTAMOS EL TIEMPO DE ESPERA SI LA PALABRA ES LARGA
        // Calculamos 800ms por cada letra para que el niño termine de oír antes de seguir
        const tiempoEspera = Math.max(3500, palabraCorrecta.length * 800);

        setTimeout(() => {
            btn.disabled = false;
            avanzarSiguiente();
        }, tiempoEspera);
    }
}

// Gestiona el paso a la siguiente palabra o fin del juego
function avanzarSiguiente() {
    indiceActual++;
    if (indiceActual < bancoDePalabras.length) {
        btn.innerText = "SIGUIENTE PALABRA";
    } else {
        btn.innerText = "🎉 JUEGO TERMINADO";
        btn.disabled = true;
        txtEstado.innerText = `Puntaje Final: ${puntaje}`;
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