#!/bin/bash
# builds NEMTV.apk with raw SDK tools (no gradle)
set -e
cd "$(dirname "$0")"
SDK="$LOCALAPPDATA/Android/Sdk"; BT="$SDK/build-tools/36.1.0"; AJ="$SDK/platforms/android-34/android.jar"
rm -rf assets/guide && mkdir -p assets/guide && cp -r guide/index.html guide/deck.css guide/deck.js guide/news.json guide/data guide/heroes assets/guide/ && [ -d guide/logos ] && cp -r guide/logos assets/guide/ || true
rm -rf out && mkdir -p out/cls
"$BT/aapt2.exe" compile --dir res -o out/res.zip
"$BT/aapt2.exe" link -o out/base.apk out/res.zip --manifest AndroidManifest.xml -I "$AJ" --min-sdk-version 21 --target-sdk-version 34 -A assets
javac -g:source --release 8 -cp "$AJ" -d out/cls src/nem/tv/*.java 2>&1 | grep -v "^Note\|warning" || true
cmd //c "$(cygpath -w "$BT/d8.bat")" --min-api 21 --lib "$(cygpath -w "$AJ")" --output out $(find out/cls -name '*.class' | sed 's|^|out/|;s|^out/out/|out/|')
(cd out && jar uf base.apk classes.dex)
[ -f debug.keystore ] || keytool -genkeypair -keystore debug.keystore -storepass android -keypass android -alias k -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=NEMTV" 2>/dev/null
"$BT/zipalign.exe" -f 4 out/base.apk out/aligned.apk
cmd //c "$(cygpath -w "$BT/apksigner.bat")" sign --ks debug.keystore --ks-pass pass:android --out NEMTV.apk out/aligned.apk
echo built NEMTV.apk
