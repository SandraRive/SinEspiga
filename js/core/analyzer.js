// Lógica pura: decide el color del semáforo. No toca el DOM ni la red,
// así se puede probar de forma aislada.

import { GLUTEN_WORDS, DOUBTFUL_WORDS } from "../config.js";

const LETTER = "a-záéíóúüñ";
const TRACE_SENTENCE = /puede contener trazas[^.]*\.?/gi;
const TRACE_GLUTEN = /trazas[^.]*(gluten|trigo|cebada|centeno|avena|espelta)/i;

const wordRegex = (word, flags = "") =>
  new RegExp(`(^|[^${LETTER}])${word}($|[^${LETTER}])`, flags);

/**
 * Analiza una lista de ingredientes en texto.
 * @returns {{status:"ok"|"warn"|"bad"|"unk", found:Array<{word:string, level:"bad"|"warn"}>, hasTraces:boolean}}
 */
export function analyzeIngredients(text = "", hasGlutenFreeLabel = false) {
  const lower = text.toLowerCase();
  if (!lower.trim()) return { status: "unk", found: [], hasTraces: false };

  const hasTraces = TRACE_GLUTEN.test(lower);
  // Quitamos las frases de trazas y "sin gluten" para no confundirlas con ingredientes
  const clean = lower.replace(TRACE_SENTENCE, "").replace(/sin gluten/g, "");

  const found = [
    ...GLUTEN_WORDS.filter(w => wordRegex(w).test(clean)).map(word => ({ word, level: "bad" })),
    ...DOUBTFUL_WORDS.filter(w => wordRegex(w).test(clean)).map(word => ({ word, level: "warn" })),
  ];
  if (hasTraces) found.push({ word: "trazas", level: "warn" });

  let status = found.some(f => f.level === "bad") ? "bad" : found.length ? "warn" : "ok";
  const certified = hasGlutenFreeLabel || /sin gluten/.test(lower);
  if (status !== "bad" && certified && !hasTraces) status = "ok";

  return { status, found, hasTraces };
}

/**
 * Combina el análisis del texto con los datos de alérgenos de la base de datos.
 * @param {import("../services/openFoodFacts.js").Product} product
 */
export function evaluateProduct(product) {
  const result = analyzeIngredients(product.ingredients, product.glutenFree);

  if (product.allergens.includes("en:gluten")) {
    result.status = "bad";
  } else if (product.traces.includes("en:gluten")) {
    result.hasTraces = true;
    if (result.status === "ok") result.status = "warn";
  }

  if (result.status === "unk") {
    result.title = "Faltan datos";
    result.text = "El producto está en la base de datos, pero sin ingredientes. Mira la etiqueta.";
  }
  return result;
}

/** Devuelve true si el código tiene pinta de código de barras (8 a 14 cifras). */
export function isValidBarcode(code) {
  return /^\d{8,14}$/.test(code);
}
