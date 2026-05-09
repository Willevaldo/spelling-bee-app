// Variables de control
let indiceActual = 0;

// Configuración del reconocimiento de voz
const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.interimResults = false;

// Referencias a los elementos del HTML
const btn = document.getElementById('accionBtn');
const img = document.getElementById('pistaImagen');
const txtEstado = document.getElementById('estado');
const txtResultado = document.getElementById('resultado');

// 1. Función para que la tablet hable
function pronunciarPalabra() {
    // Verificamos que aún existan palabras
    if (indiceActual >= bancoDePalabras.length) {
        txtEstado.innerText = "¡Felicidades! Completaste la lista.";
        btn.disabled = true;
        return;
    }

    const palabraObjetivo = bancoDePalabras[indiceActual].palabra;
    const mensaje = new SpeechSynthesisUtterance(palabraObjetivo);
    mensaje.lang = 'en-US';
    mensaje.rate = 0.8; // Un poco más lento para que se entienda el deletreo
    
    // Actualizar imagen y estado
    img.src = bancoDePalabras[indiceActual].imagen;
    img.style.display = 'inline-block';
    txtEstado.innerText = "Escuchando palabra...";
    
    // Hablar
    window.speechSynthesis.speak(mensaje);
    
    // Cuando termine de hablar, empezar a grabar
    mensaje.onend = () => {
        iniciarGrabacion();
    };
}

// 2. Función para iniciar el micrófono
function iniciarGrabacion() {
    btn.innerText = "🔴 GRABANDO... DELETREA";
    btn.classList.add('btn-grabar');
    try {
        reconocimiento.start();
    } catch (e) {
        console.log("El reconocimiento ya estaba encendido");
    }
}

// 3. Capturar el resultado del micrófono
reconocimiento.onresult = (event) => {
    // 1. Obtenemos lo que el niño dijo (ej: "Apple A P P L E Apple")
    const transcript = event.results[0][0].transcript.toLowerCase();
    const palabraCorrecta = bancoDePalabras[indiceActual].palabra.toLowerCase();
    
    // 2. Limpieza total: quitamos espacios y guiones
    // "apple a p p l e apple" -> "appleappleapple"
    const procesado = transcript.replace(/[\s-]/g, '');

    // 3. Evaluación flexible
    // Verificamos si la palabra correcta existe dentro de lo que el niño dijo.
    // Esto acepta tanto "apple" como "appleappleapple" o "apple a p p l e apple"
    const esCorrecto = procesado.includes(palabraCorrecta);

    btn.classList.remove('btn-grabar');

    if (esCorrecto) {
        txtResultado.innerText = "✅ ¡EXCELENTE!";
        txtResultado.style.color = "green";
        // Feedback visual de lo que entendió el sistema (opcional)
        txtEstado.innerText = `Dijiste: "${transcript}"`;
    } else {
        txtResultado.innerText = `❌ INTÉNTALO DE NUEVO`;
        txtResultado.style.color = "red";
        txtEstado.innerText = `Escuché: "${transcript}"`;
    }

    // Avanzar a la siguiente palabra
    indiceActual++;

    if (indiceActual < bancoDePalabras.length) {
        btn.innerText = "SIGUIENTE PALABRA";
    } else {
        btn.innerText = "🎉 ¡TERMINAMOS POR HOY!";
        btn.disabled = true;
    }
};

// Error en el micrófono
reconocimiento.onerror = (event) => {
    btn.classList.remove('btn-grabar');
    btn.innerText = "REINTENTAR";
    txtEstado.innerText = "Error de micrófono: " + event.error;
};

// 4. Evento del botón
btn.addEventListener('click', () => {
    txtResultado.innerText = "";
    pronunciarPalabra();
});

window.addEventListener('load', () => {
    const display = document.getElementById('version-display');
    if (display && typeof APP_VERSION !== 'undefined') {
        display.innerText = `Versión: ${APP_VERSION}`;
    } else {
        console.error("No se pudo cargar la versión. Verifica version.js");
    }
});