/**
 * Heavy Service: Loads video file or stream URL and retrieves
 * its playback duration and dimensions.
 */

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export async function getVideoMetadata(
  source: File | string,
): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    // Only set crossOrigin for remote HTTP(S) domains; setting it on blob, capacitor, or localhost breaks playback
    if (
      typeof source === "string" &&
      (source.startsWith("http://") || source.startsWith("https://")) &&
      !source.includes("localhost") &&
      !source.includes("127.0.0.1")
    ) {
      video.crossOrigin = "anonymous";
    }
    video.muted = true;
    video.playsInline = true;

    const isBlobUrl = typeof source !== "string";
    const videoUrl =
      typeof source === "string" ? source : URL.createObjectURL(source);

    const cleanup = () => {
      if (isBlobUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      const meta: VideoMetadata = {
        duration: video.duration || 0,
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
        fps: 30,
      };
      cleanup();
      resolve(meta);
    };

    video.onloadedmetadata = finish;
    video.onloadeddata = finish;
    video.oncanplay = finish;

    video.onerror = () => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      cleanup();
      const code = video.error ? video.error.code : "unknown";
      const msg = video.error ? video.error.message : "Failed to load video";
      reject(new Error(`Failed to load video metadata (Code ${code}: ${msg})`));
    };

    timer = setTimeout(() => {
      if (resolved) return;
      if (video.readyState >= 1 || video.duration > 0) {
        finish();
      } else {
        resolved = true;
        cleanup();
        reject(new Error("Timed out loading video metadata (15s limit reached)"));
      }
    }, 15000);

    video.src = videoUrl;
    if (video.readyState >= 1) {
      finish();
    } else {
      video.load();
    }
  });
}
