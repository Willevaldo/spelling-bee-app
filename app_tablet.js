/**
 * Motor de Control para Tablets - VERSIÓN SEGURA (Sin IA)
 * Objetivo: Deshabilitar el procesamiento de voz local para ahorrar recursos 
 * y forzar el uso del nuevo sistema de escritura nivelada.
 */

// Referencias a la interfaz compartida
const statusLabel = document.getElementById('ai-status');
const actionBtn = document.getElementById('accionBtn');

/**
 * Inicialización del sistema para dispositivos móviles/tablets
 */
function initTabletMode() {
    console.log("%c [SISTEMA] Modo Tablet detectado. Bloqueando descarga de modelos pesados.", "color: orange; font-weight: bold;");
    
    if (statusLabel) {
        statusLabel.innerText = "Modo Escritura Activo ⌨️";
        statusLabel.style.color = "#00796b";
    }

    // El botón principal se gestionará desde core.js para el modo escritura
    // pero nos aseguramos de que no intente llamar a la IA de voz.
    if (actionBtn) {
        actionBtn.disabled = false;
        actionBtn.innerText = "ESPERANDO MODO...";
    }
}

/**
 * En tablet, si por algún motivo se llegara a disparar un evento de audio,
 * lo ignoramos o notificamos que no hay procesador local disponible.
 */
window.addEventListener('audioReady', () => {
    console.warn("[ADVERTENCIA] Intento de procesamiento de voz en Tablet. Operación bloqueada por configuración.");
    
    const estadoUI = document.getElementById('estado');
    if (estadoUI) {
        estadoUI.innerText = "⚠️ El modo voz no está disponible en este dispositivo.";
    }
    
    // Devolvemos el control al botón para no bloquear la app
    if (actionBtn) {
        actionBtn.disabled = false;
        actionBtn.innerText = "VOLVER A INTENTAR";
    }
});

/**
 * Mantenemos la estructura de eventos por consistencia con core.js
 */
window.addEventListener('IA_Library_Ready', () => {
    initTabletMode();
});

// Lanzamos la inicialización inmediatamente si la librería no es necesaria
initTabletMode();

/**
 * NOTA PARA ENTRENAMIENTO:
 * Aunque el procesamiento de IA está bloqueado en Tablet para optimizar, 
 * el sistema de grabación de core.js podría seguir capturando clips 
 * si en el futuro decides habilitar la recolección de datos "muda" en tablets.
 */