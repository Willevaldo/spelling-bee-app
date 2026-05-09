const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.continuous = true;
reconocimiento.interimResults = false;

function iniciarGrabacion() {
    escuchando = true;
    listaLetrasConfirmadas = [];
    btn.innerText = "🛑 DETENER";
    btn.classList.add('btn-grabar');
    reconocimiento.start();
}

reconocimiento.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            listaLetrasConfirmadas.push(event.results[i][0].transcript.trim().toLowerCase());
        }
    }
    txtEstado.innerText = `Escuchando: ${listaLetrasConfirmadas.join(" ").toUpperCase()}`;
};

function finalizarYEvaluar() {
    escuchando = false;
    reconocimiento.stop();
    btn.classList.remove('btn-grabar');
    evaluarDeletreo(listaLetrasConfirmadas.join(" "));
}

btn.addEventListener('click', () => {
    if (!escuchando) { txtResultado.innerText = ""; pronunciarPalabra(); }
    else finalizarYEvaluar();
});