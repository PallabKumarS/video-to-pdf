import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const PORT = process.env.YT_SERVER_PORT || 3001;
const TEMP_DIR = os.tmpdir();
const COOKIES_FILE = path.join(TEMP_DIR, "vidtopdf_yt_cookies.txt");

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Range, Authorization",
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Range, Content-Length, Accept-Ranges",
  );
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function extractVideoId(url) {
  const match = url.match(
    /(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

function isValidAuthCookieFile(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) return false;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return /(SAPISID|SSID|HSID|SID|LOGIN_INFO|__Secure-[13]PSID)/i.test(content);
  } catch {
    return false;
  }
}

function downloadWithYtDlp(url) {
  return new Promise((resolve, reject) => {
    const videoId = extractVideoId(url) || Date.now().toString(36);
    const outputPath = path.join(TEMP_DIR, `vidtopdf_${videoId}.mp4`);

    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 50000) {
      console.log(
        `[YouTube Local Server] Using existing cached video for ${videoId}`,
      );
      resolve({
        filePath: outputPath,
        fileName: path.basename(outputPath),
        title: `YouTube Video (${videoId})`,
      });
      return;
    }

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

    if (isValidAuthCookieFile(COOKIES_FILE)) {
      args.push("--cookies", COOKIES_FILE);
    }

    args.push(url);

    const proc = spawn("yt-dlp", args);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve({
          filePath: outputPath,
          fileName: path.basename(outputPath),
          title: `YouTube Video (${videoId})`,
        });
      } else {
        const isAuthError =
          stderr.includes("Sign in") ||
          stderr.includes("login") ||
          stderr.includes("Private video") ||
          stderr.includes("bot") ||
          stderr.includes("HTTP Error 429") ||
          stderr.includes("confirm you're not a bot");

        const msg = isAuthError
          ? "LOGIN_REQUIRED: This video requires authentication or cookies to access."
          : stderr || `Download failed with exit code ${code}`;
        reject(new Error(msg));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to execute yt-dlp: ${err.message}`));
    });
  });
}

function handleStreamVideo(req, res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Video file not found");
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const chunkSizeLimit = 5 * 1024 * 1024; // 5MB chunk limit for rapid seek responsiveness
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : Math.min(start + chunkSizeLimit - 1, fileSize - 1);
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Accept-Ranges": "bytes",
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
  const pathname = reqUrl.pathname;

  try {
    if (pathname === "/api/youtube/status" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ running: true, version: "2.0.3" }));
      return;
    }

    if (pathname === "/api/youtube/check-cookies" && req.method === "GET") {
      const hasCookies = isValidAuthCookieFile(COOKIES_FILE);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ hasCookies }));
      return;
    }

    if (pathname === "/api/youtube/clear-cookies" && req.method === "POST") {
      if (fs.existsSync(COOKIES_FILE)) {
        fs.unlinkSync(COOKIES_FILE);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (pathname === "/api/youtube/save-cookies" && req.method === "POST") {
      const body = await parseJsonBody(req);
      if (body.cookies) {
        fs.writeFileSync(COOKIES_FILE, body.cookies, "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Cookies content is required" }));
      }
      return;
    }

    if (pathname === "/api/youtube/download" && req.method === "POST") {
      const body = await parseJsonBody(req);
      if (!body.url) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "YouTube URL is required" }));
        return;
      }

      try {
        const result = await downloadWithYtDlp(body.url);
        const streamUrl = `http://127.0.0.1:${PORT}/api/youtube/stream?file=${encodeURIComponent(result.fileName)}`;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            streamUrl,
            title: result.title,
            fileName: result.fileName,
          }),
        );
      } catch (dlErr) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: dlErr.message }));
      }
      return;
    }

    if (pathname === "/api/youtube/stream" && req.method === "GET") {
      const fileName = reqUrl.searchParams.get("file");
      if (
        !fileName ||
        fileName.includes("..") ||
        fileName.includes("/") ||
        fileName.includes("\\")
      ) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid file name");
        return;
      }

      const filePath = path.join(TEMP_DIR, fileName);
      handleStreamVideo(req, res, filePath);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[YouTube Local Server] Running on http://127.0.0.1:${PORT}`);
});
