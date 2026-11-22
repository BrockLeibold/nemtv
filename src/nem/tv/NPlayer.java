package nem.tv;

import android.view.Gravity;
import android.view.SurfaceView;
import android.view.View;
import android.widget.FrameLayout;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.VideoSize;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.analytics.AnalyticsListener;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import org.json.JSONObject;

/**
 * Native player (Media3 ExoPlayer) on a SurfaceView behind the transparent WebView: hardware decode straight to a
 * video plane, no JavaScript demuxing and no WebView compositing of every frame. The page keeps its own UI on top and
 * hears about the state through window.nemV(state, detail). Every method runs on the UI thread.
 */
final class NPlayer {
  final Main m; final SurfaceView sv; final String ua;
  ExoPlayer p; String url; float zoom = 1f; int vw, vh; float par = 1f;

  NPlayer(Main m, SurfaceView sv, String ua) { this.m = m; this.sv = sv; this.ua = ua; }

  void play(String u) {
    url = u;
    if (p == null) build();
    MediaItem.Builder b = new MediaItem.Builder().setUri(u);
    if (u.toLowerCase().contains("m3u8")) b.setMimeType(MimeTypes.APPLICATION_M3U8);
    p.setMediaItem(b.build()); p.prepare(); p.setPlayWhenReady(true);
    sv.setVisibility(View.VISIBLE);
  }

  private void build() {
    DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory().setUserAgent(ua)
        .setAllowCrossProtocolRedirects(true).setConnectTimeoutMs(12000).setReadTimeoutMs(20000);
    // 20-50 s buffer, start after 2 s, resume after a stall once 4 s are in
    DefaultLoadControl lc = new DefaultLoadControl.Builder().setBufferDurationsMs(20000, 50000, 2000, 4000).build();
    p = new ExoPlayer.Builder(m).setMediaSourceFactory(new DefaultMediaSourceFactory(http)).setLoadControl(lc).build();
    p.setVideoSurfaceView(sv);
    p.setAudioAttributes(AudioAttributes.DEFAULT, true);
    p.addListener(new Player.Listener() {
      @Override public void onPlaybackStateChanged(int s) {
        android.util.Log.d("NEMTV", "native state " + s + " buffered " + p.getTotalBufferedDuration() + " ms, live offset " + p.getCurrentLiveOffset() + " ms");
        m.js("window.nemV&&nemV('" + (s == Player.STATE_BUFFERING ? "buffering" : s == Player.STATE_READY ? "ready" : s == Player.STATE_ENDED ? "ended" : "idle") + "')");
      }
      @Override public void onPlayerError(PlaybackException e) {
        if (e.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) { p.seekToDefaultPosition(); p.prepare(); return; } // fell behind the live window: jump back to live
        m.js("window.nemV&&nemV('error'," + JSONObject.quote(e.getErrorCodeName()) + ")");
      }
      @Override public void onVideoSizeChanged(VideoSize v) { vw = v.width; vh = v.height; par = v.pixelWidthHeightRatio > 0 ? v.pixelWidthHeightRatio : 1f; layout(); }
    });
    p.addAnalyticsListener(new AnalyticsListener() {
      @Override public void onLoadError(AnalyticsListener.EventTime t, androidx.media3.exoplayer.source.LoadEventInfo li, androidx.media3.exoplayer.source.MediaLoadData d, java.io.IOException e, boolean canceled) { android.util.Log.d("NEMTV", "native load error " + e); }
      @Override public void onDroppedVideoFrames(AnalyticsListener.EventTime t, int n, long ms) { android.util.Log.d("NEMTV", "native dropped " + n + " frames in " + ms + " ms"); }
    });
  }

  /** Letterbox the surface to the video's shape (a SurfaceView stretches otherwise). */
  void layout() {
    View parent = (View) sv.getParent();
    int W = parent.getWidth(), H = parent.getHeight();
    FrameLayout.LayoutParams lp;
    if (vw == 0 || vh == 0 || W == 0 || H == 0) lp = new FrameLayout.LayoutParams(-1, -1, Gravity.CENTER);
    else {
      float ar = vw * par / vh;
      int w = W, h = Math.round(W / ar);
      if (h > H) { h = H; w = Math.round(H * ar); }
      lp = new FrameLayout.LayoutParams(w, h, Gravity.CENTER);
    }
    FrameLayout.LayoutParams o = (FrameLayout.LayoutParams) sv.getLayoutParams();
    if (o != null && o.width == lp.width && o.height == lp.height) return; // same size: setting it again re-triggers layout every frame
    sv.setLayoutParams(lp);
  }

  void zoom(int pct) { zoom = pct / 100f; sv.setScaleX(zoom); sv.setScaleY(zoom); }

  /** Close the stream (user left the player). */
  void stop() { url = null; release(); sv.setVisibility(View.GONE); }

  /** App went to the background: free the decoder, remember the stream. */
  void release() { if (p != null) { p.release(); p = null; } }

  /** Back in front: reopen the stream the page still shows. */
  void resume() { if (url != null) play(url); }
}
