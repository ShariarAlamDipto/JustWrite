# Flutter Setup Guide - JustWrite Mobile

Complete setup instructions for developing and building the JustWrite mobile app (iOS & Android).

## Prerequisites

### macOS (for iOS development)
- macOS 12.0 or higher
- Xcode 14.0 or higher
- CocoaPods
- Apple Developer account (for App Store deployment)

### Windows/Linux (for Android development)
- Android Studio 2021.1 or higher
- Android SDK 34 or higher
- Java Development Kit (JDK) 11 or higher

### All Platforms
- Flutter SDK 3.13.0 or higher
- Git
- A code editor (VS Code, Android Studio, or IntelliJ IDEA)

## Installation

### 1. Install Flutter

**macOS/Linux:**
```bash
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:`pwd`/flutter/bin"
flutter doctor
```

**Windows (using Chocolatey):**
```powershell
choco install flutter
flutter doctor
```

### 2. Set Up Environment

Run `flutter doctor` to check your environment:
```bash
flutter doctor
```

Fix any issues reported by flutter doctor. You may need to:
- Install Xcode command line tools: `xcode-select --install`
- Agree to Xcode licenses: `sudo xcode-select --switch /Applications/Xcode.app/xcode-select`
- Install Android SDK: Use Android Studio's SDK Manager

### 3. Clone the Repository

```bash
cd path/to/JustWrite
cd flutter_app
```

### 4. Get Dependencies

```bash
flutter pub get
flutter pub upgrade
```

### 5. Configure Environment Variables

Create a `.env` file in the `flutter_app/` directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your-groq-api-key-here
```

**Get your Supabase credentials:**
1. Go to https://supabase.com
2. Create a new project
3. Copy the URL and anonymous key from Settings > API

**Get your Groq API key:**
1. Go to https://console.groq.com
2. Generate an API key
3. Copy it to `.env`

### 6. iOS Setup (macOS required)

```bash
cd ios
pod install --repo-update
cd ..
```

Update iOS deployment target if needed:
```bash
cd ios
pod update
cd ..
```

### 7. Android Setup (Optional configuration)

No additional setup required beyond Android Studio. However, you can configure:

Edit `android/build.gradle`:
```gradle
// Ensure you have the correct SDK versions
compileSdkVersion 34
minSdkVersion 21
targetSdkVersion 34
```

## Running the App

### List Available Devices

```bash
flutter devices
```

### Run on Connected Device

```bash
# Run on default device
flutter run

# Run on specific device
flutter run -d <device-id>
```

### Run on Emulator

**iOS Simulator:**
```bash
open -a Simulator
flutter run -d "iPhone 15 Pro"
```

**Android Emulator:**
```bash
flutter emulators --launch <emulator-name>
flutter run
```

### Hot Reload

While the app is running, press:
- `r` to hot reload
- `R` to hot restart
- `q` to quit

## Building for Release

### iOS

**Requirements:**
- Apple Developer Program membership
- Signing certificate
- Provisioning profile

**Build:**
```bash
flutter build ios --release
```

**Create IPA for distribution:**
```bash
cd ios
xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration Release -derivedDataPath build -arch arm64 -sdk iphoneos archive -archivePath build/Runner.xcarchive
cd ..
```

### Android

**Generate keystore:**
```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

**Create key properties file:** (`android/key.properties`)
```properties
storePassword=<your-store-password>
keyPassword=<your-key-password>
keyAlias=upload
storeFile=/path/to/upload-keystore.jks
```

**Build APK:**
```bash
flutter build apk --release
```

**Build App Bundle (Google Play):**
```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

## Troubleshooting

### Build Fails

```bash
flutter clean
flutter pub get
flutter pub upgrade
flutter run
```

### Pod Install Error (iOS)

```bash
cd ios
rm -rf Pods
rm Podfile.lock
pod repo update
pod install
cd ..
```

### Gradle Error (Android)

```bash
cd android
./gradlew clean
cd ..
flutter run
```

### Supabase Connection Error

1. Verify `.env` file has correct credentials
2. Check that Supabase project is active
3. Verify network connectivity
4. Check firewall/VPN settings

### LLM Service Error

1. Verify Groq API key in `.env`
2. Check API key has correct permissions
3. Verify network connectivity
4. Check Groq API quota

## Testing

### Unit Tests

```bash
flutter test
```

### Widget Tests

```bash
flutter test test/widget_test.dart
```

### Integration Tests

```bash
flutter drive --target=test_driver/app.dart
```

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── theme/                    # App theming
├── models/                   # Data models (Entry, Task, User)
├── services/                 # Business logic (Supabase, LLM)
├── providers/                # State management (Provider)
├── screens/                  # UI screens
│   ├── auth/
│   ├── home/
│   ├── entry/
│   ├── journal/
│   └── tasks/
└── widgets/                  # Reusable UI components
```

## Database Schema

The Flutter app connects to the same Supabase backend as the web app. Ensure these tables exist:

**entries**
- id (UUID, primary key)
- user_id (UUID, foreign key)
- content (text)
- title (text, optional)
- summary (text, optional)
- mood (integer 0-10)
- mood_intensity (integer 0-10)
- gratitude (array)
- prompt_answers (JSONB)
- ai_metadata (JSONB)
- created_at (timestamp)
- updated_at (timestamp)

**tasks**
- id (UUID, primary key)
- user_id (UUID, foreign key)
- entry_id (UUID, foreign key, optional)
- title (text)
- description (text)
- priority (text: high/medium/low)
- status (text: todo/done)
- if_then_plan (text, optional)
- due_date (date, optional)
- created_at (timestamp)
- updated_at (timestamp)

## Debugging

### View Logs

```bash
flutter logs
```

### Debug Mode

```bash
flutter run -v
```

### Dart DevTools

```bash
flutter pub global activate devtools
flutter pub global run devtools
```

Then in browser: http://localhost:9100

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Pod install fails | Update CocoaPods: `sudo gem install cocoapods` |
| Android API error | Update SDK: `flutter upgrade` |
| Supabase auth fails | Check `.env` file and network connection |
| LLM returns empty | Verify Groq API key is valid and not expired |
| Hot reload doesn't work | Try hot restart or full rebuild |

## Performance Tips

- Use `const` constructors when possible
- Enable release mode for testing: `flutter run --release`
- Use `--split-per-abi` for Android to reduce APK size
- Profile app: `flutter run --profile`

## Resources

- [Flutter Docs](https://flutter.dev/docs)
- [Supabase Flutter](https://supabase.com/docs/reference/flutter/introduction)
- [Provider Package](https://pub.dev/packages/provider)
- [Flutter Best Practices](https://flutter.dev/docs/testing/best-practices)

## Support

For issues:
1. Check [Flutter Docs](https://flutter.dev)
2. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/flutter)
3. Check [GitHub Issues](https://github.com/yourusername/justwrite/issues)
