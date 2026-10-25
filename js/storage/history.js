// Historial de escaneos guardado en el propio navegador (localStorage).

import { HISTORY_KEY, HISTORY_MAX } from "../config.js";

/** @typedef {{code:string, name:string, status:string}} HistoryItem */

/** @returns {HistoryItem[]} */
export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

/** Añade (o sube arriba) un producto y devuelve el historial actualizado. */
export function addToHistory(item) {
  const list = [item, ...getHistory().filter(h => h.code !== item.code)].slice(0, HISTORY_MAX);
  save(list);
  return list;
}

export function clearHistory() {
  save([]);
  return [];
}

function save(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch { /* modo privado o almacenamiento lleno: seguimos sin guardar */ }
}
