//app.js
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
    const captado = event.results[0][0].transcript.toLowerCase().replace(/\s+/g, '');
    const correcta = bancoDePalabras[indiceActual].palabra.toLowerCase();
    
    btn.classList.remove('btn-grabar');

    if (captado === correcta) {
        txtResultado.innerText = "✅ ¡CORRECTO!";
        txtResultado.style.color = "green";
    } else {
        txtResultado.innerText = `❌ ERROR: Entendí "${captado}"`;
        txtResultado.style.color = "red";
    }
    
    // Avanzar a la siguiente palabra
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