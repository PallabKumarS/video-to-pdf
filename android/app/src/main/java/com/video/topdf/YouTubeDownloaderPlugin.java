package com.video.topdf;

import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "YouTubeDownloader")
public class YouTubeDownloaderPlugin extends Plugin {

    private static final String BROWSER_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
    private static final String VISIONOS_USER_AGENT =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

    @PluginMethod
    public void checkCookies(PluginCall call) {
        String ytCookies = CookieManager.getInstance().getCookie("https://www.youtube.com");
        String googleCookies = CookieManager.getInstance().getCookie("https://accounts.google.com");
        boolean hasCookies = (ytCookies != null && (ytCookies.contains("LOGIN_INFO") || ytCookies.contains("SAPISID") || ytCookies.contains("SID"))) ||
                             (googleCookies != null && (googleCookies.contains("SID") || googleCookies.contains("SAPISID")));
        JSObject ret = new JSObject();
        ret.put("hasCookies", hasCookies);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearCookies(PluginCall call) {
        CookieManager.getInstance().removeAllCookies(value -> {
            CookieManager.getInstance().flush();
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void loginGoogle(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Context context = getActivity();
                Dialog authDialog = new Dialog(context, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);

                LinearLayout rootLayout = new LinearLayout(context);
                rootLayout.setOrientation(LinearLayout.VERTICAL);
                rootLayout.setLayoutParams(new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                ));

                // Top Toolbar
                LinearLayout toolbar = new LinearLayout(context);
                toolbar.setOrientation(LinearLayout.HORIZONTAL);
                toolbar.setBackgroundColor(Color.parseColor("#1f2937"));
                int toolbarHeight = (int) TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_DIP, 52, context.getResources().getDisplayMetrics());
                toolbar.setLayoutParams(new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, toolbarHeight));
                toolbar.setGravity(Gravity.CENTER_VERTICAL);
                toolbar.setPadding(20, 0, 20, 0);

                Button cancelButton = new Button(context);
                cancelButton.setText("Cancel");
                cancelButton.setTextColor(Color.parseColor("#9ca3af"));
                cancelButton.setBackgroundColor(Color.TRANSPARENT);

                TextView titleView = new TextView(context);
                titleView.setText("Sign in with Google");
                titleView.setTextColor(Color.WHITE);
                titleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
                titleView.setGravity(Gravity.CENTER);
                LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                        0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
                titleView.setLayoutParams(titleParams);

                Button doneButton = new Button(context);
                doneButton.setText("Done");
                doneButton.setTextColor(Color.parseColor("#38bdf8"));
                doneButton.setBackgroundColor(Color.TRANSPARENT);

                toolbar.addView(cancelButton);
                toolbar.addView(titleView);
                toolbar.addView(doneButton);

                // WebView
                WebView webView = new WebView(context);
                LinearLayout.LayoutParams webViewParams = new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f);
                webView.setLayoutParams(webViewParams);

                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setUserAgentString("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36");

                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);

                final boolean[] isResolved = {false};

                Runnable finishAuth = () -> {
                    if (isResolved[0]) return;
                    isResolved[0] = true;
                    cookieManager.flush();
                    if (authDialog.isShowing()) {
                        authDialog.dismiss();
                    }
                    String ytCookies = cookieManager.getCookie("https://www.youtube.com");
                    boolean success = ytCookies != null && !ytCookies.isEmpty();
                    JSObject ret = new JSObject();
                    ret.put("success", success);
                    call.resolve(ret);
                };

                cancelButton.setOnClickListener(v -> {
                    if (!isResolved[0]) {
                        isResolved[0] = true;
                        cookieManager.flush();
                        authDialog.dismiss();
                        String ytCookies = cookieManager.getCookie("https://www.youtube.com");
                        boolean success = ytCookies != null && !ytCookies.isEmpty();
                        JSObject ret = new JSObject();
                        ret.put("success", success);
                        call.resolve(ret);
                    }
                });

                doneButton.setOnClickListener(v -> finishAuth.run());

                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        cookieManager.flush();
                        if (url != null && url.contains("youtube.com") && !url.contains("accounts.google.com") && !isResolved[0]) {
                            new Handler(Looper.getMainLooper()).postDelayed(finishAuth, 1200);
                        }
                    }
                });

                rootLayout.addView(toolbar);
                rootLayout.addView(webView);

                authDialog.setContentView(rootLayout);
                authDialog.setOnCancelListener(dialogInterface -> finishAuth.run());

                authDialog.show();
                webView.loadUrl("https://accounts.google.com/AccountChooser?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Faction_handle_signin%3Dtrue");

            } catch (Exception e) {
                call.reject("Failed to open login dialog: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void downloadVideo(PluginCall call) {
        String videoUrl = call.getString("url");
        if (videoUrl == null || videoUrl.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        String videoId = extractVideoId(videoUrl);
        if (videoId == null) {
            call.reject("Invalid YouTube URL");
            return;
        }

        new Thread(() -> {
            try {
                // Step 1: Load video watch page to retrieve session cookies, visitor data, and signature timestamp
                URL watchUrl = new URL("https://www.youtube.com/watch?v=" + videoId);
                HttpURLConnection watchConn = (HttpURLConnection) watchUrl.openConnection();
                watchConn.setRequestProperty("User-Agent", BROWSER_USER_AGENT);
                watchConn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
                String savedCookies = getFormattedCookies();
                if (!savedCookies.isEmpty()) {
                    watchConn.setRequestProperty("Cookie", savedCookies);
                }

                StringBuilder htmlBuilder = new StringBuilder();
                StringBuilder watchCookiesBuilder = new StringBuilder();
                Map<String, List<String>> headerFields = watchConn.getHeaderFields();
                List<String> setCookies = headerFields.get("Set-Cookie");
                if (setCookies != null) {
                    for (String sc : setCookies) {
                        String cleanCookie = sc.split(";")[0].trim();
                        if (!cleanCookie.isEmpty()) {
                            if (watchCookiesBuilder.length() > 0) watchCookiesBuilder.append("; ");
                            watchCookiesBuilder.append(cleanCookie);
                        }
                    }
                }

                try (BufferedReader reader = new BufferedReader(new InputStreamReader(watchConn.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        htmlBuilder.append(line);
                    }
                }

                String html = htmlBuilder.toString();
                String visitorData = "";
                Pattern vPattern = Pattern.compile("\"VISITOR_DATA\":\\s*\"([^\"]+)\"");
                Matcher vMatcher = vPattern.matcher(html);
                if (vMatcher.find()) {
                    visitorData = vMatcher.group(1);
                }

                int signatureTimestamp = 20710;
                Pattern stsPattern = Pattern.compile("\"signatureTimestamp\":\\s*(\\d+)");
                Matcher stsMatcher = stsPattern.matcher(html);
                if (stsMatcher.find()) {
                    try {
                        signatureTimestamp = Integer.parseInt(stsMatcher.group(1));
                    } catch (Exception ignored) {}
                }

                // Step 2: Query Innertube Player API using VISIONOS client profile
                URL playerUrl = new URL("https://www.youtube.com/youtubei/v1/player?prettyPrint=false");
                HttpURLConnection playerConn = (HttpURLConnection) playerUrl.openConnection();
                playerConn.setRequestMethod("POST");
                playerConn.setRequestProperty("Content-Type", "application/json");
                playerConn.setRequestProperty("User-Agent", VISIONOS_USER_AGENT);
                playerConn.setRequestProperty("X-Youtube-Client-Name", "101");
                playerConn.setRequestProperty("X-Youtube-Client-Version", "1.02");
                playerConn.setRequestProperty("Origin", "https://www.youtube.com");
                if (!visitorData.isEmpty()) {
                    playerConn.setRequestProperty("X-Goog-Visitor-Id", visitorData);
                }

                StringBuilder combinedCookies = new StringBuilder();
                if (watchCookiesBuilder.length() > 0) {
                    combinedCookies.append(watchCookiesBuilder);
                }
                if (!savedCookies.isEmpty()) {
                    if (combinedCookies.length() > 0) combinedCookies.append("; ");
                    combinedCookies.append(savedCookies);
                }
                combinedCookies.append("; GPS=1; PREF=hl=en&tz=UTC; SOCS=CAI;");
                playerConn.setRequestProperty("Cookie", combinedCookies.toString());
                playerConn.setDoOutput(true);

                JSONObject clientObj = new JSONObject();
                clientObj.put("clientName", "VISIONOS");
                clientObj.put("clientVersion", "1.02");
                clientObj.put("deviceMake", "Apple");
                clientObj.put("deviceModel", "RealityDevice17,1");
                clientObj.put("osName", "visionOS");
                clientObj.put("osVersion", "26.5.23O471");
                clientObj.put("hl", "en");
                clientObj.put("timeZone", "UTC");
                clientObj.put("utcOffsetMinutes", 0);

                JSONObject contextObj = new JSONObject();
                contextObj.put("client", clientObj);

                JSONObject contentPlaybackContext = new JSONObject();
                contentPlaybackContext.put("html5Preference", "HTML5_PREF_WANTS");
                contentPlaybackContext.put("signatureTimestamp", signatureTimestamp);

                JSONObject playbackContext = new JSONObject();
                playbackContext.put("contentPlaybackContext", contentPlaybackContext);

                JSONObject postData = new JSONObject();
                postData.put("context", contextObj);
                postData.put("videoId", videoId);
                postData.put("playbackContext", playbackContext);
                postData.put("contentCheckOk", true);
                postData.put("racyCheckOk", true);

                byte[] postBytes = postData.toString().getBytes("UTF-8");
                try (OutputStream os = playerConn.getOutputStream()) {
                    os.write(postBytes);
                }

                if (playerConn.getResponseCode() != 200) {
                    call.reject("Player API request failed with HTTP " + playerConn.getResponseCode());
                    return;
                }

                StringBuilder playerRespBuilder = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(playerConn.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        playerRespBuilder.append(line);
                    }
                }

                JSONObject playerJson = new JSONObject(playerRespBuilder.toString());
                if (playerJson.has("playabilityStatus")) {
                    JSONObject playability = playerJson.getJSONObject("playabilityStatus");
                    String status = playability.optString("status", "UNKNOWN");
                    if (!"OK".equalsIgnoreCase(status)) {
                        String reason = playability.optString("reason", "Video is unavailable or requires sign-in.");
                        if ("LOGIN_REQUIRED".equalsIgnoreCase(status) || reason.toLowerCase().contains("bot") || reason.toLowerCase().contains("sign in")) {
                            call.reject("LOGIN_REQUIRED: " + reason);
                        } else {
                            call.reject(reason);
                        }
                        return;
                    }
                }

                if (!playerJson.has("streamingData")) {
                    call.reject("No streaming data available for this video.");
                    return;
                }

                JSONObject streamingData = playerJson.getJSONObject("streamingData");
                File outputDir = getContext().getCacheDir();
                File targetFile = new File(outputDir, "vidtopdf_" + videoId + ".mp4");

                // Case A: Direct Progressive Stream URL exists
                String directUrl = extractDirectStreamUrl(streamingData);
                if (directUrl != null && !directUrl.isEmpty()) {
                    downloadDirectStream(directUrl, targetFile, call);
                    return;
                }

                // Case B: HLS Manifest URL exists
                if (streamingData.has("hlsManifestUrl")) {
                    String hlsManifestUrl = streamingData.getString("hlsManifestUrl");
                    downloadHlsStream(hlsManifestUrl, targetFile, videoId, call);
                    return;
                }

                call.reject("Could not find a playable stream URL for this video.");

            } catch (Exception e) {
                String message = e.getMessage() != null ? e.getMessage() : "Unknown error";
                call.reject(message);
            }
        }).start();
    }

    private String extractDirectStreamUrl(JSONObject streamingData) {
        try {
            if (streamingData.has("formats")) {
                JSONArray formats = streamingData.getJSONArray("formats");
                for (int i = 0; i < formats.length(); i++) {
                    JSONObject fmt = formats.getJSONObject(i);
                    if (fmt.has("url") && fmt.optString("mimeType", "").contains("video/mp4")) {
                        return fmt.getString("url");
                    }
                }
                for (int i = 0; i < formats.length(); i++) {
                    JSONObject fmt = formats.getJSONObject(i);
                    if (fmt.has("url")) {
                        return fmt.getString("url");
                    }
                }
            }

            if (streamingData.has("adaptiveFormats")) {
                JSONArray adaptive = streamingData.getJSONArray("adaptiveFormats");
                for (int i = 0; i < adaptive.length(); i++) {
                    JSONObject fmt = adaptive.getJSONObject(i);
                    if (fmt.has("url") && fmt.optString("mimeType", "").contains("video/mp4")) {
                        String quality = fmt.optString("qualityLabel", "");
                        if (quality.contains("720") || quality.contains("1080")) {
                            return fmt.getString("url");
                        }
                    }
                }
                for (int i = 0; i < adaptive.length(); i++) {
                    JSONObject fmt = adaptive.getJSONObject(i);
                    if (fmt.has("url") && fmt.optString("mimeType", "").contains("video/mp4")) {
                        return fmt.getString("url");
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void downloadDirectStream(String streamUrl, File targetFile, PluginCall call) {
        try {
            HttpURLConnection conn = openConnectionWithRedirects(streamUrl);
            int responseCode = conn.getResponseCode();
            if (responseCode >= 400) {
                call.reject("Stream request failed with HTTP " + responseCode);
                return;
            }

            long totalBytes = conn.getContentLengthLong();
            long downloadedBytes = 0;

            try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(targetFile)) {
                byte[] buffer = new byte[64 * 1024];
                int bytesRead;
                long lastEmitTime = System.currentTimeMillis();

                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                    downloadedBytes += bytesRead;

                    long now = System.currentTimeMillis();
                    if (now - lastEmitTime > 300 && totalBytes > 0) {
                        lastEmitTime = now;
                        double percent = (downloadedBytes * 100.0) / totalBytes;
                        emitProgress(Math.round(percent * 10.0) / 10.0, "Downloading...");
                    }
                }
            }

            emitProgress(100.0, "Complete");
            JSObject result = new JSObject();
            result.put("filePath", targetFile.getAbsolutePath());
            result.put("streamUrl", "capacitor://localhost/_capacitor_file_" + targetFile.getAbsolutePath());
            result.put("title", targetFile.getName());
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Download error: " + e.getMessage());
        }
    }

    private void downloadHlsStream(String hlsManifestUrl, File targetFile, String videoId, PluginCall call) {
        try {
            // Fetch Master Playlist
            URL mUrl = new URL(hlsManifestUrl);
            HttpURLConnection mConn = (HttpURLConnection) mUrl.openConnection();
            mConn.setRequestProperty("User-Agent", BROWSER_USER_AGENT);

            List<String> masterLines = new ArrayList<>();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(mConn.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    masterLines.add(line.trim());
                }
            }

            // Find 720p or 360p sub-stream playlist URL
            String subPlaylistUrl = "";
            for (int i = 0; i < masterLines.size(); i++) {
                String line = masterLines.get(i);
                if (line.contains("RESOLUTION=1280x720") || line.contains("RESOLUTION=640x360")) {
                    if (i + 1 < masterLines.size()) {
                        subPlaylistUrl = masterLines.get(i + 1);
                        if (line.contains("RESOLUTION=1280x720")) break;
                    }
                }
            }
            if (subPlaylistUrl.isEmpty()) {
                for (String line : masterLines) {
                    if (line.startsWith("https://")) {
                        subPlaylistUrl = line;
                        break;
                    }
                }
            }

            if (subPlaylistUrl.isEmpty()) {
                call.reject("Could not find HLS video stream variant.");
                return;
            }

            // Fetch Sub Playlist
            URL subUrl = new URL(subPlaylistUrl);
            HttpURLConnection subConn = (HttpURLConnection) subUrl.openConnection();
            subConn.setRequestProperty("User-Agent", BROWSER_USER_AGENT);

            List<String> segmentUrls = new ArrayList<>();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(subConn.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String trimmed = line.trim();
                    if (trimmed.startsWith("https://")) {
                        segmentUrls.add(trimmed);
                    }
                }
            }

            if (segmentUrls.isEmpty()) {
                call.reject("HLS stream has no playable video segments.");
                return;
            }

            // Sequentially download and stitch segments into standard video file
            int totalSegments = segmentUrls.size();
            byte[] buffer = new byte[64 * 1024];

            try (FileOutputStream out = new FileOutputStream(targetFile)) {
                for (int i = 0; i < totalSegments; i++) {
                    String segUrl = segmentUrls.get(i);
                    URL sUrl = new URL(segUrl);
                    HttpURLConnection sConn = (HttpURLConnection) sUrl.openConnection();
                    sConn.setRequestProperty("User-Agent", BROWSER_USER_AGENT);

                    try (InputStream in = sConn.getInputStream()) {
                        int read;
                        while ((read = in.read(buffer)) != -1) {
                            out.write(buffer, 0, read);
                        }
                    }

                    double percent = Math.round(((i + 1) * 1000.0) / totalSegments) / 10.0;
                    emitProgress(percent, (i + 1) + "/" + totalSegments + " segments");
                }
            }

            emitProgress(100.0, "Complete");
            JSObject result = new JSObject();
            result.put("filePath", targetFile.getAbsolutePath());
            result.put("streamUrl", "capacitor://localhost/_capacitor_file_" + targetFile.getAbsolutePath());
            result.put("title", "YouTube Video (" + videoId + ")");
            call.resolve(result);

        } catch (Exception e) {
            call.reject("HLS download error: " + e.getMessage());
        }
    }

    private void emitProgress(double percent, String speed) {
        JSObject progressData = new JSObject();
        progressData.put("percent", percent);
        progressData.put("speed", speed);
        progressData.put("eta", "");
        notifyListeners("youtube:progress", progressData);
    }

    private HttpURLConnection openConnectionWithRedirects(String initialUrl) throws Exception {
        String currentUrl = initialUrl;
        HttpURLConnection conn;
        int redirects = 0;
        String cookies = getFormattedCookies();

        while (true) {
            URL url = new URL(currentUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setRequestProperty("User-Agent", BROWSER_USER_AGENT);
            if (!cookies.isEmpty()) {
                conn.setRequestProperty("Cookie", cookies);
            }

            int status = conn.getResponseCode();
            if (status == HttpURLConnection.HTTP_MOVED_TEMP ||
                status == HttpURLConnection.HTTP_MOVED_PERM ||
                status == HttpURLConnection.HTTP_SEE_OTHER ||
                status == 307 || status == 308) {
                
                redirects++;
                if (redirects > 5) {
                    throw new Exception("Too many redirects");
                }
                String location = conn.getHeaderField("Location");
                if (location != null && !location.isEmpty()) {
                    currentUrl = location;
                    conn.disconnect();
                    continue;
                }
            }
            break;
        }

        return conn;
    }

    private String extractVideoId(String url) {
        Pattern pattern = Pattern.compile("(?:v=|/v/|youtu\\.be/|/embed/|/shorts/)([a-zA-Z0-9_-]{11})");
        Matcher matcher = pattern.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private String getFormattedCookies() {
        String ytCookies = CookieManager.getInstance().getCookie("https://www.youtube.com");
        String googleCookies = CookieManager.getInstance().getCookie("https://accounts.google.com");
        StringBuilder sb = new StringBuilder();
        if (ytCookies != null && !ytCookies.isEmpty()) {
            sb.append(ytCookies);
        }
        if (googleCookies != null && !googleCookies.isEmpty()) {
            if (sb.length() > 0) {
                sb.append("; ");
            }
            sb.append(googleCookies);
        }
        return sb.toString();
    }
}
