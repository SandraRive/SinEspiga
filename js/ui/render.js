// Todo lo que pinta HTML. Recibe datos y los muestra; no decide nada.

import { GLUTEN_WORDS, DOUBTFUL_WORDS, ALLERGENS_ES, STATUS } from "../config.js";

const $ = id => document.getElementById(id);

export const escapeHtml = s =>
  String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- resaltado de ingredientes ---------- */

const NOT_LETTER_BEFORE = "(?<![a-záéíóúüñ_])";
const NOT_LETTER_AFTER = "(?![a-záéíóúüñ_])";
const OUTSIDE_MARK = "(?![^<]*<\\/mark>)";

function highlight(text) {
  let html = escapeHtml(text);
  html = html.replace(/(puede contener trazas[^.]*)/gi, '<mark class="warn">$1</mark>');
  const mark = (words, cls) => words.forEach(w => {
    const re = new RegExp(`${NOT_LETTER_BEFORE}(${w})${NOT_LETTER_AFTER}${OUTSIDE_MARK}`, "gi");
    html = html.replace(re, `<mark class="${cls}">$1</mark>`);
  });
  mark(GLUTEN_WORDS, "bad");
  mark(DOUBTFUL_WORDS, "warn");
  return html;
}

/* ---------- piezas de la tarjeta ---------- */

function verdictHtml(result) {
  const copy = STATUS[result.status];
  return `
    <div class="verdict st-${result.status}">
      <div class="light" aria-hidden="true"><b></b><b></b><b></b></div>
      <div><h2>${result.title || copy.title}</h2><p>${result.text || copy.text}</p></div>
    </div>`;
}

function productHeaderHtml(p) {
  return `
    <div class="prod">
      ${p.image ? `<img src="${escapeHtml(p.image)}" alt="">` : ""}
      <div><strong>${escapeHtml(p.name)}</strong>${p.brand ? `<span>${escapeHtml(p.brand)}</span>` : ""}</div>
      <small>${escapeHtml(p.code)}</small>
    </div>`;
}

function chipsHtml(result, product) {
  const chips = [];
  product?.allergens.forEach(a => {
    const label = ALLERGENS_ES[a] || a.replace(/^\w+:/, "");
    chips.push(`<span class="chip ${a === "en:gluten" ? "bad" : ""}">${escapeHtml(label)}</span>`);
  });
  if (result.hasTraces) chips.push(`<span class="chip warn">Trazas de gluten</span>`);
  if (result.found.some(f => f.word === "avena")) chips.push(`<span class="chip warn">Avena (solo apta si es certificada)</span>`);
  if (product?.glutenFree) chips.push(`<span class="chip ok">Etiqueta «sin gluten»</span>`);
  if (!chips.length) return "";
  return `<div><div class="label">Alérgenos y avisos</div><div class="chips">${chips.join("")}</div></div>`;
}

/* ---------- API pública ---------- */

/**
 * Pinta la tarjeta de resultado.
 * @param {object} result   salida de analyzeIngredients / evaluateProduct
 * @param {object} [opts]   { product, ingredients }
 */
export function renderResult(result, { product = null, ingredients = "" } = {}) {
  const text = product ? product.ingredients : ingredients;
  let html = verdictHtml(result);

  if (product || ingredients) {
    html += `<div class="body">
      ${product ? productHeaderHtml(product) : ""}
      <div>
        <div class="label">Ingredientes</div>
        <p class="ingr">${text ? highlight(text) : "<em>Sin lista de ingredientes en la base de datos.</em>"}</p>
      </div>
      ${chipsHtml(result, product)}
      <p class="note">Orientativo. Los datos son colaborativos, pueden estar incompletos y no detectan contaminación cruzada: confirma siempre en el envase.</p>
    </div>`;
  }
  $("result").innerHTML = html;
}

/** Mensaje sin producto (error, código no válido…). */
export function renderMessage(title, text, status = "unk") {
  renderResult({ status, found: [], hasTraces: false, title, text });
}

export function renderLoading(code) {
  $("result").innerHTML = `<div class="empty"><strong>Buscando…</strong>Consultando el código ${escapeHtml(code)}</div>`;
}

export function renderHistory(list) {
  $("hist").innerHTML = list.length
    ? list.map(h => {
        const status = STATUS[h.status] ? h.status : "unk";
        return `
        <li data-code="${escapeHtml(h.code)}">
          <i class="dot ${status}"></i><span>${escapeHtml(h.name)}</span><small>${STATUS[status].title}</small>
        </li>`;
      }).join("")
    : `<li class="none">Aún no has escaneado nada.</li>`;
}

/** Estado visual del visor de cámara. */
export function setCameraState(on, hint) {
  $("frame").classList.toggle("live", on);
  $("frame").classList.toggle("scanning", on);
  $("scan").textContent = on ? "Parar cámara" : "Abrir cámara";
  $("hint").textContent = hint ?? (on ? "Apunta al código, no hace falta que llene el recuadro" : "Pulsa el botón y apunta al código de barras");
}

export function setHint(text) {
  $("hint").textContent = text;
}

export function showTab(name) {
  const isScan = name === "scan";
  $("tab-scan").setAttribute("aria-selected", isScan);
  $("tab-text").setAttribute("aria-selected", !isScan);
  $("pane-scan").hidden = !isScan;
  $("pane-text").hidden = isScan;
}
