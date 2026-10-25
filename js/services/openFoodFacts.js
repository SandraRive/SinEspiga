// Comunicación con Open Food Facts. Devuelve los productos ya "traducidos"
// a un formato propio, así el resto de la app no depende de cómo es la API.

import { OFF_API, OFF_FIELDS } from "../config.js";

/**
 * @typedef {Object} Product
 * @property {string} code
 * @property {string} name
 * @property {string} brand
 * @property {string} ingredients
 * @property {string} image
 * @property {string[]} allergens   p. ej. ["en:gluten", "en:milk"]
 * @property {string[]} traces
 * @property {boolean} glutenFree   lleva etiqueta "sin gluten"
 */

export class NetworkError extends Error {}

/**
 * Busca un producto por código de barras.
 * @returns {Promise<Product|null>} null si no existe en la base de datos
 * @throws {NetworkError} si no hay conexión o la API falla
 */
export async function fetchProduct(code) {
  let data;
  try {
    const res = await fetch(`${OFF_API}${code}.json?fields=${OFF_FIELDS}&lc=es`);
    data = await res.json();
  } catch {
    throw new NetworkError("No se ha podido conectar con Open Food Facts");
  }

  if (data.status !== 1 || !data.product) return null;
  return normalize(code, data.product);
}

function normalize(code, p) {
  return {
    code,
    name: p.product_name_es || p.product_name || "Producto sin nombre",
    brand: (p.brands || "").split(",")[0].trim(),
    ingredients: p.ingredients_text_es || p.ingredients_text || "",
    image: p.image_front_small_url || "",
    allergens: p.allergens_tags || [],
    traces: p.traces_tags || [],
    glutenFree: (p.labels_tags || []).some(l => /no-gluten|gluten-free|sin-gluten/.test(l)),
  };
}
