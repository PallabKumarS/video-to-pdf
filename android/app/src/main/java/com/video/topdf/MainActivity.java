package com.video.topdf;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(YouTubeDownloaderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
