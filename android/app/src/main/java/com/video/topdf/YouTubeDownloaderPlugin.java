package com.video.topdf;

import android.app.Dialog;
import android.content.DialogInterface;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;

@CapacitorPlugin(name = "YouTubeDownloader")
public class YouTubeDownloaderPlugin extends Plugin {

    @PluginMethod
    public void checkCookies(PluginCall call) {
        String cookies = CookieManager.getInstance().getCookie(".youtube.com");
        boolean hasCookies = cookies != null && cookies.contains("LOGIN_INFO");
        JSObject ret = new JSObject();
        ret.put("hasCookies", hasCookies);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearCookies(PluginCall call) {
        CookieManager.getInstance().removeAllCookies(value -> {
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void loginGoogle(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Dialog authDialog = new Dialog(getActivity(), android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
                WebView webView = new WebView(getActivity());
                
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setUserAgentString("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36");
                
                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

                webView.setWebViewClient(new WebViewClient() {
                    private boolean resolved = false;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        super.onPageFinished(view, url);
                        if (url != null && url.contains("youtube.com") && !url.contains("accounts.google.com") && !resolved) {
                            resolved = true;
                            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                                if (authDialog.isShowing()) {
                                    authDialog.dismiss();
                                }
                                JSObject ret = new JSObject();
                                ret.put("success", true);
                                call.resolve(ret);
                            }, 1200);
                        }
                    }
                });

                authDialog.setContentView(webView, new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                ));

                authDialog.setOnCancelListener(dialogInterface -> {
                    String cookies = CookieManager.getInstance().getCookie(".youtube.com");
                    boolean hasCookies = cookies != null && !cookies.isEmpty();
                    JSObject ret = new JSObject();
                    ret.put("success", hasCookies);
                    call.resolve(ret);
                });

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
                // Fetch YouTube video stream information locally via YouTube web client API
                String directStreamUrl = resolveYouTubeStream(videoId);
                if (directStreamUrl == null || directStreamUrl.isEmpty()) {
                    call.reject("LOGIN_REQUIRED: Could not retrieve direct stream. Authentication or cookies required.");
                    return;
                }

                // Download video file locally into app cache/files directory
                File outputDir = getContext().getCacheDir();
                File targetFile = new File(outputDir, "vidtopdf_" + videoId + ".mp4");

                URL streamUrl = new URL(directStreamUrl);
                HttpURLConnection conn = (HttpURLConnection) streamUrl.openConnection();
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36");
                
                String cookies = CookieManager.getInstance().getCookie(".youtube.com");
                if (cookies != null && !cookies.isEmpty()) {
                    conn.setRequestProperty("Cookie", cookies);
                }

                conn.connect();

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
                            JSObject progressData = new JSObject();
                            progressData.put("percent", Math.round(percent * 10.0) / 10.0);
                            progressData.put("speed", "Downloading...");
                            progressData.put("eta", "");
                            notifyListeners("youtube:progress", progressData);
                        }
                    }
                }

                JSObject result = new JSObject();
                result.put("filePath", targetFile.getAbsolutePath());
                // Capacitor local file URL
                result.put("streamUrl", "capacitor://localhost/_capacitor_file_" + targetFile.getAbsolutePath());
                result.put("title", "YouTube Video (" + videoId + ")");
                call.resolve(result);

            } catch (Exception e) {
                call.reject("Download error: " + e.getMessage());
            }
        }).start();
    }

    private String extractVideoId(String url) {
        Pattern pattern = Pattern.compile("(?:v=|/v/|youtu\\.be/|/embed/|/shorts/)([a-zA-Z0-9_-]{11})");
        Matcher matcher = pattern.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private String resolveYouTubeStream(String videoId) throws Exception {
        URL url = new URL("https://www.youtube.com/youtubei/v1/player?prettyPrint=false");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("User-Agent", "com.google.android.youtube/19.29.37 (Linux; U; Android 14) gzip");
        conn.setDoOutput(true);

        JSONObject clientObj = new JSONObject();
        clientObj.put("clientName", "ANDROID");
        clientObj.put("clientVersion", "19.29.37");
        clientObj.put("androidSdkVersion", 34);

        JSONObject contextObj = new JSONObject();
        contextObj.put("client", clientObj);

        JSONObject postData = new JSONObject();
        postData.put("context", contextObj);
        postData.put("videoId", videoId);

        byte[] postBytes = postData.toString().getBytes("UTF-8");
        conn.getOutputStream().write(postBytes);

        if (conn.getResponseCode() != 200) {
            return null;
        }

        StringBuilder response = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
        }

        JSONObject json = new JSONObject(response.toString());
        if (!json.has("streamingData")) {
            return null;
        }

        JSONObject streamingData = json.getJSONObject("streamingData");
        
        // Priority 1: Muxed formats (both video + audio)
        if (streamingData.has("formats")) {
            org.json.JSONArray formats = streamingData.getJSONArray("formats");
            for (int i = 0; i < formats.length(); i++) {
                JSONObject fmt = formats.getJSONObject(i);
                if (fmt.has("url") && fmt.has("mimeType") && fmt.getString("mimeType").contains("video/mp4")) {
                    return fmt.getString("url");
                }
            }
            // If mp4 not found, accept any format with url
            for (int i = 0; i < formats.length(); i++) {
                JSONObject fmt = formats.getJSONObject(i);
                if (fmt.has("url")) {
                    return fmt.getString("url");
                }
            }
        }

        // Priority 2: adaptiveFormats video stream
        if (streamingData.has("adaptiveFormats")) {
            org.json.JSONArray adaptive = streamingData.getJSONArray("adaptiveFormats");
            for (int i = 0; i < adaptive.length(); i++) {
                JSONObject fmt = adaptive.getJSONObject(i);
                if (fmt.has("url") && fmt.has("mimeType") && fmt.getString("mimeType").contains("video/mp4")) {
                    return fmt.getString("url");
                }
            }
        }

        return null;
    }
}
