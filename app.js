// Variables de control de estado y navegación
let indiceActual = 0;
let escuchando = false; 
let transcripcionAcumulada = "";
let puntaje = 0;

// Variables para el sistema de repaso de palabras fallidas
let listaErrores = [];
let modoRepaso = false;

// Referencias a los elementos de la interfaz gráfica
const btn = document.getElementById('accionBtn');
const img = document.getElementById('pistaImagen');
const txtEstado = document.getElementById('estado');
const txtResultado = document.getElementById('resultado');
const txtPuntaje = document.getElementById('puntaje');

// CAMBIO: NUEVAS REFERENCIAS PARA GESTIONAR EL MENU Y EL JUEGO
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
reconocimiento.interimResults = true;

// CAMBIO: FUNCIÓN PARA GENERAR EL MENÚ CON NUEVA ESTRUCTURA CSS
function generarMenu() {
    listaGradosUI.innerHTML = '';

    for (let grado in bibliotecaPalabras) {
        const divGrado = document.createElement('div');
        divGrado.className = 'contenedor-grado';
        
        // Botón principal del grado
        const btnTodoGrado = document.createElement('button');
        btnTodoGrado.className = 'btn-grado-completo';
        btnTodoGrado.innerText = `▶️ Practicar Todo ${grado}`;
        btnTodoGrado.onclick = () => cargarNivel(grado, null);
        divGrado.appendChild(btnTodoGrado);

        // Contenedor flex para alinear los tests horizontalmente
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

// CAMBIO: LOGICA DE FILTRADO Y CARGA DE PALABRAS SEGÚN SELECCIÓN
function cargarNivel(grado, test) {
    // Vaciamos el banco actual (usando length=0 para respetar si es const)
    bancoDePalabras.length = 0; 

    if (test) {
        // SELECCIÓN DE TEST ESPECÍFICO
        bancoDePalabras.push(...bibliotecaPalabras[grado][test]);
    } else {
        // SELECCIÓN DE GRADO COMPLETO (COMBINA TODOS LOS TESTS)
        for (let t in bibliotecaPalabras[grado]) {
            bancoDePalabras.push(...bibliotecaPalabras[grado][t]);
        }
    }

    // ALEATORIZACIÓN DE LA LISTA RESULTANTE
    bancoDePalabras.sort(() => Math.random() - 0.5);

    // CAMBIO DE VISTA: OCULTAR MENÚ Y MOSTRAR JUEGO
    menuUI.style.display = 'none';
    juegoUI.style.display = 'block';
    scoreUI.style.display = 'block';
}

// Gestiona la reproducción de voz de la palabra actual
function pronunciarPalabra() {
    if (indiceActual >= bancoDePalabras.length) return;

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
};

// Lógica de validación con visualización de transcripción filtrada
function evaluarDeletreo(transcript) {
    const objetoActual = bancoDePalabras[indiceActual];
    const palabraCorrecta = objetoActual.palabra.toLowerCase();
    
    let piezas = transcript.toLowerCase().split(/\s+/);

    // CAMBIO: NUEVA LÓGICA DE EXTRACCIÓN (Adiós a "Pelar la fruta")
    // 2. Filtramos la lista para quedarnos ÚNICAMENTE con los elementos que son 1 sola letra
    let letrasDeletreadas = piezas.filter(pieza => pieza.length === 1);

    // 3. Unimos las letras que sobrevivieron al filtro
    const deletreoFinal = letrasDeletreadas.join('');
    
    // MUESTRA SOLO LAS LETRAS EXTRAÍDAS (Para que sepas qué calificó realmente)
    const deletreoVisible = letrasDeletreadas.join(' ').toUpperCase();
    
    // Si el niño no deletreó letra por letra (ej. dijo "dog" de golpe sin separar)
    // letrasDeletreadas estará vacío, así que evitamos que muestre un texto en blanco confuso.
    if (deletreoFinal === "") {
         txtEstado.innerText = `Escuché una palabra completa, pero no el deletreo.`;
    } else {
         txtEstado.innerText = `Escuché: "${deletreoVisible}"`;
    }

    // 4. Calificamos la palabra armada con las letras
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

// Gestiona el paso entre palabras y activa la fase de repaso de errores
function avanzarSiguiente() {
    indiceActual++;

    // VERIFICAMOS SI TERMINAMOS LA LISTA ACTUAL
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

// Configura el banco de palabras para repetir solo las que se fallaron
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

// CAMBIO: INICIALIZACIÓN DE LA VERSIÓN Y GENERACIÓN DEL MENÚ AL CARGAR
window.addEventListener('load', () => {
    generarMenu(); 
    const display = document.getElementById('version-display');
    if (display && typeof APP_VERSION !== 'undefined') {
        display.innerText = `Versión: ${APP_VERSION}`;
    }
});