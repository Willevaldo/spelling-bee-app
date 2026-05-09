const mapaFonetico = { "see": "c", "sea": "c", "eye": "i", "tea": "t", "te": "t", "and": "n", "hay": "a" };
const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.continuous = true;
reconocimiento.interimResults = true; 

let interimActual = "";

function iniciarGrabacion() {
    escuchando = true;
    listaLetrasConfirmadas = [];
    interimActual = "";
    btn.innerText = "🛑 LISTO";
    btn.classList.add('btn-grabar');
    reconocimiento.start();
}

reconocimiento.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        if (event.results[i].isFinal) {
            // EVITAR DUPLICADOS: Solo agregamos si no es igual a lo último que entró
            if (listaLetrasConfirmadas[listaLetrasConfirmadas.length - 1] !== transcript) {
                listaLetrasConfirmadas.push(transcript);
            }
            interimActual = "";
        } else {
            interimActual = transcript;
        }
    }
    txtEstado.innerText = `Escuchando: ${listaLetrasConfirmadas.join(" ").toUpperCase()}...`;
};

reconocimiento.onend = () => {
    if (escuchando) {
        if (interimActual) { listaLetrasConfirmadas.push(interimActual); interimActual = ""; }
        setTimeout(() => { if (escuchando) reconocimiento.start(); }, 200);
    }
};

function finalizarYEvaluar() {
    escuchando = false;
    reconocimiento.stop();
    btn.classList.remove('btn-grabar');
    // Limpieza fonética antes de evaluar
    let final = listaLetrasConfirmadas.map(p => mapaFonetico[p] || p).join(" ");
    evaluarDeletreo(final);
}

btn.addEventListener('click', () => {
    if (!escuchando) { txtResultado.innerText = ""; pronunciarPalabra(); }
    else finalizarYEvaluar();
});