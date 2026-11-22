#!/bin/bash
# builds NEMTV.apk with raw SDK tools (no gradle)
# `bash build.sh lite` builds NEMTV-lite.apk instead: lite/index.html + the small assets only (no guide), same package and key
set -e
cd "$(dirname "$0")"
SDK="$LOCALAPPDATA/Android/Sdk"; BT="$SDK/build-tools/36.1.0"; AJ="$SDK/platforms/android-34/android.jar"
rm -rf out && mkdir -p out/cls
if [ "$1" = lite ]; then
  A=out/lite-assets; APK=NEMTV-lite.apk; mkdir -p "$A"
  cp assets/categories.js assets/hls.min.js assets/jersey.ttf assets/nemtv-logo.png assets/nhl_logos.js assets/nhl_schedule.js "$A"/
  for f in config.js stremio.json; do if [ -f "assets/$f" ]; then cp "assets/$f" "$A"/; fi; done # local-only (gitignored): playlist + addon feed
  cp lite/index.html "$A"/index.html; cp lite/inter-bold.ttf "$A"/
else
  A=assets; APK=NEMTV.apk
  rm -rf assets/guide && mkdir -p assets/guide && cp -r guide/index.html guide/deck.css guide/deck.js guide/news.json guide/data guide/heroes assets/guide/ && [ -d guide/logos ] && cp -r guide/logos assets/guide/ || true
fi
"$BT/aapt2.exe" compile --dir res -o out/res.zip
"$BT/aapt2.exe" link -o out/base.apk out/res.zip --manifest AndroidManifest.xml -I "$AJ" --min-sdk-version 21 --target-sdk-version 34 -A "$A"
LJ=$(ls libs/jars/*.jar | tr '
' ';') # Media3 ExoPlayer + Guava (native player, NPlayer.java)
javac -g:source --release 8 -cp "$AJ;$LJ" -d out/cls src/nem/tv/*.java 2>&1 | grep -v "^Note\|warning" || true
cmd //c "$(cygpath -w "$BT/d8.bat")" --min-api 21 --lib "$(cygpath -w "$AJ")" --output out $(find out/cls -name '*.class' | sed 's|^|out/|;s|^out/out/|out/|') libs/jars/*.jar
(cd out && jar uf base.apk classes*.dex)
[ -f debug.keystore ] || keytool -genkeypair -keystore debug.keystore -storepass android -keypass android -alias k -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=NEMTV" 2>/dev/null
"$BT/zipalign.exe" -f 4 out/base.apk out/aligned.apk
cmd //c "$(cygpath -w "$BT/apksigner.bat")" sign --ks debug.keystore --ks-pass pass:android --out $APK out/aligned.apk
echo built $APK
