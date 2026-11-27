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
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector;
import org.json.JSONObject;

/**
 * Native player (Media3 ExoPlayer) on a SurfaceView behind the transparent WebView: hardware decode straight to a
 * video plane, no JavaScript demuxing and no WebView compositing of every frame. The page keeps its own UI on top and
 * hears about the state through window.<cb>(state, detail). Every method runs on the UI thread.
 * rect: where the video sits, as screen fractions {x, y, w, h} (multiview layouts set it). cap: pick renditions no bigger than 960x540.
 */
final class NPlayer {
  final Main m; final SurfaceView sv; final String ua, cb;
  ExoPlayer p; DefaultTrackSelector ts; String url; float zoom = 1f, volume = 1f; int vw, vh; float par = 1f;
  float[] rect = {0, 0, 1, 1}; boolean capped;

  NPlayer(Main m, SurfaceView sv, String ua, String cb) { this.m = m; this.sv = sv; this.ua = ua; this.cb = cb; }

  void play(String u) {
    url = u;
    if (p == null) build();
    MediaItem.Builder b = new MediaItem.Builder().setUri(u);
    if (u.toLowerCase().contains("m3u8")) b.setMimeType(MimeTypes.APPLICATION_M3U8);
    p.setMediaItem(b.build()); p.prepare(); p.setPlayWhenReady(true);
    sv.setVisibility(View.VISIBLE); layout();
  }

  private void build() {
    DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory().setUserAgent(ua)
        .setAllowCrossProtocolRedirects(true).setConnectTimeoutMs(12000).setReadTimeoutMs(20000);
    // 20-50 s buffer, start after 2 s, resume after a stall once 4 s are in
    DefaultLoadControl lc = new DefaultLoadControl.Builder().setBufferDurationsMs(20000, 50000, 2000, 4000).build();
    ts = new DefaultTrackSelector(m);
    p = new ExoPlayer.Builder(m).setMediaSourceFactory(new DefaultMediaSourceFactory(http)).setLoadControl(lc).setTrackSelector(ts).build();
    applyCap(); p.setVolume(volume);
    p.setVideoSurfaceView(sv);
    p.setAudioAttributes(AudioAttributes.DEFAULT, cb.equals("nemV")); // only the main player takes audio focus (else the two players pause each other)
    p.addListener(new Player.Listener() {
      @Override public void onPlaybackStateChanged(int s) {
        android.util.Log.d("NEMTV", cb + " state " + s + " buffered " + p.getTotalBufferedDuration() + " ms, live offset " + p.getCurrentLiveOffset() + " ms");
        m.js("window." + cb + "&&" + cb + "('" + (s == Player.STATE_BUFFERING ? "buffering" : s == Player.STATE_READY ? "ready" : s == Player.STATE_ENDED ? "ended" : "idle") + "')");
      }
      @Override public void onPlayerError(PlaybackException e) {
        if (e.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) { p.seekToDefaultPosition(); p.prepare(); return; } // fell behind the live window: jump back to live
        m.js("window." + cb + "&&" + cb + "('error'," + JSONObject.quote(e.getErrorCodeName()) + ")");
      }
      @Override public void onVideoSizeChanged(VideoSize v) { vw = v.width; vh = v.height; par = v.pixelWidthHeightRatio > 0 ? v.pixelWidthHeightRatio : 1f; layout(); }
    });
    p.addAnalyticsListener(new AnalyticsListener() {
      @Override public void onLoadError(AnalyticsListener.EventTime t, androidx.media3.exoplayer.source.LoadEventInfo li, androidx.media3.exoplayer.source.MediaLoadData d, java.io.IOException e, boolean canceled) { android.util.Log.d("NEMTV", cb + " load error " + e); }
      @Override public void onDroppedVideoFrames(AnalyticsListener.EventTime t, int n, long ms) { android.util.Log.d("NEMTV", cb + " dropped " + n + " frames in " + ms + " ms"); }
      @Override public void onVideoInputFormatChanged(AnalyticsListener.EventTime t, androidx.media3.common.Format f, androidx.media3.exoplayer.DecoderReuseEvaluation r) { android.util.Log.d("NEMTV", cb + " rendition " + f.width + "x" + f.height + " " + f.bitrate / 1000 + "k"); }
    });
  }

  /** Split screen: cap renditions at 960x540 (half the decode work; a half-screen tile can't show more anyway). */
  void cap(boolean on) { capped = on; applyCap(); }
  private void applyCap() {
    if (ts == null) return;
    ts.setParameters(ts.buildUponParameters().setMaxVideoSize(capped ? 960 : Integer.MAX_VALUE, capped ? 540 : Integer.MAX_VALUE));
  }

  void vol(float v) { volume = v; if (p != null) p.setVolume(v); }

  /** Letterbox the surface to the video's shape inside its slot (a SurfaceView stretches otherwise). */
  void layout() {
    View parent = (View) sv.getParent();
    int PW = parent.getWidth(), PH = parent.getHeight();
    int x = Math.round(PW * rect[0]), y = Math.round(PH * rect[1]), W = Math.round(PW * rect[2]), H = Math.round(PH * rect[3]);
    int w = W, h = H;
    if (vw != 0 && vh != 0 && W != 0 && H != 0) {
      float ar = vw * par / vh;
      h = Math.round(W / ar);
      if (h > H) { h = H; w = Math.round(H * ar); }
    }
    FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(w, h, Gravity.LEFT | Gravity.TOP);
    lp.leftMargin = x + (W - w) / 2; lp.topMargin = y + (H - h) / 2;
    FrameLayout.LayoutParams o = (FrameLayout.LayoutParams) sv.getLayoutParams();
    if (o != null && o.width == lp.width && o.height == lp.height && o.leftMargin == lp.leftMargin && o.topMargin == lp.topMargin && o.gravity == lp.gravity) return; // same: setting it again re-triggers layout every frame
    sv.setLayoutParams(lp);
  }

  void zoom(int pct) { zoom = pct / 100f; sv.setScaleX(zoom); sv.setScaleY(zoom); }

  /** Close the stream (user left the player). */
  void stop() { url = null; release(); sv.setVisibility(View.GONE); }

  /** App went to the background: free the decoder, remember the stream. */
  void release() { if (p != null) { p.release(); p = null; ts = null; } }

  /** Back in front: reopen the stream the page still shows. */
  void resume() { if (url != null) play(url); }
}
