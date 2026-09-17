/**
 * PDF layout and dimensional utility calculations.
 */

export interface PdfDimensions {
  orientation: "p" | "l";
  format: [number, number];
}

export function calculatePdfDimensions(
  width: number,
  height: number,
): PdfDimensions {
  const validWidth = Math.max(10, width);
  const validHeight = Math.max(10, height);
  const orientation = validWidth >= validHeight ? "l" : "p";
  return {
    orientation,
    format: [validWidth, validHeight],
  };
}
