/**
 * Heavy Service: Handles YouTube video downloading on the Web platform
 * by delegating to the local companion YouTube service.
 */

const LOCAL_SERVER_ORIGIN = "http://127.0.0.1:3001";

export interface DownloadResult {
  streamUrl: string;
  title: string;
  filePath?: string;
}

export async function downloadYoutubeOnWeb(
  url: string,
): Promise<DownloadResult> {
  const response = await fetch(`${LOCAL_SERVER_ORIGIN}/api/youtube/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    let errorText = "Failed to download YouTube video on Web";
    try {
      const errJson = await response.json();
      if (errJson.error) {
        errorText = errJson.error;
      }
    } catch {
      errorText = await response.text();
    }
    throw new Error(errorText);
  }

  const data = await response.json();
  if (!data.success || !data.streamUrl) {
    throw new Error(data.error || "Could not retrieve YouTube video stream");
  }

  return {
    streamUrl: data.streamUrl,
    title: data.title || "YouTube Video",
    filePath: data.fileName,
  };
}
