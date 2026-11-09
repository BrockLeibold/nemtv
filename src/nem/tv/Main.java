package nem.tv;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONArray;

public class Main extends Activity {
  WebView w;
  java.io.File gdir;

  static byte[] readAll(java.io.File f) throws Exception {
    java.io.FileInputStream i = new java.io.FileInputStream(f);
    ByteArrayOutputStream o = new ByteArrayOutputStream();
    byte[] buf = new byte[65536]; int n;
    while ((n = i.read(buf)) > 0) o.write(buf, 0, n);
    i.close(); return o.toByteArray();
  }

  static String mime(String p) {
    if (p.endsWith(".html")) return "text/html"; if (p.endsWith(".json")) return "application/json";
    if (p.endsWith(".js")) return "application/javascript"; if (p.endsWith(".css")) return "text/css";
    if (p.endsWith(".svg")) return "image/svg+xml"; if (p.endsWith(".png")) return "image/png";
    if (p.endsWith(".webp")) return "image/webp"; if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
    return "application/octet-stream";
  }

  // https://guide.nemtv.local/<path>: cached git copy first, bundled snapshot second
  android.webkit.WebResourceResponse guide(String path, String zoomQ) {
    android.util.Log.d("NEMTV", "guide req " + path);
    try {
      if (path.equals("/") || path.length() == 0) path = "/index.html";
      byte[] d = null;
      if (path.equals("/_nav.js")) d = readAsset("gx/nav.js");
      else if (path.equals("/_dark.css")) d = readAsset("gx/dark.css");
      else {
        java.io.File f = new java.io.File(gdir, path.substring(1));
        if (f.getCanonicalPath().startsWith(gdir.getCanonicalPath()) && f.isFile()) d = readAll(f);
        else d = readAsset("guide" + path);
      }
      if (path.equals("/index.html")) {
        String h = new String(d, "UTF-8"), add = "<link rel=stylesheet href=/_dark.css><script src=/_nav.js></script>";
        int i = h.lastIndexOf("</body>");
        h = i < 0 ? h + add : h.substring(0, i) + add + h.substring(i);
        int j = h.indexOf("</head>");
        if (j >= 0) h = h.substring(0, j) + "<style>html{zoom:" + zoomQ + "}</style>" + h.substring(j);
        d = h.getBytes("UTF-8");
      }
      java.util.HashMap<String, String> hd = new java.util.HashMap<String, String>();
      hd.put("Access-Control-Allow-Origin", "*"); hd.put("Cache-Control", "no-cache");
      return new android.webkit.WebResourceResponse(mime(path), "UTF-8", 200, "OK", hd, new java.io.ByteArrayInputStream(d));
    } catch (Exception x) {
      android.util.Log.d("NEMTV", "guide fail " + path + " " + x);
      return new android.webkit.WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new java.util.HashMap<String, String>(), new java.io.ByteArrayInputStream(new byte[0]));
    }
  }

  byte[] readAsset(String n) throws Exception {
    InputStream i;
    try { i = getAssets().open(n); } catch (java.io.IOException e) { i = getAssets().open(n.replace("/", "\\")); } // aapt2 on Windows stores sub-folder paths with backslashes
    ByteArrayOutputStream o = new ByteArrayOutputStream();
    byte[] buf = new byte[65536]; int k;
    while ((k = i.read(buf)) > 0) o.write(buf, 0, k);
    i.close(); return o.toByteArray();
  }

  static byte[] fetch(String u, int readMs) throws Exception {
    HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
    c.setConnectTimeout(15000); c.setReadTimeout(readMs);
    c.setRequestProperty("User-Agent", "NEMTV");
    InputStream i = c.getInputStream();
    ByteArrayOutputStream o = new ByteArrayOutputStream();
    byte[] buf = new byte[65536]; int n;
    while ((n = i.read(buf)) > 0) o.write(buf, 0, n);
    return o.toByteArray();
  }

  void js(final String code) {
    runOnUiThread(new Runnable() { public void run() { w.evaluateJavascript(code, null); } });
  }

  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    gdir = new java.io.File(getFilesDir(), "guide"); gdir.mkdirs();
    w = new WebView(this);
    w.setWebViewClient(new android.webkit.WebViewClient() {
      @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView v, android.webkit.WebResourceRequest r) {
        android.net.Uri u = r.getUrl();
        if ("guide.nemtv.local".equals(u.getHost())) { String z = u.getQueryParameter("z"); float zf = 1f; try { zf = Float.parseFloat(z); } catch (Exception x) {} if (zf < .3f || zf > 2f) zf = 1f; return guide(u.getPath() == null ? "/" : u.getPath(), String.valueOf(zf)); }
        return null;
      }
    });
    w.setBackgroundColor(0xFF0D0C0F);
    WebSettings s = w.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    // page is file://, streams are https on other hosts: let hls.js XHR across origins
    s.setAllowUniversalAccessFromFileURLs(true);
    s.setAllowFileAccessFromFileURLs(true);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    w.setWebChromeClient(new android.webkit.WebChromeClient() {
      @Override public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
        android.util.Log.d("NEMTV", m.message() + " @" + m.lineNumber());
        return true;
      }
    });
    w.addJavascriptInterface(new Object() {
      // fetch playlist natively: file:// pages can't do cross-origin fetch()
      @JavascriptInterface public void load(final String u) {
        new Thread(new Runnable() { public void run() {
          String r, e = "";
          try { r = new String(fetch(u, 30000), "UTF-8"); } catch (Exception x) { r = ""; e = String.valueOf(x.getMessage()); }
          js("gotList(" + org.json.JSONObject.quote(r) + "," + org.json.JSONObject.quote(e) + ")");
        }}).start();
      }

      // guide: download epg.xml, keep only hockey programmes, hand JS {channelId:[[startMs,stopMs,text]]}
      @JavascriptInterface public void epg(final String u) {
        new Thread(new Runnable() { public void run() {
          String out = "{}", e = "";
          try {
            java.io.InputStream in = new java.io.ByteArrayInputStream(fetch(u, 60000));
            org.xmlpull.v1.XmlPullParser x = android.util.Xml.newPullParser();
            x.setInput(in, "UTF-8");
            java.text.SimpleDateFormat f = new java.text.SimpleDateFormat("yyyyMMddHHmmss Z", java.util.Locale.US);
            org.json.JSONObject all = new org.json.JSONObject();
            String ch = "", st = "", en = "", tag = ""; StringBuilder tx = new StringBuilder();
            for (int ev = x.getEventType(); ev != org.xmlpull.v1.XmlPullParser.END_DOCUMENT; ev = x.next()) {
              if (ev == org.xmlpull.v1.XmlPullParser.START_TAG) {
                tag = x.getName();
                if (tag.equals("programme")) { ch = x.getAttributeValue(null, "channel"); st = x.getAttributeValue(null, "start"); en = x.getAttributeValue(null, "stop"); tx.setLength(0); }
              } else if (ev == org.xmlpull.v1.XmlPullParser.TEXT) {
                if (tag.equals("title") || tag.equals("sub-title") || tag.equals("desc")) tx.append(x.getText()).append(" | ");
              } else if (ev == org.xmlpull.v1.XmlPullParser.END_TAG) {
                if (x.getName().equals("programme")) {
                  String t = tx.toString();
                  if (t.matches("(?is).*(nhl|hockey).*")) {
                    if (st.length() == 14) st += " +0000"; if (en.length() == 14) en += " +0000";
                    org.json.JSONArray a = all.optJSONArray(ch); if (a == null) { a = new org.json.JSONArray(); all.put(ch, a); }
                    org.json.JSONArray r = new org.json.JSONArray();
                    r.put(f.parse(st).getTime()); r.put(f.parse(en).getTime()); r.put(t.length() > 300 ? t.substring(0, 300) : t);
                    a.put(r);
                  }
                }
                tag = "";
              }
            }
            out = all.toString();
          } catch (Exception x) { e = String.valueOf(x.getMessage()); }
          js("gotEpg(" + out + "," + org.json.JSONObject.quote(e) + ")");
        }}).start();
      }

      // generic native GET (NHL scores): result goes to window[cb](text, err)
      @JavascriptInterface public void get(final String u, final String cb) {
        new Thread(new Runnable() { public void run() {
          String r, e = "";
          try { r = new String(fetch(u, 15000), "UTF-8"); } catch (Exception x) { r = ""; e = String.valueOf(x.getMessage()); }
          js(cb + "(" + org.json.JSONObject.quote(r) + "," + org.json.JSONObject.quote(e) + ")");
        }}).start();
      }

      // pull guide/ from the GitHub repo into filesDir/guide (changed files only, by blob sha)
      @JavascriptInterface public void guideSync(final String repo, final String branch) {
        new Thread(new Runnable() { public void run() {
          int n = 0; String err = "";
          try {
            java.io.File mf = new java.io.File(getFilesDir(), "guide.manifest.json");
            org.json.JSONObject have = new org.json.JSONObject();
            if (mf.exists()) have = new org.json.JSONObject(new String(readAll(mf), "UTF-8"));
            JSONArray tree = new org.json.JSONObject(new String(fetch(
              "https://api.github.com/repos/" + repo + "/git/trees/" + branch + "?recursive=1", 30000), "UTF-8")).getJSONArray("tree");
            for (int i = 0; i < tree.length(); i++) {
              org.json.JSONObject t = tree.getJSONObject(i);
              String path = t.getString("path");
              if (!"blob".equals(t.getString("type")) || !path.startsWith("guide/")) continue;
              String sha = t.getString("sha"), rel = path.substring(6);
              if (sha.equals(have.optString(rel))) continue;
              byte[] d = fetch("https://raw.githubusercontent.com/" + repo + "/" + branch + "/" + path, 60000);
              java.io.File f = new java.io.File(gdir, rel);
              f.getParentFile().mkdirs();
              java.io.File tmp = new java.io.File(f.getPath() + ".tmp");
              java.io.FileOutputStream o = new java.io.FileOutputStream(tmp); o.write(d); o.close();
              f.delete(); tmp.renameTo(f);
              have.put(rel, sha); n++;
              java.io.FileOutputStream m = new java.io.FileOutputStream(mf); m.write(have.toString().getBytes("UTF-8")); m.close();
            }
          } catch (Exception x) { err = String.valueOf(x.getMessage()); }
          js("guideSynced(" + n + "," + org.json.JSONObject.quote(err) + ")");
        }}).start();
      }
    }, "Android");
    w.loadUrl("file:///android_asset/index.html");
    setContentView(w);
    w.requestFocus();
  }

  @Override public void onWindowFocusChanged(boolean f) {
    super.onWindowFocusChanged(f);
    if (f) w.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
  }

  @Override public void onBackPressed() {
    w.evaluateJavascript("nemBack()", new android.webkit.ValueCallback<String>() {
      public void onReceiveValue(String v) { if ("false".equals(v)) finish(); }
    });
  }
}
