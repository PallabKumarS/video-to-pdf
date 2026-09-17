/**
 * Heavy Service: Orchestrates YouTube downloading across all platforms
 * (Web, Android, Desktop) with uniform interface and error handling.
 */

import { Capacitor } from "@capacitor/core";
import { downloadYoutubeOnAndroid } from "./download-android";
import { downloadYoutubeOnElectron } from "./download-electron";
import { downloadYoutubeOnWeb, type DownloadResult } from "./download-web";
import { normalizeYoutubeUrl, isValidYoutubeUrl } from "../utils/youtube-url";

export interface ProgressInfo {
  percent: number;
  speed: string;
  eta: string;
}

export async function downloadYoutube(
  rawUrl: string,
  onProgress?: (info: ProgressInfo) => void,
): Promise<DownloadResult> {
  const url = normalizeYoutubeUrl(rawUrl);
  if (!isValidYoutubeUrl(url)) {
    throw new Error("Invalid YouTube video URL format");
  }

  // 1. Android Native Platform
  if (Capacitor.isNativePlatform()) {
    return await downloadYoutubeOnAndroid(url, onProgress);
  }

  // 2. Desktop Electron Platform
  const electronAPI =
    typeof window !== "undefined" ? window.electronAPI : undefined;
  if (electronAPI?.downloadYoutube) {
    return await downloadYoutubeOnElectron(url);
  }

  // 3. Web Browser Platform
  return await downloadYoutubeOnWeb(url);
}
