// Punto de entrada: conecta los botones con la lógica, los servicios y la interfaz.

import { analyzeIngredients, evaluateProduct } from "./core/analyzer.js";
import { isValidBarcode } from "./core/barcode.js";
import { fetchProduct, NetworkError } from "./services/openFoodFacts.js";
import { BarcodeScanner, ScannerUnavailableError } from "./services/scanner.js";
import { getHistory, addToHistory, clearHistory } from "./storage/history.js";
import {
  renderResult, renderMessage, renderLoading, renderHistory, setCameraState, showTab,
} from "./ui/render.js";

const $ = id => document.getElementById(id);

/* ---------- buscar un producto ---------- */

async function lookup(rawCode) {
  const code = String(rawCode).replace(/\D/g, "");
  if (!isValidBarcode(code)) {
    renderMessage("Código no válido", "Un código de barras tiene entre 8 y 13 números.");
    return;
  }

  renderLoading(code);
  try {
    const product = await fetchProduct(code);
    if (!product) {
      renderResult({ status: "unk", found: [], hasTraces: false });
      renderHistory(addToHistory({ code, name: "Producto desconocido", status: "unk" }));
      return;
    }
    const result = evaluateProduct(product);
    renderResult(result, { product });
    renderHistory(addToHistory({ code, name: product.name, status: result.status }));
  } catch (err) {
    if (err instanceof NetworkError) {
      renderMessage("Sin conexión", "No hemos podido consultar la base de datos. Revisa tu conexión e inténtalo otra vez.");
    } else {
      console.error(err);
      renderMessage("Algo ha fallado", "Ha ocurrido un error inesperado. Inténtalo de nuevo.");
    }
  }
}

/* ---------- cámara ---------- */

const scanner = new BarcodeScanner("reader", code => {
  setCameraState(false);
  $("code").value = code;
  lookup(code);
});

async function toggleCamera() {
  if (scanner.running) {
    await scanner.stop();
    setCameraState(false);
    return;
  }
  try {
    await scanner.start();
    setCameraState(true);
  } catch (err) {
    const hint = err instanceof ScannerUnavailableError
      ? "No se ha podido cargar el lector. Escribe el código abajo."
      : "No hay acceso a la cámara. Da permiso o escribe el código abajo.";
    setCameraState(false, hint);
  }
}

/* ---------- leer etiqueta ---------- */

function checkIngredients() {
  const text = $("txt").value;
  renderResult(analyzeIngredients(text), { ingredients: text });
}

/* ---------- eventos ---------- */

function bindEvents() {
  $("scan").addEventListener("click", toggleCamera);

  $("manual").addEventListener("submit", e => {
    e.preventDefault();
    lookup($("code").value);
  });

  $("hist").addEventListener("click", e => {
    const li = e.target.closest("li[data-code]");
    if (!li) return;
    $("code").value = li.dataset.code;
    lookup(li.dataset.code);
  });

  $("wipe").addEventListener("click", () => renderHistory(clearHistory()));

  $("check").addEventListener("click", checkIngredients);
  $("clear").addEventListener("click", () => { $("txt").value = ""; $("txt").focus(); });

  $("tab-scan").addEventListener("click", () => showTab("scan"));

  // Si sales de la app o bloqueas el móvil, se apaga la cámara
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden && scanner.running) { await scanner.stop(); setCameraState(false); }
  });
  $("tab-text").addEventListener("click", async () => {
    showTab("text");
    if (scanner.running) { await scanner.stop(); setCameraState(false); }
    checkIngredients();
  });
}

bindEvents();
renderHistory(getHistory());
