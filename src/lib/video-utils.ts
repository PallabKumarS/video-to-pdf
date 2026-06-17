export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export interface ExtractedFrame {
  id: string;
  time: number;
  dataUrl: string;
  selected: boolean;
}

/**
 * Loads a video file and retrieves its metadata.
 * Uses an object URL to load the file into an in-memory video element.
 */
export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30, // Default assumption if not easily accessible in browser
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video metadata."));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Extracts frames from a video between startTime and endTime at the specified interval.
 */
export async function extractFrames(
  file: File,
  startTime: number,
  endTime: number,
  intervalSeconds: number,
  onProgress?: (current: number, total: number) => void,
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const frames: ExtractedFrame[] = [];

    // Initialize worker
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL("./frame-worker.ts", import.meta.url));
    } catch (e) {
      console.warn("Web Workers not supported or failed to load. Falling back to main thread.", e);
      if (!ctx) {
        reject(new Error("Failed to get canvas context and worker failed"));
        return;
      }
    }

    const pendingTasks = new Set<string>();
    let isVideoFinished = false;
    let actualMaxTime = Infinity;

    const checkCompletion = () => {
      if (isVideoFinished && pendingTasks.size === 0) {
        worker?.terminate();
        URL.revokeObjectURL(video.src);
        frames.sort((a, b) => a.time - b.time);
        resolve(frames);
      }
    };

    if (worker) {
      worker.onmessage = (e: MessageEvent) => {
        const { success, id, time, blob, error } = e.data;
        if (success) {
          frames.push({
            id,
            time,
            dataUrl: URL.createObjectURL(blob),
            selected: true,
          });
        } else {
          console.error("Worker error:", error);
        }
        
        pendingTasks.delete(id);
        
        if (onProgress) {
          const total = Math.ceil((actualMaxTime - startTime) / intervalSeconds);
          // When using worker, progress tracks encoded frames
          onProgress(frames.length, total);
        }
        
        checkCompletion();
      };
    }

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    let currentTime = startTime;

    video.onloadeddata = () => {
      actualMaxTime = Math.min(endTime, video.duration || Infinity);
      if (!worker) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      extractNextFrame();
    };

    video.onerror = () => {
      worker?.terminate();
      URL.revokeObjectURL(video.src);
      reject(new Error("Error loading video for frame extraction."));
    };

    const extractNextFrame = () => {
      if (currentTime > actualMaxTime) {
        isVideoFinished = true;
        checkCompletion();
        return;
      }
      video.currentTime = currentTime;
    };

    video.onseeked = async () => {
      const id = crypto.randomUUID();
      const frameTime = currentTime;

      if (worker && typeof createImageBitmap !== "undefined") {
        try {
          const bitmap = await createImageBitmap(video);
          pendingTasks.add(id);
          worker.postMessage({ bitmap, id, time: frameTime }, [bitmap]);
        } catch (e) {
          console.error("Failed to create ImageBitmap", e);
        }
      } else if (ctx) {
        // Fallback to main thread canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        frames.push({ id, time: frameTime, dataUrl, selected: true });
        
        if (onProgress) {
          const total = Math.ceil((actualMaxTime - startTime) / intervalSeconds);
          onProgress(frames.length, total);
        }
      }

      currentTime += intervalSeconds;
      
      if (currentTime > actualMaxTime) {
        isVideoFinished = true;
        checkCompletion();
      } else {
        requestAnimationFrame(() => {
          extractNextFrame();
        });
      }
    };

    video.src = URL.createObjectURL(file);
  });
}
