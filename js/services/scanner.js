// Cámara + lectura de códigos de barras.
//
// Usa el lector nativo del navegador (BarcodeDetector) si existe (Chrome en Android).
// Si no, como en iPhone, usa el polyfill "barcode-detector" (motor ZXing-C++ en WebAssembly),
// que se carga en index.html como global: window.BarcodeDetectionAPI.

import { hasValidChecksum } from "../core/barcode.js";
import { sharpenGray } from "../core/imageFilters.js";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
const SCAN_INTERVAL_MS = 80;
const MAX_FRAME_SIDE = 1280;   // fotogramas más grandes se reducen: más rápido y igual de fiable
const PREFERRED_ZOOM = 2;      // permite separar el móvil (mejor enfoque) sin que el código se vea pequeño

// Ayudas que se muestran si tarda en leer
const HINTS = [
  { after: 4000,  text: "¿Se ve borroso? Aleja el móvil a unos 20–30 cm" },
  { after: 10000, text: "Prueba con más luz o escribe el código abajo" },
];

export class ScannerUnavailableError extends Error {}
export class CameraPermissionError extends Error {}

/* ---------- motor de lectura ---------- */

const polyfill = () => window.BarcodeDetectionAPI;

/** Descarga el motor en segundo plano para que la primera lectura no tarde. */
export function preloadScanner() {
  if (window.BarcodeDetector) return;
  polyfill()?.prepareZXingModule?.({ fireImmediately: true })?.catch?.(() => {});
}

async function createDetector() {
  const Native = window.BarcodeDetector;
  if (Native?.getSupportedFormats) {
    try {
      const supported = await Native.getSupportedFormats();
      const formats = FORMATS.filter(f => supported.includes(f));
      if (formats.length) return new Native({ formats });
    } catch { /* seguimos con el polyfill */ }
  }
  const Polyfill = polyfill()?.BarcodeDetector;
  if (!Polyfill) throw new ScannerUnavailableError();
  try {
    await polyfill().prepareZXingModule?.({ fireImmediately: true });
  } catch {
    throw new ScannerUnavailableError();
  }
  return new Polyfill({ formats: FORMATS });
}

/* ---------- escáner ---------- */

export class BarcodeScanner {
  /**
   * @param {string} containerId  div donde se coloca el vídeo
   * @param {{onDetected:(code:string)=>void, onHint?:(text:string)=>void}} handlers
   */
  constructor(containerId, { onDetected, onHint = () => {} }) {
    this.container = document.getElementById(containerId);
    this.onDetected = onDetected;
    this.onHint = onHint;
    this.detector = null;
    this.stream = null;
    this.video = null;
    this.timer = null;
    this.running = false;
    this.frameCount = 0;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
  }

  async start() {
    this.detector ??= await createDetector();

    if (!navigator.mediaDevices?.getUserMedia) throw new CameraPermissionError();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    } catch {
      throw new CameraPermissionError();
    }

    this.video = document.createElement("video");
    this.video.setAttribute("playsinline", ""); // imprescindible en iPhone
    this.video.muted = true;
    this.video.srcObject = this.stream;
    this.container.replaceChildren(this.video);
    await this.video.play();

    await this.#tuneCamera();
    this.running = true;
    this.frameCount = 0;
    this.startedAt = performance.now();
    this.hintIndex = 0;
    this.#loop();
  }

  async stop() {
    this.running = false;
    clearTimeout(this.timer);
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.container.replaceChildren();
  }

  /** Enfoque continuo y algo de zoom si la cámara lo permite. */
  async #tuneCamera() {
    const track = this.stream?.getVideoTracks()[0];
    const caps = track?.getCapabilities?.() ?? {};
    const settings = {};
    if (caps.focusMode?.includes("continuous")) settings.focusMode = "continuous";
    if (caps.zoom) settings.zoom = Math.min(caps.zoom.max, Math.max(caps.zoom.min, PREFERRED_ZOOM));
    if (!Object.keys(settings).length) return;
    try { await track.applyConstraints({ advanced: [settings] }); } catch { /* no pasa nada */ }
  }

  async #loop() {
    if (!this.running) return;
    try {
      const frame = this.#captureFrame(this.frameCount++);
      if (frame) {
        const results = await this.detector.detect(frame);
        const code = results.map(r => r.rawValue).find(hasValidChecksum);
        if (code && this.running) return this.#found(code);
      }
    } catch { /* fotograma ilegible: probamos con el siguiente */ }
    this.#updateHint();
    this.timer = setTimeout(() => this.#loop(), SCAN_INTERVAL_MS);
  }

  /**
   * Va alternando qué parte de la imagen analiza y cómo, para encontrar el código
   * esté donde esté, sea del tamaño que sea y aunque salga algo borroso:
   *   0 → imagen completa
   *   1 → imagen completa con enfoque digital
   *   2 → mitad central ampliada (códigos pequeños o lejanos)
   *   3 → franja horizontal central con enfoque digital
   */
  #captureFrame(n) {
    const { videoWidth: vw, videoHeight: vh } = this.video;
    if (!vw || !vh) return null;

    const modes = [
      { w: 1,   h: 1,    sharpen: false },
      { w: 1,   h: 1,    sharpen: true  },
      { w: 0.5, h: 0.5,  sharpen: false },
      { w: 1,   h: 0.45, sharpen: true  },
    ];
    const m = modes[n % modes.length];
    const sw = Math.round(vw * m.w), sh = Math.round(vh * m.h);
    const sx = Math.round((vw - sw) / 2), sy = Math.round((vh - sh) / 2);

    // Escala de salida: reducimos lo muy grande y ampliamos lo pequeño
    const scale = Math.min(MAX_FRAME_SIDE / Math.max(sw, sh), 2);
    const cw = Math.round(sw * scale), ch = Math.round(sh * scale);
    this.canvas.width = cw;
    this.canvas.height = ch;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.drawImage(this.video, sx, sy, sw, sh, 0, 0, cw, ch);

    return m.sharpen ? sharpenGray(this.ctx.getImageData(0, 0, cw, ch)) : this.canvas;
  }

  #updateHint() {
    const next = HINTS[this.hintIndex];
    if (next && performance.now() - this.startedAt > next.after) {
      this.onHint(next.text);
      this.hintIndex++;
    }
  }

  async #found(code) {
    navigator.vibrate?.(80);
    await this.stop();
    this.onDetected(code);
  }
}
