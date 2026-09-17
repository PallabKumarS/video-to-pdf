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
    video.crossOrigin = "anonymous";
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
    const finish = () => {
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

    video.onerror = () => {
      if (timer) clearTimeout(timer);
      cleanup();
      reject(new Error("Failed to load video metadata"));
    };

    timer = setTimeout(() => {
      if (video.readyState >= 1 || video.duration > 0) {
        finish();
      } else {
        cleanup();
        reject(new Error("Timed out loading video metadata"));
      }
    }, 5000);

    video.src = videoUrl;
    if (video.readyState >= 1) {
      finish();
    } else {
      video.load();
    }
  });
}
