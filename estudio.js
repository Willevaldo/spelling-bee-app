document.addEventListener('DOMContentLoaded', () => {
    
    // Verificación técnica de carga del archivo de datos
    if (typeof guionGrabacion === 'undefined') {
        alert("Error: El archivo dataset.js no se ha cargado. Verifica la ruta.");
        return;
    }

    // --- VARIABLES DE ESTADO ---
    let locutorActual = "";
    let colaTareas = [];
    let indiceTarea = 0;
    let estadoGrabacion = "INACTIVO"; 
    let mediaRecorder;
    let audioBlobs = [];
    let ultimoBlob = null;

    // --- REFERENCIAS UI ---
    const ui = {
        config: document.getElementById('pantalla-configuracion'),
        estudio: document.getElementById('pantalla-estudio'),
        selectNino: document.getElementById('select-nino'),
        selectBloque: document.getElementById('select-bloque'),
        selectPalabra: document.getElementById('select-palabra'),
        btnIniciar: document.getElementById('btn-iniciar-sesion'),
        lblPalabra: document.getElementById('palabra-display'),
        lblCodigoActivo: document.getElementById('codigo-activo-display'),
        lblTev: document.getElementById('texto-tev'),
        btnMain: document.getElementById('btn-accion-principal'),
        btnRegrabar: document.getElementById('btn-regrabar')
    };

    // Inicialización del listado de palabras desde el conjunto de datos
    guionGrabacion.forEach((item, index) => {
        let opt = document.createElement('option');
        opt.value = index;
        opt.text = `${item.id + 1}. ${item.palabra}`;
        ui.selectPalabra.appendChild(opt);
    });

    // --- GENERACIÓN DE LA COLA AGRUPADA ---
    ui.btnIniciar.onclick = () => {
        locutorActual = ui.selectNino.value;
        const indicePalabraInicio = parseInt(ui.selectPalabra.value);
        const indiceBloqueInicio = parseInt(ui.selectBloque.value);

        // 1. Extraer los 4 códigos TEV asignados a este niño específico
        const tevsDelNino = guionGrabacion[0][locutorActual].split('-').map(t => t.trim());

        // 2. Construir la Cola de Tareas: Agrupada primero por instrucción (TEV), luego por palabra
        colaTareas = [];
        tevsDelNino.forEach(codigoTev => {
            guionGrabacion.forEach((item) => {
                colaTareas.push({
                    palabra: item.palabra,
                    tev: codigoTev
                });
            });
        });

        // 3. Calcular el punto exacto de reanudación
        const offsetBloque = indiceBloqueInicio * guionGrabacion.length;
        indiceTarea = offsetBloque + indicePalabraInicio;
        
        ui.config.style.display = 'none';
        ui.estudio.style.display = 'block';
        cargarTareaActual();
    };

    function cargarTareaActual() {
        if (indiceTarea >= colaTareas.length) {
            alert("¡Dataset Completado para este locutor!");
            location.reload();
            return;
        }

        const tarea = colaTareas[indiceTarea];
        ui.lblPalabra.innerText = tarea.palabra;
        prepararInterfazInactiva(tarea.tev);
    }

    function prepararInterfazInactiva(codigoActual) {
        estadoGrabacion = "INACTIVO";
        ui.lblCodigoActivo.innerText = `CÓDIGO: ${codigoActual}`;
        ui.lblTev.innerHTML = interpretarTEV(codigoActual);
        ui.btnMain.innerText = "▶️ REPRODUCIR Y GRABAR";
        ui.btnMain.style.background = "#007bff";
        ui.btnMain.disabled = false;
        ui.btnRegrabar.style.display = 'none';
    }

    // --- DECODIFICADOR DE INSTRUCCIONES TEV ---
    function interpretarTEV(codigo) {
        const T = {
            "N": "<strong>Velocidad Normal (Fluido):</strong> Pronunciar el deletreo de forma corrida y natural.",
            "L": "<strong>Deletreo Lento (Pausas largas):</strong> Introducir una pausa de 1 segundo entre cada letra."
        };
        const E = {
            "P": "<strong>Tono Plano (Robot/Lectura):</strong> Mantener una entonación lineal y uniforme.",
            "I": "<strong>Tono Ascendente (Pregunta?):</strong> Elevar la curva de voz al final del deletreo."
        };
        const V = {
            "N": "<strong>Volumen Normal:</strong> Utilizar la intensidad de una conversación cotidiana.",
            "F": "<strong>Voz Fuerte (Proyectada):</strong> Incrementar la presión acústica sin llegar a gritar.",
            "S": "<strong>Voz Suave (Susurro):</strong> Reducir la intensidad al mínimo, gesticulando bien cada letra."
        };
        
        if (!codigo || codigo.length !== 3) return "<li>Error de Código</li>";
        
        return `
            <ul style="text-align: left; display: inline-block; margin: 0 auto; list-style-type: disc; font-size: 1.3rem; line-height: 2rem;">
                <li>${T[codigo[0]]}</li>
                <li>${E[codigo[1]]}</li>
                <li>${V[codigo[2]]}</li>
            </ul>
        `;
    }

    // --- CONTROLADOR CENTRAL DE LA MÁQUINA DE ESTADOS ---
    ui.btnMain.onclick = async () => {
        if (estadoGrabacion === "INACTIVO") {
            reproducirVoz();
        } 
        else if (estadoGrabacion === "GRABANDO") {
            detenerGrabacion();
        } 
        else if (estadoGrabacion === "REVISANDO") {
            guardarYavanzar();
        }
    };

    ui.btnRegrabar.onclick = () => {
        ultimoBlob = null; 
        const tarea = colaTareas[indiceTarea];
        prepararInterfazInactiva(tarea.tev); 
    };

    function reproducirVoz() {
        ui.btnMain.disabled = true;
        ui.btnMain.innerText = "🔊 ESCUCHANDO...";
        ui.btnMain.style.background = "#6c757d";
        
        const texto = colaTareas[indiceTarea].palabra;
        const msg = new SpeechSynthesisUtterance(texto);
        msg.lang = 'en-US';
        
        msg.onend = () => iniciarGrabacion();
        window.speechSynthesis.speak(msg);
    }

    async function iniciarGrabacion() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioBlobs = [];
            
            mediaRecorder.ondataavailable = e => audioBlobs.push(e.data);
            mediaRecorder.onstop = () => {
                ultimoBlob = new Blob(audioBlobs, { type: 'audio/webm' });
            };
            
            mediaRecorder.start();
            estadoGrabacion = "GRABANDO";
            ui.btnMain.disabled = false;
            ui.btnMain.innerText = "🛑 TERMINAR DE GRABAR";
            ui.btnMain.style.background = "#dc3545"; 
            
        } catch (err) {
            alert("Error crítico: No se pudo acceder al micrófono. Verifica permisos.");
            const tarea = colaTareas[indiceTarea];
            prepararInterfazInactiva(tarea.tev);
        }
    }

    function detenerGrabacion() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(t => t.stop()); 
            
            estadoGrabacion = "REVISANDO";
            ui.btnMain.innerText = "💾 GUARDAR Y SIGUIENTE";
            ui.btnMain.style.background = "#28a745"; 
            ui.btnRegrabar.style.display = 'block'; 
        }
    }

    function guardarYavanzar() {
        if (!ultimoBlob) return;

        const tarea = colaTareas[indiceTarea];
        const nombreArchivo = `${locutorActual}_${tarea.palabra}_${tarea.tev}.webm`;
        
        const url = URL.createObjectURL(ultimoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);

        indiceTarea++;
        cargarTareaActual();
    }
});