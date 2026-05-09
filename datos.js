// Estructura de datos organizada por Grado y Test
const bibliotecaPalabras = {
    "1st Grade": {
        "Test 1": [
            { palabra: "apple", imagen: "./img/apple.png" },
            { palabra: "dog", imagen: "./img/dog.png" }
        ],
        "Test 2": [
            { palabra: "science", imagen: "./img/science.png" }
        ]
    },
    "2nd Grade": {
        "Test 1": [
            { palabra: "robot", imagen: "./img/robot.png" }
        ]
    }
};

// Variable global que usará el juego (se llena al elegir en el menú)
let bancoDePalabras = [];