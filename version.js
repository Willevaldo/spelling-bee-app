/**
 * Control de Versión y Sincronización de Caché
 * Cambiar este número forzará a las tablets y PCs a descargar el nuevo código.
 */

const APP_VERSION = "5.1.0-DATASET-BUILDER";

console.log(`%c Spelling Bee Trainer %c v${APP_VERSION} `, 
            "background: #00796b; color: white; padding: 2px 5px; border-radius: 3px 0 0 3px;", 
            "background: #ff9800; color: white; padding: 2px 5px; border-radius: 0 3px 3px 0;");

// Esta variable la usa el index.html para mostrarla en la esquina inferior.
window.APP_VERSION = APP_VERSION;