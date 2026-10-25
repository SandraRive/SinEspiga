// Envoltorio de la librería html5-qrcode (se carga en index.html como script global).
// La app solo usa start() / stop() y no sabe qué librería hay debajo.

export class ScannerUnavailableError extends Error {}
export class CameraPermissionError extends Error {}

export class BarcodeScanner {
  /**
   * @param {string} elementId  id del div donde se pinta el vídeo
   * @param {(code:string) => void} onDetected
   */
  constructor(elementId, onDetected) {
    this.elementId = elementId;
    this.onDetected = onDetected;
    this.reader = null;
    this.running = false;
  }

  async start() {
    if (!window.Html5Qrcode) throw new ScannerUnavailableError();

    if (!this.reader) {
      const F = window.Html5QrcodeSupportedFormats;
      this.reader = new window.Html5Qrcode(this.elementId, {
        formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E],
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
    }

    try {
      await this.reader.start(
        { facingMode: "environment" },
        { fps: 12, aspectRatio: 1.6 },
        code => this.#handle(code),
        () => {} // errores de lectura frame a frame: se ignoran
      );
      this.running = true;
    } catch {
      throw new CameraPermissionError();
    }
  }

  async stop() {
    if (this.reader && this.running) {
      try { await this.reader.stop(); } catch { /* ya estaba parado */ }
    }
    this.running = false;
  }

  async #handle(code) {
    if (!this.running) return;
    navigator.vibrate?.(80);
    await this.stop();
    this.onDetected(code);
  }
}
