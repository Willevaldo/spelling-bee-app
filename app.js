// Variables de control de estado y navegación
let indiceActual = 0;
let escuchando = false; 
let transcripcionAcumulada = "";
let puntaje = 0;

// NUEVAS VARIABLES PARA EL SISTEMA DE REPASO
let listaErrores = [];
let modoRepaso = false;

// Configuración de sonidos de retroalimentación
const sonidoExito = new Audio('./sounds/exito.mp3');
const sonidoError = new Audio('./sounds/error.mp3');
sonidoExito.load();
sonidoError.load();

// MEZCLA ALEATORIA INICIAL DEL BANCO DE PALABRAS
bancoDePalabras.sort(() => Math.random() - 0.5);

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
const txtPuntaje = document.getElementById('puntaje');

// Gestiona la reproducción de voz de la palabra actual
function pronunciarPalabra() {
    if (indiceActual >= bancoDePalabras.length) {
        // CAMBIO: LA LOGICA DE FINALIZACION SE MOVIÓ A AVANZARSIGUIENTE
        return;
    }

    const palabraObjetivo = bancoDePalabras[indiceActual].palabra;
    const mensaje = new SpeechSynthesisUtterance(palabraObjetivo);
    mensaje.lang = 'en-US';
    mensaje.rate = 0.8; 
    
    img.src = bancoDePalabras[indiceActual].imagen;
    img.style.display = 'inline-block';
    txtEstado.innerText = modoRepaso ? "Repasando..." : "Escuchando...";
    
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

// Procesa el audio capturado internamente
reconocimiento.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            transcripcionAcumulada += event.results[i][0].transcript + " ";
        }
    }
    // NOTA: SE MANTIENE EL SILENCIO VISUAL DURANTE LA GRABACION
};

// Lógica de validación con visualización de transcripción post-grabación
function evaluarDeletreo(transcript) {
    const objetoActual = bancoDePalabras[indiceActual];
    const palabraCorrecta = objetoActual.palabra.toLowerCase();
    
    let piezas = transcript.toLowerCase().split(/\s+/);

    // Lógica "Pelar la fruta"
    if (piezas.length > 1 && piezas[0] === palabraCorrecta) piezas.shift();
    if (piezas.length > 0 && piezas[piezas.length - 1] === palabraCorrecta) piezas.pop();

    const deletreoFinal = piezas.join('');
    
    // CAMBIO: AHORA MOSTRAMOS SOLO LAS PIEZAS RESULTANTES (LA FRUTA PELADA)
    // Usamos join(' ') para separarlo por espacios y lo pasamos a mayúsculas
    const deletreoVisible = piezas.join(' ').toUpperCase();
    txtEstado.innerText = `Escuché: "${deletreoVisible}"`;

    if (deletreoFinal === palabraCorrecta) {
        txtResultado.innerText = "✅ ¡EXCELENTE!";
        txtResultado.style.color = "green";
        sonidoExito.play();
        
        puntaje += 10;
        txtPuntaje.innerText = puntaje;
        
        avanzarSiguiente();
    } else {
        // SI FALLA Y NO ESTAMOS EN REPASO, GUARDAMOS LA PALABRA PARA DESPUES
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
        
        // CAMBIO: REDUCIMOS LA VELOCIDAD (Antes 0.6, ahora 0.4 o 0.3)
        deletreoAyuda.rate = 0.4; 
        
        window.speechSynthesis.speak(deletreoAyuda);

        // Calculamos 800ms por cada letra para que el niño termine de oír antes de seguir
        const tiempoEspera = Math.max(3500, palabraCorrecta.length * 800);
        setTimeout(() => {
            btn.disabled = false;
            avanzarSiguiente();
        }, tiempoEspera);
    }
}

// Gestiona el paso entre palabras y activa la fase de repaso si existen errores
function avanzarSiguiente() {
    indiceActual++;

    // VERIFICAMOS SI TERMINAMOS LA LISTA ACTUAL
    if (indiceActual < bancoDePalabras.length) {
        btn.innerText = modoRepaso ? "SIGUIENTE (REPASO)" : "SIGUIENTE PALABRA";
    } else {
        // SI TERMINAMOS LA LISTA INICIAL Y HAY ERRORES, INICIAMOS REPASO
        if (!modoRepaso && listaErrores.length > 0) {
            activarModoRepaso();
        } else {
            // SI YA ESTABAMOS EN REPASO O NO HUBO ERRORES, TERMINAMOS
            btn.innerText = "🎉 JUEGO TERMINADO";
            btn.disabled = true;
            txtEstado.innerText = `Puntaje Final: ${puntaje}`;
            img.style.display = 'none';
        }
    }
}

// NUEVA FUNCION CORREGIDA: PREPARA LA SEGUNDA VUELTA SIN ROMPER LA VARIABLE CONST
function activarModoRepaso() {
    modoRepaso = true;
    
    // CORRECCION: En lugar de reasignar (que causa error con 'const'),
    // vaciamos el arreglo actual y empujamos las palabras que fallaron.
    bancoDePalabras.length = 0; 
    bancoDePalabras.push(...listaErrores);
    
    // Volvemos a desordenar para que el repaso también sea aleatorio
    bancoDePalabras.sort(() => Math.random() - 0.5);
    
    indiceActual = 0;
    
    txtEstado.innerText = "¡VAMOS A REPASAR LAS QUE FALLARON!";
    btn.innerText = "INICIAR REPASO";
    txtResultado.innerText = "Segunda oportunidad";
    txtResultado.style.color = "#007bff";
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