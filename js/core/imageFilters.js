// Filtros de imagen puros (sin DOM). Ayudan a leer códigos de barras algo borrosos,
// algo habitual en iPhone porque no enfoca bien de muy cerca.

/**
 * Pasa la imagen a gris y le aplica un enfoque 3×3:
 *    0 -1  0
 *   -1  5 -1
 *    0 -1  0
 * Devuelve un ImageData nuevo del mismo tamaño.
 * @param {ImageData} image
 */
export function sharpenGray(image) {
  const { width: w, height: h, data } = image;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const up = (y > 0 ? y - 1 : y) * w;
    const row = y * w;
    const down = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const left = x > 0 ? x - 1 : x;
      const right = x < w - 1 ? x + 1 : x;
      const v = 5 * gray[row + x] - gray[up + x] - gray[down + x] - gray[row + left] - gray[row + right];
      const p = (row + x) * 4;
      out[p] = out[p + 1] = out[p + 2] = v; // Uint8ClampedArray recorta a 0–255
      out[p + 3] = 255;
    }
  }
  return new ImageData(out, w, h);
}
