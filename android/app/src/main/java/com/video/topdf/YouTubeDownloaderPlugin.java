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
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "YouTubeDownloader")
public class YouTubeDownloaderPlugin extends Plugin {

    private static final String VR_USER_AGENT =
            "Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/34.0.0.30.22 Chrome/124.0.6367.247 Safari/537.36";

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
                titleView.setText("Sign in to Google / YouTube");
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
                String directStreamUrl = resolveYouTubeStream(videoId);
                if (directStreamUrl == null || directStreamUrl.isEmpty()) {
                    call.reject("LOGIN_REQUIRED: Could not retrieve direct stream. Authentication or cookies required.");
                    return;
                }

                File outputDir = getContext().getCacheDir();
                File targetFile = new File(outputDir, "vidtopdf_" + videoId + ".mp4");

                HttpURLConnection conn = openConnectionWithRedirects(directStreamUrl);
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
                result.put("streamUrl", "capacitor://localhost/_capacitor_file_" + targetFile.getAbsolutePath());
                result.put("title", "YouTube Video (" + videoId + ")");
                call.resolve(result);

            } catch (Exception e) {
                String message = e.getMessage() != null ? e.getMessage() : "Unknown error";
                call.reject(message);
            }
        }).start();
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
            conn.setRequestProperty("User-Agent", VR_USER_AGENT);
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

    private String resolveYouTubeStream(String videoId) throws Exception {
        URL url = new URL("https://www.youtube.com/youtubei/v1/player?prettyPrint=false");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("User-Agent", VR_USER_AGENT);

        String cookies = getFormattedCookies();
        if (!cookies.isEmpty()) {
            conn.setRequestProperty("Cookie", cookies);
        }
        conn.setDoOutput(true);

        JSONObject clientObj = new JSONObject();
        clientObj.put("clientName", "ANDROID_VR");
        clientObj.put("clientVersion", "1.61.48");
        clientObj.put("deviceModel", "Quest 3");
        clientObj.put("osName", "Android");
        clientObj.put("osVersion", "12");

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

        if (json.has("playabilityStatus")) {
            JSONObject playability = json.getJSONObject("playabilityStatus");
            String status = playability.optString("status", "UNKNOWN");
            if (!"OK".equalsIgnoreCase(status)) {
                String reason = playability.optString("reason", "Video is unavailable or requires sign-in.");
                if ("LOGIN_REQUIRED".equalsIgnoreCase(status) || reason.toLowerCase().contains("bot") || reason.toLowerCase().contains("sign in")) {
                    throw new Exception("LOGIN_REQUIRED: " + reason);
                }
                throw new Exception(reason);
            }
        }

        if (!json.has("streamingData")) {
            return null;
        }

        JSONObject streamingData = json.getJSONObject("streamingData");

        // Strategy 1: High quality 720p/1080p MP4 from adaptiveFormats (best for video-to-pdf slide crispness)
        if (streamingData.has("adaptiveFormats")) {
            JSONArray adaptive = streamingData.getJSONArray("adaptiveFormats");
            
            // Prefer 720p MP4
            for (int i = 0; i < adaptive.length(); i++) {
                JSONObject fmt = adaptive.getJSONObject(i);
                if (fmt.has("url") && fmt.has("mimeType") && fmt.getString("mimeType").contains("video/mp4")) {
                    String quality = fmt.optString("qualityLabel", "");
                    if (quality.contains("720")) {
                        return fmt.getString("url");
                    }
                }
            }

            // Next prefer 1080p MP4
            for (int i = 0; i < adaptive.length(); i++) {
                JSONObject fmt = adaptive.getJSONObject(i);
                if (fmt.has("url") && fmt.has("mimeType") && fmt.getString("mimeType").contains("video/mp4")) {
                    String quality = fmt.optString("qualityLabel", "");
                    if (quality.contains("1080")) {
                        return fmt.getString("url");
                    }
                }
            }

            // Any MP4 adaptive format
            for (int i = 0; i < adaptive.length(); i++) {
                JSONObject fmt = adaptive.getJSONObject(i);
                if (fmt.has("url") && fmt.has("mimeType") && fmt.getString("mimeType").contains("video/mp4")) {
                    return fmt.getString("url");
                }
            }
        }

        // Strategy 2: Muxed formats (360p MP4)
        if (streamingData.has("formats")) {
            JSONArray formats = streamingData.getJSONArray("formats");
            for (int i = 0; i < formats.length(); i++) {
                JSONObject fmt = formats.getJSONObject(i);
                if (fmt.has("url") && fmt.has("mimeType") && fmt.getString("mimeType").contains("video/mp4")) {
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

        return null;
    }
}
