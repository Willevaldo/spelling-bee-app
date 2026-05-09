import os
import requests
import time
import random
import re
from ddgs import DDGS # CAMBIO: Nombre actualizado de la librería

# Tu lista completa de palabras
palabras_raw = [
    "cake", "candy", "carrot", "banana", "chocolate", "milk", "water", "burger", 
    "lunch", "kiwi", "lemon", "pie", "mango", "apple", "arm", "leg", "nose", 
    "hand", "mouth", "head", "eye", "animal", "bear", "bee", "bird", "cat", 
    "chicken", "cow", "dog", "fish", "pet", "frog", "tiger", "lizard", "hippo", 
    "bag", "hat", "shoe", "skirt", "sock", "boots", "dress", "red", "pink", 
    "blue", "black", "orange", "yellow", "brown", "girl", "mum", "sister", 
    "family", "brother", "baby", "dad", "door", "sofa", "bed", "house", "lamp", 
    "mat", "mirror", "Sam", "eraser", "letter", "book", "class", "color", "crayon", 
    "glue", "mouse (computer)", "number", "page", "pen", "pencil", "school", "ruler",
    "bookcase", "cupboard", "dining room", "living room", "television", "TV", "wall", 
    "window", "rug", "paper", "Eva", "Grace", "Hugo", "Jill", "May", "Nick", "Pat", 
    "Sue", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", 
    "nineteen", "twenty", "here", "in front of", "playground", "store", "street", 
    "bookshop", "alphabet", "board", "classroom", "English", "keyboard", "rubber", 
    "lesson", "jellyfish", "mouse (mice)", "polar bear", "sheep", "snake", "spider", 
    "tail", "zebra", "zoo", "foot (feet)", "smile", "baseball cap", "handbag", 
    "shorts (clothes)", "trousers", "T-shirt", "wear", "color (colour)", "purple", 
    "white", "child (children)", "classmate", "friend", "grandfather", "grandmother", 
    "man (men)", "old", "woman (women)", "young", "bean", "bread", "breakfast", 
    "dinner", "grapes", "ice cream", "juice", "meat", "meatballs", "pineapple", 
    "pea", "sausage", "sweets", "apartment", "flat", "chair", "bathroom", "line", 
    "badminton", "bounce", "drawing", "fishing", "football", "skateboard", 
    "skateboarding", "table tennis", "take a picture", "tennis racket", "afternoon", 
    "evening", "birthday", "alien", "boardgame", "helicopter", "lorry (truck)", 
    "motorbike", "teacher", "sea", "beautiful", "double", "fantastic", "long", 
    "new", "scary", "silly", "nice", "a lot of", "lots of", "these", "those", 
    "again", "now", "really", "about", "of", "but"
]

def descargar_imagenes():
    if not os.path.exists('img'):
        os.makedirs('img')

    # Usamos DDGS() directamente
    ddgs = DDGS()

    for p in palabras_raw:
        # Limpieza para búsqueda y para nombre de archivo
        termino_busqueda = p.replace("(", "").replace(")", "")
        nombre_archivo = re.sub(r'\s*\(.*?\)\s*', '_', p).replace(" ", "_").strip("_")
        
        # Saltamos si la imagen ya existe (por si lo vuelves a correr)
        if os.path.exists(f'img/{nombre_archivo}.jpg'):
            continue

        print(f"Buscando: {termino_busqueda}...")
        # CAMBIO: Refinamos el query con términos de exclusión y precisión
        # Añadimos "single object" e "individual" al principio.
        # Añadimos "-set -collection -grid -group" al final para evitar hojas repetidas.
        query = f"single individual {termino_busqueda} isolated colorful cartoon clipart for kids white background -set -collection -grid -group -sheet"

        try:
            # Buscamos la imagen
            resultados = list(ddgs.images(query, max_results=1))
            
            if resultados:
                url = resultados[0]['image']
                img_data = requests.get(url, timeout=10).content
                with open(f'img/{nombre_archivo}.jpg', 'wb') as handler:
                    handler.write(img_data)
                print(f"  ✅ Guardado: {nombre_archivo}.jpg")
                
                # PAUSA CRÍTICA: Esperamos entre 2 y 5 segundos para no ser bloqueados
                time.sleep(random.uniform(2, 5))
            else:
                print(f"  ⚠️ No se encontró nada para {p}")

        except Exception as e:
            print(f"  ❌ Error con {p}: {e}")
            # Si nos bloquean, esperamos un poco más antes de intentar la siguiente
            if "403" in str(e):
                print("  🛑 Ratelimit detectado. Esperando 20 segundos para enfriar...")
                time.sleep(20)

if __name__ == "__main__":
    descargar_imagenes()