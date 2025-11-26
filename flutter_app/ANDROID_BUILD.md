# Android Build & Deployment Guide

## Prerequisites

- Android Studio 2021.1+
- Android SDK 34+
- JDK 11+
- Minimum API level: 21
- Target API level: 34

## Build Configuration

### AndroidManifest.xml

Key permissions are automatically added by Flutter plugins:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### build.gradle

The app uses:
- Kotlin 1.7+
- Gradle 7.5+
- Android Gradle Plugin 7.2+

### Key Dependencies

The following are in `pubspec.yaml` and will be resolved:

```gradle
// Supabase & Auth
com.supabase:supabase-android

// HTTP Client
com.squareup.okhttp3:okhttp

// JSON Processing
com.google.code.gson:gson
```

## Building for Android

### 1. Clean Build

```bash
flutter clean
flutter pub get
cd android
./gradlew clean
cd ..
```

### 2. Generate Keystore (First Time Only)

```bash
keytool -genkey -v -keystore ~/justwrite-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias justwrite
```

**Save the keystore location and passwords securely!**

### 3. Create Key Properties File

Create `android/key.properties`:

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=justwrite
storeFile=/Users/your-username/justwrite-keystore.jks
```

(On Windows, use full path like `C:\\Users\\...\\justwrite-keystore.jks`)

### 4. Update build.gradle

Edit `android/app/build.gradle`:

```gradle
// Add after android {
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        shrinkResources true
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 5. Build APK (Debug Installation)

```bash
flutter build apk --debug
# Output: build/app/outputs/flutter-app.apk
```

### 6. Build APK (Release)

```bash
flutter build apk --release
# Output: build/app/outputs/apk/release/app-release.apk
```

### 7. Build App Bundle (Google Play)

```bash
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

## Installation

### Install APK on Connected Device

```bash
flutter install
# or
adb install build/app/outputs/apk/release/app-release.apk
```

### Install on Android Emulator

```bash
flutter run -d emulator-5554
```

## Google Play Deployment

### 1. Create Google Play Account

- Go to https://play.google.com/console
- Create developer account ($25 one-time fee)

### 2. Create New App

1. Click "Create app"
2. Enter app name: "JustWrite"
3. Select category: "Productivity"
4. Fill out required information

### 3. Prepare Store Listing

**Required:**
- App title: "JustWrite"
- Short description: "AI-powered journaling and task management"
- Full description: (see below)
- Screenshots (minimum 2, recommended 5+)
- App icon: 512x512 PNG
- Feature graphic: 1024x500 PNG

**Full Description:**
```
JustWrite: Your personal AI journal

📝 Daily Journaling
- Create entries with mood tracking (emoji slider)
- 10 science-backed prompts based on CBT, gratitude, and goal-setting
- Auto-save as you type

✨ AI-Powered Task Extraction
- Groq LLM automatically extracts actionable tasks from your entries
- Get a summary of your thoughts and feelings
- Smart task prioritization (high/medium/low)

✅ Task Management
- Organize tasks by status
- Track if-then implementation plans
- Set due dates and reminders

🔐 Secure & Private
- Supabase authentication with magic links
- End-to-end encrypted communication
- Your data stays yours

🎮 Arcade Theme UI
- Retro-inspired design with modern functionality
- Smooth animations and intuitive navigation

Features:
- Real-time synchronization across devices
- Offline support
- Export entries and tasks
- Multiple LLM providers (Groq, OpenAI, Gemini)

Transform your thoughts into action. Start journaling today!
```

### 4. Upload App Bundle

1. Navigate to "Internal testing" release
2. Click "Create new release"
3. Upload `app-release.aab`
4. Review changes and save

### 5. Rollout Stages

**Internal Testing** → **Closed Testing** → **Open Testing** → **Production**

**Timeline:**
- Internal testing: 1-2 hours
- Closed testing: 1 day
- Open testing: 3-7 days
- Production: 2-4 hours

### 6. Submit for Review

1. Complete store listing
2. Fill content rating questionnaire
3. Set pricing and distribution
4. Click "Submit"

## Troubleshooting

### Gradle Build Error

```bash
cd android
./gradlew --refresh-dependencies
./gradlew clean
cd ..
flutter build apk --release
```

### Keystore Error

Verify keystore exists:
```bash
keytool -list -v -keystore ~/justwrite-keystore.jks
```

Re-create if needed:
```bash
keytool -genkey -v -keystore ~/justwrite-keystore-new.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias justwrite
```

### APK Size Too Large

Enable ProGuard/R8:
```gradle
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### Network Error on Device

Ensure device and development machine are on same WiFi:
```bash
adb tcpip 5555
adb connect <device-ip>:5555
flutter run
```

## Signing Verification

Verify APK signing:
```bash
jarsigner -verify -verbose build/app/outputs/apk/release/app-release.apk
```

Extract signing certificate:
```bash
keytool -printcert -jarfile build/app/outputs/apk/release/app-release.apk
```

## Performance Optimization

### ProGuard Configuration

Create `android/app/proguard-rules.pro`:

```proguard
# Supabase
-keep class com.supabase.** { *; }
-keep interface com.supabase.** { *; }

# Retrofit
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }

# OkHttp
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Gson
-keep class com.google.gson.** { *; }
-keep interface com.google.gson.** { *; }
```

### App Size Reduction

```bash
# Build with --split-per-abi
flutter build apk --release --split-per-abi

# Outputs:
# app-armeabi-v7a-release.apk (for 32-bit Android)
# app-arm64-v8a-release.apk (for 64-bit Android)
```

## Continuous Integration (Optional)

### GitHub Actions Example

Create `.github/workflows/android-build.yml`:

```yaml
name: Android Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-java@v2
        with:
          java-version: '11'
          distribution: 'temurin'
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter build apk --release
```

## Resources

- [Android Developer Docs](https://developer.android.com/docs)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Flutter Android Docs](https://flutter.dev/docs/deployment/android)
- [App Bundle Format](https://developer.android.com/guide/app-bundle)
