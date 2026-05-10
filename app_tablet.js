const reconocimiento = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
reconocimiento.lang = 'en-US';
reconocimiento.continuous = true;
reconocimiento.interimResults = true; 

function iniciarGrabacion() {
    escuchando = true;
    listaLetrasConfirmadas = [];
    interimActual = "";
    btn.innerText = "🛑 TOCAR AL TERMINAR";
    btn.classList.add('btn-grabar');
    try { reconocimiento.start(); } catch(e) {}
}

reconocimiento.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim().toLowerCase();
        if (event.results[i].isFinal) {
            listaLetrasConfirmadas.push(transcript);
            interimActual = ""; 
        } else {
            interimActual = transcript;
        }
    }
    const visual = [...listaLetrasConfirmadas];
    if (interimActual) visual.push(interimActual);
    txtEstado.innerText = `Escuchando: ${visual.join(" ").toUpperCase()}`;
};

reconocimiento.onend = () => {
    if (escuchando) {
        if (interimActual) {
            listaLetrasConfirmadas.push(interimActual);
            interimActual = "";
        }
        setTimeout(() => {
            if (escuchando) { try { reconocimiento.start(); } catch(e) {} }
        }, 100);
    }
};

function finalizarYEvaluar() {
    escuchando = false;
    reconocimiento.stop();
    btn.classList.remove('btn-grabar');
    btn.innerText = "PROCESANDO...";
    if (interimActual) {
        listaLetrasConfirmadas.push(interimActual);
        interimActual = "";
    }
    setTimeout(() => {
        evaluarDeletreo(listaLetrasConfirmadas.join(" "));
    }, 600);
}

btn.addEventListener('click', () => {
    if (!escuchando) {
        txtResultado.innerText = "";
        pronunciarPalabra();
    } else {
        finalizarYEvaluar();
    }
});