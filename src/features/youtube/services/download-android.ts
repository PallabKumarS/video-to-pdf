/**
 * Heavy Service: Handles YouTube video downloading on Android (Capacitor)
 * via the native YouTubeDownloader plugin.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import type { DownloadResult } from "./download-web";

interface NativeProgress {
  percent: number;
  speed: string;
  eta: string;
}

interface YouTubeDownloaderPluginType {
  downloadVideo: (options: { url: string }) => Promise<{
    filePath: string;
    streamUrl: string;
    title: string;
  }>;
  addListener: (
    eventName: string,
    listenerFunc: (info: NativeProgress) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
}

export async function downloadYoutubeOnAndroid(
  url: string,
  onProgress?: (info: NativeProgress) => void,
): Promise<DownloadResult> {
  const NativeDownloader =
    registerPlugin<YouTubeDownloaderPluginType>("YouTubeDownloader");

  let listenerHandle: { remove: () => Promise<void> } | null = null;
  if (onProgress) {
    listenerHandle = await NativeDownloader.addListener(
      "youtube:progress",
      (info) => {
        onProgress(info);
      },
    );
  }

  try {
    const res = await NativeDownloader.downloadVideo({ url });
    if (!res || (!res.streamUrl && !res.filePath)) {
      throw new Error("Could not retrieve video stream on Android");
    }
    const safeStreamUrl = res.filePath
      ? Capacitor.convertFileSrc(res.filePath)
      : res.streamUrl;
    return {
      streamUrl: safeStreamUrl,
      title: res.title || "YouTube Video",
      filePath: res.filePath,
    };
  } finally {
    if (listenerHandle) {
      await listenerHandle.remove();
    }
  }
}
