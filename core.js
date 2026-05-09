// VARIABLES GLOBALES COMPARTIDAS
let indiceActual = 0;
let escuchando = false; 
let puntaje = 0;
let listaErrores = [];
let modoRepaso = false;
let listaLetrasConfirmadas = [];

// REFERENCIAS UI
const btn = document.getElementById('accionBtn');
const img = document.getElementById('pistaImagen');
const txtEstado = document.getElementById('estado');
const txtResultado = document.getElementById('resultado');
const txtPuntaje = document.getElementById('puntaje');
const menuUI = document.getElementById('menu-inicial');
const juegoUI = document.getElementById('canvas-app');
const scoreUI = document.getElementById('score-container');
const listaGradosUI = document.getElementById('lista-grados');

// SONIDOS
const sonidoExito = new Audio('./sounds/exito.mp3');
const sonidoError = new Audio('./sounds/error.mp3');

// LÓGICA DE JUEGO (Menú, Niveles, Pronunciación)
function generarMenu() {
    listaGradosUI.innerHTML = '';
    for (let grado in bibliotecaPalabras) {
        const divGrado = document.createElement('div');
        divGrado.className = 'contenedor-grado';
        const btnTodo = document.createElement('button');
        btnTodo.className = 'btn-grado-completo';
        btnTodo.innerText = `▶️ Practicar Todo ${grado}`;
        btnTodo.onclick = () => cargarNivel(grado, null);
        divGrado.appendChild(btnTodo);
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

function cargarNivel(grado, test) {
    bancoDePalabras.length = 0; 
    if (test) bancoDePalabras.push(...bibliotecaPalabras[grado][test]);
    else {
        for (let t in bibliotecaPalabras[grado]) bancoDePalabras.push(...bibliotecaPalabras[grado][t]);
    }
    bancoDePalabras.sort(() => Math.random() - 0.5);
    menuUI.style.display = 'none';
    juegoUI.style.display = 'block';
    scoreUI.style.display = 'block';
}

function pronunciarPalabra() {
    if (indiceActual >= bancoDePalabras.length) return;
    let palabra = bancoDePalabras[indiceActual].palabra;
    const hablar = palabra.replace(/\s*\(.*?\)\s*/g, '').trim();
    const mensaje = new SpeechSynthesisUtterance(hablar);
    mensaje.lang = 'en-US';
    mensaje.rate = 0.8; 
    const imgFile = palabra.replace(/\s*\(.*?\)\s*/g, '_').replace(/\s+/g, '_').trim('_');
    img.src = `./img/${imgFile}.jpg`;
    img.style.display = 'inline-block';
    txtEstado.innerText = "Preparando micrófono...";
    window.speechSynthesis.speak(mensaje);
    mensaje.onend = () => iniciarGrabacion();
}

function avanzarSiguiente() {
    indiceActual++;
    if (indiceActual < bancoDePalabras.length) {
        btn.innerText = modoRepaso ? "SIGUIENTE (REPASO)" : "SIGUIENTE PALABRA";
    } else {
        if (!modoRepaso && listaErrores.length > 0) activarModoRepaso();
        else {
            btn.innerText = "🎉 JUEGO TERMINADO";
            btn.disabled = true;
            img.style.display = 'none';
        }
    }
}

function activarModoRepaso() {
    modoRepaso = true;
    bancoDePalabras.length = 0; 
    bancoDePalabras.push(...listaErrores);
    bancoDePalabras.sort(() => Math.random() - 0.5);
    indiceActual = 0;
    txtEstado.innerText = "¡VAMOS A REPASAR!";
    btn.innerText = "INICIAR REPASO";
}

// INICIALIZACIÓN
window.addEventListener('load', () => {
    generarMenu();
    if (typeof APP_VERSION !== 'undefined') document.getElementById('version-display').innerText = `Versión: ${APP_VERSION}`;
});