/**
 * Heavy Service: Handles YouTube video downloading on Desktop (Electron)
 * via the preload IPC bridge.
 */

import type { DownloadResult } from "./download-web";

export async function downloadYoutubeOnElectron(
  url: string,
): Promise<DownloadResult> {
  const electronAPI =
    typeof window !== "undefined" ? window.electronAPI : undefined;

  if (!electronAPI?.downloadYoutube) {
    throw new Error("Electron native downloader is unavailable");
  }

  const res = await electronAPI.downloadYoutube(url);
  if (!res.success || !res.data?.streamUrl) {
    throw new Error(res.error || "Desktop download failed");
  }

  return {
    streamUrl: res.data.streamUrl,
    title: res.data.title || "YouTube Video",
    filePath: res.data.filePath,
  };
}
