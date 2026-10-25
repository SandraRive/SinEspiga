// Configuración y datos fijos de la app. Si algo cambia (API, palabras clave…), se toca solo aquí.

export const OFF_API = "https://world.openfoodfacts.org/api/v2/product/";

export const OFF_FIELDS = [
  "product_name", "product_name_es", "brands",
  "ingredients_text_es", "ingredients_text",
  "allergens_tags", "traces_tags", "labels_tags",
  "image_front_small_url",
].join(",");

// Ingredientes que contienen gluten
export const GLUTEN_WORDS = [
  "trigo", "cebada", "centeno", "espelta", "kamut", "triticale", "malta",
  "seitán", "seitan", "sémola", "semola", "cuscús", "cuscus", "bulgur", "gluten",
  "wheat", "barley", "rye",
];

// Ingredientes dudosos (solo aptos si están certificados)
export const DOUBTFUL_WORDS = ["avena"];

export const ALLERGENS_ES = {
  "en:gluten": "Gluten",
  "en:milk": "Leche",
  "en:soybeans": "Soja",
  "en:eggs": "Huevo",
  "en:nuts": "Frutos de cáscara",
  "en:peanuts": "Cacahuete",
  "en:fish": "Pescado",
  "en:crustaceans": "Crustáceos",
  "en:molluscs": "Moluscos",
  "en:celery": "Apio",
  "en:mustard": "Mostaza",
  "en:sesame-seeds": "Sésamo",
  "en:sulphur-dioxide-and-sulphites": "Sulfitos",
  "en:lupin": "Altramuces",
};

// Textos de cada estado del semáforo
export const STATUS = {
  ok:   { title: "Sin gluten",        text: "No hemos encontrado ingredientes con gluten." },
  warn: { title: "Ojo: revisa bien",  text: "Puede contener trazas o lleva un ingrediente dudoso." },
  bad:  { title: "Contiene gluten",   text: "Lleva al menos un ingrediente con gluten." },
  unk:  { title: "No lo encontramos", text: "Este código no está en la base de datos. Prueba en «Leer etiqueta»." },
};

export const HISTORY_KEY = "sinespiga-hist";
export const HISTORY_MAX = 10;
