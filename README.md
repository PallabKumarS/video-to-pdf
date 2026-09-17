# VidToPDF — Convert Videos to High-Quality PDFs

A modern, fast, and 100% private local Next.js + Electron application to extract high-resolution frames from videos or YouTube links and compile them into clean PDF documents.

## Key Features

- **Local Video Files & Drag-and-Drop:** Supports MP4, WebM, and OGG formats with memory-efficient client-side frame extraction.
- **YouTube Link Support:** Paste any YouTube video URL to download and process it locally using `yt-dlp`.
- **Google Sign-In & Cookie Support:** For age-restricted or private YouTube videos, sign in directly through an embedded Google login window or supply Netscape-formatted cookies. Credentials remain strictly on your local machine.
- **Background Smart Chunking:** Breaks video processing into 10-minute segments with background worker decoding.
- **Interactive Review & Sorting:** Drag-and-drop to reorder frames, fine-tune capture intervals, or remove unwanted frames before PDF generation.
- **Cross-Platform:** Runs as a web app, Electron desktop app, or Capacitor mobile app.

---

## Prerequisites

- **Node.js:** v20+ or v24+
- **yt-dlp & FFmpeg:** Required for YouTube downloads (installed on your system and accessible via PATH).

---

## Getting Started

### 1. Web Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Desktop Application (Electron)
```bash
npm run electron:dev
```

### 3. Production Build
```bash
npm run build
```

### 4. Desktop Packaging
```bash
npm run electron:build
```

### 5. Linting and Formatting (Biome)
```bash
npm run lint
npm run format
```

---

## Architecture & Security

- **Zero Server Uploads:** All video processing and PDF rendering happen in the browser or local Electron process.
- **Local Streaming:** YouTube downloads stream to the frontend via an ephemeral local HTTP server (`127.0.0.1`) supporting HTTP Range requests.
- **Secure Credentials:** Google authentication session cookies are stored exclusively in the OS temporary directory (`vidtopdf_yt_cookies.txt`).
