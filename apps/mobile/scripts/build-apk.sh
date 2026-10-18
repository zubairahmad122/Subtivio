#!/usr/bin/env bash
# Builds a standalone release APK on this machine (no Expo cloud).
# Needs the Android SDK (ANDROID_HOME) and JDK 17.
set -euo pipefail
cd "$(dirname "$0")/.."

npx expo prebuild --platform android --no-install
(cd android && ./gradlew assembleRelease)

echo
echo "APK ready: apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
echo "Install on a USB-connected phone: pnpm install:apk"
