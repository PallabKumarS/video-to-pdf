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

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    video.preload = "auto";
    video.muted = true; // Required for auto-play/seeking in some browsers
    video.playsInline = true;

    let currentTime = startTime;
    const maxTime = Math.min(endTime, video.duration || Infinity);

    video.onloadeddata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      maxTime === Infinity
        ? extractNextFrame(video.duration)
        : extractNextFrame(maxTime);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Error loading video for frame extraction."));
    };

    const extractNextFrame = async (actualMaxTime: number) => {
      if (currentTime > actualMaxTime) {
        URL.revokeObjectURL(video.src);
        resolve(frames);
        return;
      }

      video.currentTime = currentTime;
    };

    video.onseeked = () => {
      // Draw the current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9); // High quality JPEG

      frames.push({
        id: crypto.randomUUID(),
        time: currentTime,
        dataUrl,
        selected: true, // Default to selected
      });

      if (onProgress) {
        // Approximate progress based on time
        const total = Math.ceil((endTime - startTime) / intervalSeconds);
        const current = frames.length;
        onProgress(current, total);
      }

      currentTime += intervalSeconds;
      const actualMaxTime = Math.min(endTime, video.duration || Infinity);

      if (currentTime > actualMaxTime) {
        URL.revokeObjectURL(video.src);
        resolve(frames);
      } else {
        // We use requestAnimationFrame to allow the browser to breathe and update UI
        requestAnimationFrame(() => {
          video.currentTime = currentTime;
        });
      }
    };

    video.src = URL.createObjectURL(file);
  });
}
