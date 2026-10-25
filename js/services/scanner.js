// Cámara + lectura de códigos de barras.
//
// Usa el lector nativo del navegador (BarcodeDetector) si existe (Chrome en Android).
// Si no, como en iPhone, usa el polyfill "barcode-detector" (motor ZXing-C++ en WebAssembly),
// que se carga en index.html como global: window.BarcodeDetectionAPI.

import { hasValidChecksum } from "../core/barcode.js";

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];
const SCAN_INTERVAL_MS = 100;

// Zona del vídeo que se analiza, relativa a lo que se ve en el recuadro
const SCAN_AREA = { width: 0.9, height: 0.6 };

export class ScannerUnavailableError extends Error {}
export class CameraPermissionError extends Error {}

async function createDetector() {
  const Native = window.BarcodeDetector;
  if (Native?.getSupportedFormats) {
    try {
      const supported = await Native.getSupportedFormats();
      const formats = FORMATS.filter(f => supported.includes(f));
      if (formats.length) return new Native({ formats });
    } catch { /* seguimos con el polyfill */ }
  }
  const Polyfill = window.BarcodeDetectionAPI?.BarcodeDetector;
  if (!Polyfill) throw new ScannerUnavailableError();
  return new Polyfill({ formats: FORMATS });
}

export class BarcodeScanner {
  /**
   * @param {string} containerId  div donde se coloca el vídeo
   * @param {(code:string) => void} onDetected
   */
  constructor(containerId, onDetected) {
    this.container = document.getElementById(containerId);
    this.onDetected = onDetected;
    this.detector = null;
    this.stream = null;
    this.video = null;
    this.timer = null;
    this.running = false;
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

    this.#tuneCamera();
    this.running = true;
    this.#loop();
  }

  async stop() {
    this.running = false;
    clearTimeout(this.timer);
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.container.replaceChildren();
  }

  /** Enfoque continuo si la cámara lo permite (mejora mucho la lectura de cerca). */
  async #tuneCamera() {
    const track = this.stream?.getVideoTracks()[0];
    const caps = track?.getCapabilities?.() ?? {};
    if (caps.focusMode?.includes("continuous")) {
      try { await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }); } catch { /* no pasa nada */ }
    }
  }

  async #loop() {
    if (!this.running) return;
    try {
      const frame = this.#captureScanArea();
      if (frame) {
        const results = await this.detector.detect(frame);
        const code = results.map(r => r.rawValue).find(hasValidChecksum);
        if (code && this.running) return this.#found(code);
      }
    } catch { /* fotograma ilegible: probamos con el siguiente */ }
    this.timer = setTimeout(() => this.#loop(), SCAN_INTERVAL_MS);
  }

  /** Recorta del vídeo solo la franja central que se ve dentro del recuadro. */
  #captureScanArea() {
    const { videoWidth: vw, videoHeight: vh } = this.video;
    if (!vw || !vh) return null;

    // El vídeo se muestra con object-fit: cover, así que parte queda fuera de la vista
    const box = this.container.getBoundingClientRect();
    const viewRatio = box.width / box.height;
    let visibleW = vw, visibleH = vh;
    if (vw / vh > viewRatio) visibleW = vh * viewRatio;
    else visibleH = vw / viewRatio;

    const w = Math.round(visibleW * SCAN_AREA.width);
    const h = Math.round(visibleH * SCAN_AREA.height);
    const x = Math.round((vw - w) / 2);
    const y = Math.round((vh - h) / 2);

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.video, x, y, w, h, 0, 0, w, h);
    return this.canvas;
  }

  async #found(code) {
    navigator.vibrate?.(80);
    await this.stop();
    this.onDetected(code);
  }
}
