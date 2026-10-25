# 🌾 Sin Espiga

Webapp para escanear el código de barras de un producto y saber, con un semáforo, si lleva gluten.

- 🟢 **Sin gluten**: no hay ingredientes con gluten
- 🟡 **Ojo**: puede contener trazas o lleva avena
- 🔴 **Contiene gluten**
- ⚪ **Sin datos**: el producto no está en la base de datos

Los datos vienen de [Open Food Facts](https://es.openfoodfacts.org) (licencia ODbL). Son colaborativos y pueden tener errores, así que el resultado es orientativo: revisa siempre la etiqueta.

## Estructura

```
SinEspiga/
├── index.html                 Estructura de la página
├── assets/                    Logo y favicon
├── css/
│   ├── tokens.css             Colores (claro/oscuro) y tipografías
│   ├── base.css               Layout general, cabecera, pestañas, pie
│   └── components/            Un archivo por pieza de la interfaz
│       ├── scanner.css
│       ├── result.css
│       ├── checker.css
│       └── history.css
└── js/
    ├── main.js                Punto de entrada: conecta eventos y módulos
    ├── config.js              Constantes: API, palabras clave, textos
    ├── core/
    │   └── analyzer.js        Lógica pura del semáforo (sin DOM ni red)
    ├── services/
    │   ├── openFoodFacts.js   Llamadas a la API y normalización de datos
    │   └── scanner.js         Cámara y lectura de códigos de barras
    ├── storage/
    │   └── history.js         Historial en localStorage
    └── ui/
        └── render.js          Todo lo que pinta HTML
```

La idea es que cada capa solo hable con la de al lado:
`main.js` → usa `core`, `services`, `storage` y `ui`, pero esas carpetas no se conocen entre ellas (todas leen de `config.js`).

## Probarla en local

Al usar módulos de JavaScript, **no funciona abriendo el archivo con doble clic**. Hay que servirla:

- En VS Code: instala la extensión **Live Server** → clic derecho en `index.html` → *Open with Live Server*.
- La cámara funciona en `localhost`; desde el móvil necesitas la versión publicada (https).

## Publicar

GitHub → *Settings* → *Pages* → rama `main`, carpeta `/ (root)` → *Save*.
