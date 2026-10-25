// Utilidades puras para códigos de barras (EAN-8, EAN-13, UPC-A, UPC-E).

/** Tiene pinta de código de barras: entre 8 y 14 cifras. */
export function isValidBarcode(code) {
  return /^\d{8,14}$/.test(code);
}

/**
 * Comprueba el dígito de control de EAN-8, UPC-A (12) y EAN-13.
 * Sirve para descartar lecturas erróneas de la cámara.
 * Los UPC-E comprimidos (6-8 cifras con otro cálculo) se aceptan sin comprobar.
 */
export function hasValidChecksum(code) {
  if (!/^\d+$/.test(code)) return false;
  if (![8, 12, 13].includes(code.length)) return code.length >= 6;

  const digits = code.split("").map(Number);
  const check = digits.pop();
  // Desde la derecha, las posiciones alternas pesan 3 y 1
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
