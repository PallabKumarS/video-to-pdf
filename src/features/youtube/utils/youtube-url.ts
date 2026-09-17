/**
 * YouTube URL parsing and validation utility functions.
 */

const YOUTUBE_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Extracts an 11-character video ID from any valid YouTube URL.
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }
  const match = url.trim().match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

/**
 * Checks whether a given string is a valid YouTube video URL.
 */
export function isValidYoutubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

/**
 * Normalizes a YouTube URL to a canonical watch URL format.
 */
export function normalizeYoutubeUrl(url: string): string {
  const id = extractVideoId(url);
  if (!id) {
    return url.trim();
  }
  return `https://www.youtube.com/watch?v=${id}`;
}
