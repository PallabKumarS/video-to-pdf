import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

let activeServer = null;
let serverPort = 0;
let currentVideoPath = "";

let persistentDataDir = "";

export function setPersistentDataDir(dir) {
  persistentDataDir = dir;
}

export function getCookiesFilePath() {
  const baseDir = persistentDataDir || os.tmpdir();
  return path.join(baseDir, "vidtopdf_yt_cookies.txt");
}

export function isValidAuthCookieFile(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) return false;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    // Ensure the cookies file contains actual user session credentials
    return /(SAPISID|SSID|HSID|SID|LOGIN_INFO|__Secure-[13]PSID)/i.test(content);
  } catch {
    return false;
  }
}

export function hasSavedCookies() {
  const cookiePath = getCookiesFilePath();
  return isValidAuthCookieFile(cookiePath);
}

export function saveCookiesFile(content) {
  const cookiePath = getCookiesFilePath();
  fs.writeFileSync(cookiePath, content, "utf-8");
}

export function clearCookiesFile() {
  const cookiePath = getCookiesFilePath();
  if (fs.existsSync(cookiePath)) {
    fs.unlinkSync(cookiePath);
  }
}

/**
 * Starts a minimal local HTTP server on an ephemeral port to stream the downloaded video file
 * to standard browser <video> tags with CORS headers and Range request support.
 */
export async function startLocalMediaServer() {
  if (activeServer && serverPort > 0) {
    return serverPort;
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (!currentVideoPath || !fs.existsSync(currentVideoPath)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Video file not found or expired");
        return;
      }

      const stat = fs.statSync(currentVideoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parts[0]
          ? parseInt(parts[0], 10)
          : Math.max(0, fileSize - parseInt(parts[1], 10));
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(currentVideoPath, {
          start,
          end,
        });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": "video/mp4",
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Accept-Ranges": "bytes",
          "Content-Type": "video/mp4",
        });
        fs.createReadStream(currentVideoPath).pipe(res);
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        serverPort = addr.port;
        activeServer = server;
        resolve(serverPort);
      } else {
        reject(new Error("Failed to obtain server port"));
      }
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Downloads a video using yt-dlp.
 * Uses --cookies if available.
 */
export function downloadYoutubeVideo(url, onProgress) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const videoId = Date.now().toString(36);
    const outputPath = path.join(tempDir, `vidtopdf_${videoId}.mp4`);

    const args = [
      "-f",
      "bestvideo[height<=720][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720][vcodec^=avc1]+bestaudio/best[height<=720][vcodec^=avc1]/best[height<=720][ext=mp4]/best[height<=720]/best",
      "--merge-output-format",
      "mp4",
      "--no-playlist",
      "--force-overwrites",
      "--no-check-certificates",
      "--geo-bypass",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "-o",
      outputPath,
    ];

    const cookiesPath = getCookiesFilePath();
    if (isValidAuthCookieFile(cookiesPath)) {
      args.push("--cookies", cookiesPath);
    }

    args.push(url);

    const proc = spawn("yt-dlp", args);
    let stderr = "";

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      const match = text.match(
        /\[download\]\s+([\d.]+)%\s+of\s+~?[\d.]+\w+\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/,
      );
      if (match && onProgress) {
        onProgress({
          percent: parseFloat(match[1]),
          speed: match[2],
          eta: match[3],
        });
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        currentVideoPath = outputPath;
        try {
          const port = await startLocalMediaServer();
          resolve({
            filePath: outputPath,
            streamUrl: `http://127.0.0.1:${port}/video.mp4?t=${Date.now()}`,
            title: path.basename(outputPath),
            duration: 0,
          });
        } catch (serverErr) {
          reject(
            new Error(
              `Failed to start local streaming server: ${serverErr?.message || String(serverErr)}`,
            ),
          );
        }
      } else {
        const isAuthError =
          stderr.includes("Sign in") ||
          stderr.includes("login") ||
          stderr.includes("Private video") ||
          stderr.includes("bot") ||
          stderr.includes("HTTP Error 429") ||
          stderr.includes("confirm you're not a bot");

        const err = new Error(
          isAuthError
            ? "LOGIN_REQUIRED: This video requires authentication or cookies to access."
            : stderr || `Download failed with exit code ${code}`,
        );
        reject(err);
      }
    });

    proc.on("error", (err) => {
      reject(
        new Error(
          `yt-dlp execution error: ${err.message}. Please ensure yt-dlp is installed and in PATH.`,
        ),
      );
    });
  });
}
