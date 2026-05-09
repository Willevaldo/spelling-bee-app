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
    const transcript = event.results[0][0].transcript.toLowerCase();
    const palabraCorrecta = bancoDePalabras[indiceActual].palabra.toLowerCase();
    
    // 1. Convertimos el audio en una lista de palabras/letras
    // "robot r o n e o robot" -> ["robot", "r", "o", "n", "e", "o", "robot"]
    let piezas = transcript.split(/\s+/);

    // 2. Lógica de "Pelar": Si el niño dijo la palabra al inicio y al final, las removemos
    // Esto nos deja solo con el deletreo central.
    if (piezas.length > 1 && piezas[0] === palabraCorrecta) {
        piezas.shift(); // Quita la primera palabra
    }
    if (piezas.length > 0 && piezas[piezas.length - 1] === palabraCorrecta) {
        piezas.pop(); // Quita la última palabra
    }

    // 3. Unión y Validación
    // Si el deletreo fue "r o b o t", al unirlo da "robot".
    // Si el deletreo fue "r o n e o", al unirlo da "roneo".
    // Si el niño no deletreó y solo dijo "robot robot robot", al pelar queda "robot".
    const deletreoFinal = piezas.join('');

    btn.classList.remove('btn-grabar');

    // Comprobación estricta: lo que quedó debe ser igual a la palabra
    if (deletreoFinal === palabraCorrecta) {
        txtResultado.innerText = "✅ ¡EXCELENTE!";
        txtResultado.style.color = "green";
        txtEstado.innerText = `Perfecto: "${transcript}"`;
    } else {
        txtResultado.innerText = `❌ ERROR EN EL DELETREO`;
        txtResultado.style.color = "red";
        // Aquí le mostramos qué fue lo que falló en el centro
        txtEstado.innerText = `Dijiste "${deletreoFinal}" en lugar de "${palabraCorrecta}"`;
    }

    // Avanzar índice y actualizar botón (igual que antes)
    indiceActual++;
    if (indiceActual < bancoDePalabras.length) {
        btn.innerText = "SIGUIENTE PALABRA";
    } else {
        btn.innerText = "🎉 JUEGO TERMINADO";
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