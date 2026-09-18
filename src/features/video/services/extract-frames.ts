/**
 * Heavy Service: Extracts frames from video at fixed intervals
 * using high-performance sequential seek and canvas capture.
 */

import { Capacitor } from "@capacitor/core";
import {
  createOffscreenOrDOMCanvas,
  drawVideoToJpegDataUrl,
} from "../utils/canvas-helper";

export interface ExtractedFrame {
  id: string;
  time: number;
  dataUrl: string;
  selected: boolean;
}

export async function extractFrames(
  source: File | string,
  startTime: number,
  endTime: number,
  intervalSeconds: number,
  onProgress?: (current: number, total: number) => void,
): Promise<ExtractedFrame[]> {
  const isBlobUrl = typeof source !== "string";
  const videoUrl =
    typeof source === "string" ? source : URL.createObjectURL(source);

  try {
    const video = document.createElement("video");
    video.preload = "auto";
    const isCapacitorLocal =
      typeof source === "string" &&
      (source.startsWith("capacitor:") ||
        source.includes("_capacitor_file_") ||
        (Capacitor.isNativePlatform() && source.includes("localhost")));

    if (
      typeof source === "string" &&
      (source.startsWith("http://") || source.startsWith("https://")) &&
      !isCapacitorLocal
    ) {
      video.crossOrigin = "anonymous";
    }
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let settled = false;

      const onLoaded = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        resolve();
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        const code = video.error ? video.error.code : "unknown";
        const msg = video.error ? video.error.message : "Video playback error";
        reject(new Error(`Failed to load video for frame extraction (Code ${code}: ${msg})`));
      };

      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);

      timeoutId = setTimeout(() => {
        if (settled) return;
        if (video.readyState >= 1) {
          onLoaded();
        } else {
          settled = true;
          video.removeEventListener("loadeddata", onLoaded);
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("error", onError);
          reject(new Error("Timed out loading video for frame extraction"));
        }
      }, 10000);

      video.src = videoUrl;
      if (video.readyState >= 1) {
        onLoaded();
      } else {
        video.load();
      }
    });

    const canvas = createOffscreenOrDOMCanvas(
      video.videoWidth || 1280,
      video.videoHeight || 720,
    );

    const actualMaxTime = Math.min(endTime, video.duration || endTime);
    const timestamps: number[] = [];
    for (let t = startTime; t <= actualMaxTime; t += intervalSeconds) {
      timestamps.push(t);
    }
    if (timestamps.length === 0 && actualMaxTime >= startTime) {
      timestamps.push(startTime);
    }

    const frames: ExtractedFrame[] = [];
    const total = timestamps.length;

    for (let i = 0; i < total; i++) {
      const targetTime = timestamps[i];

      if (Math.abs(video.currentTime - targetTime) > 0.05) {
        await new Promise<void>((resolve) => {
          let timer: ReturnType<typeof setTimeout> | null = null;
          const onSeeked = () => {
            if (timer) clearTimeout(timer);
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };

          timer = setTimeout(() => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          }, 1500);

          video.addEventListener("seeked", onSeeked);
          video.currentTime = targetTime;
        });
      }

      const dataUrl = drawVideoToJpegDataUrl(video, canvas);

      frames.push({
        id: crypto.randomUUID(),
        time: targetTime,
        dataUrl,
        selected: true,
      });

      if (onProgress) {
        onProgress(frames.length, total);
      }
    }

    return frames;
  } finally {
    if (isBlobUrl) {
      URL.revokeObjectURL(videoUrl);
    }
  }
}
