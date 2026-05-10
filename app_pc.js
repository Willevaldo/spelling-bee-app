const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.continuous = true;
reconocimiento.interimResults = false;

function iniciarGrabacion() {
    escuchando = true;
    listaLetrasConfirmadas = [];
    btn.innerText = "🛑 TOCAR AL TERMINAR";
    btn.classList.add('btn-grabar');
    reconocimiento.start();
}

reconocimiento.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            listaLetrasConfirmadas.push(event.results[i][0].transcript.trim().toLowerCase());
        }
    }
    const visual = listaLetrasConfirmadas.join(" ").toUpperCase();
    txtEstado.innerText = `Escuchando: ${visual}`;
};

function finalizarYEvaluar() {
    escuchando = false;
    reconocimiento.stop();
    btn.classList.remove('btn-grabar');
    btn.innerText = "PROCESANDO...";
    setTimeout(() => {
        evaluarDeletreo(listaLetrasConfirmadas.join(" "));
    }, 500);
}

btn.addEventListener('click', () => {
    if (!escuchando) {
        txtResultado.innerText = "";
        pronunciarPalabra();
    } else {
        finalizarYEvaluar();
    }
});