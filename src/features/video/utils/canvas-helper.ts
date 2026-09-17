/**
 * Canvas utility functions for video frame rendering and compression.
 */

export function createOffscreenOrDOMCanvas(
  width: number,
  height: number,
  maxWidth = 1920,
  maxHeight = 1080,
): HTMLCanvasElement {
  let w = Math.max(1, width);
  let h = Math.max(1, height);

  if (w > maxWidth || h > maxHeight) {
    const ratio = Math.min(maxWidth / w, maxHeight / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

export function drawVideoToJpegDataUrl(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  quality = 0.85,
): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D canvas context");
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
