# Flutter App - Quick Reference

## 🚀 Getting Started (5 Minutes)

```bash
cd flutter_app
flutter pub get
cp .env.example .env
# Edit .env with your Supabase & Groq credentials
flutter run
```

## 📱 Running Commands

```bash
# List devices
flutter devices

# Run on device
flutter run

# Run on specific device
flutter run -d <device-id>

# Debug mode (slower, more debugging info)
flutter run --debug

# Release mode (faster, production)
flutter run --release

# Hot reload (while running)
# Press 'r' in terminal

# Hot restart
# Press 'R' in terminal

# View logs
flutter logs

# Stop running app
flutter run -v  # verbose output
```

## 🏗️ Building

```bash
# Clean build
flutter clean

# Get dependencies
flutter pub get

# Analyze code
flutter analyze

# Format code
flutter format lib/

# Build debug APK
flutter build apk --debug

# Build release APK
flutter build apk --release

# Build Android App Bundle (Google Play)
flutter build appbundle --release

# Build iOS app
flutter build ios --release
```

## 📁 Project Structure

```
lib/
├── main.dart                 # Entry point
├── theme/app_theme.dart     # UI theme
├── models/                  # Data models
│   ├── entry.dart
│   └── task.dart
├── services/                # API/LLM logic
│   ├── supabase_service.dart
│   └── llm_service.dart
├── providers/               # State management
│   ├── auth_provider.dart
│   ├── entry_provider.dart
│   └── task_provider.dart
├── screens/                 # UI screens
│   ├── auth/login_screen.dart
│   ├── home/home_screen.dart
│   ├── journal/journal_screen.dart
│   ├── entry/entry_screen.dart
│   └── tasks/tasks_screen.dart
└── widgets/                 # UI components
    ├── mood_slider.dart
    └── prompt_card.dart
```

## 🔧 Key Files to Modify

| File | Purpose | Common Changes |
|------|---------|-----------------|
| `lib/theme/app_theme.dart` | UI colors & fonts | Change colors, add new text styles |
| `lib/screens/entry/entry_screen.dart` | New entry form | Add fields, modify prompts |
| `lib/services/llm_service.dart` | LLM integration | Change model, adjust prompts |
| `pubspec.yaml` | Dependencies | Add new packages |

## 📦 Key Dependencies

| Package | Use |
|---------|-----|
| `supabase_flutter` | Backend + auth |
| `provider` | State management |
| `http` | HTTP requests |
| `sqflite` | Local database |
| `shared_preferences` | Simple storage |
| `flutter_dotenv` | Environment variables |
| `intl` | Date formatting |

## 🐛 Debugging

```bash
# Verbose output
flutter run -v

# Check device logs
flutter logs

# Profile app performance
flutter run --profile

# Use Dart DevTools
flutter pub global activate devtools
devtools

# Check app size
flutter build apk --analyze-size

# Find performance issues
flutter run --profile
# Then open DevTools in browser
```

## 🔑 Environment Variables (.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your-key
```

## 📲 Device Commands

```bash
# List connected devices
adb devices              # Android
xcrun simctl list       # iOS

# List emulators
flutter emulators

# Launch emulator
flutter emulators --launch <name>

# Install app on device
flutter install

# Uninstall app
flutter uninstall
```

## 🎯 Common Tasks

### Add New Screen
1. Create `lib/screens/myscreen/my_screen.dart`
2. Add route in `home_screen.dart`
3. Add navigation button in bottom nav

### Add New Package
```bash
flutter pub add package_name
flutter pub get
```

### Update Package
```bash
flutter pub upgrade package_name
# or upgrade all
flutter pub upgrade
```

### Create Release Build
```bash
# Android
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab

# iOS (requires Mac)
flutter build ios --release
# Then export archive in Xcode
```

## 🧪 Testing

```bash
# Run all tests
flutter test

# Run specific test file
flutter test test/widget_test.dart

# Run tests with verbose output
flutter test --verbose

# Generate coverage report
flutter test --coverage
```

## ⚠️ Troubleshooting Quick Fixes

| Error | Fix |
|-------|-----|
| `Pod install fails` | `cd ios && pod install --repo-update && cd ..` |
| `Gradle build error` | `cd android && ./gradlew clean && cd .. && flutter run` |
| `Module not found` | `flutter pub get && flutter pub upgrade` |
| `Device not recognized` | `flutter devices && flutter run -d <device>` |
| `Magic link doesn't work` | Check `.env` has correct Supabase URL/key |
| `LLM returns empty` | Verify Groq API key and network connection |
| `App crashes on startup` | Run with `flutter run -v` for detailed logs |

## 📚 Documentation Files

- `README.md` - Quick start
- `FLUTTER_SETUP.md` - Complete setup guide
- `ANDROID_BUILD.md` - Android deployment
- `IOS_BUILD.md` - iOS deployment
- `IMPLEMENTATION_SUMMARY.md` - Feature overview

## 🚢 Deployment Checklist

### Before Publishing to Google Play
- [ ] Build APK: `flutter build apk --release`
- [ ] Or App Bundle: `flutter build appbundle --release`
- [ ] Test on real Android device
- [ ] Create keystore file
- [ ] Configure signing in `android/app/build.gradle`
- [ ] Update `pubspec.yaml` version
- [ ] Create app in Google Play Console
- [ ] Upload signed APK/bundle
- [ ] Complete app store listing
- [ ] Submit for review

### Before Publishing to App Store
- [ ] Build iOS: `flutter build ios --release`
- [ ] Export archive from Xcode
- [ ] Test on real iOS device via TestFlight
- [ ] Create app in App Store Connect
- [ ] Upload IPA
- [ ] Complete app store listing
- [ ] Submit for review

## 💡 Tips & Tricks

- Use `const` constructors to improve performance
- Enable `--split-per-abi` for smaller Android builds
- Test on real devices, not just emulators
- Use Flutter DevTools for debugging UI issues
- Run `flutter analyze` before building
- Use `flutter format` to keep code style consistent
- Enable Proguard/R8 for Android to reduce APK size
- Update Flutter regularly: `flutter upgrade`

## 🔗 Useful Links

- [Flutter Docs](https://flutter.dev/docs)
- [Dart Docs](https://dart.dev/guides)
- [Supabase Flutter](https://supabase.com/docs/reference/flutter)
- [Provider Package](https://pub.dev/packages/provider)
- [Groq API](https://console.groq.com)
- [Android Build Guide](https://developer.android.com)
- [iOS Build Guide](https://developer.apple.com)

---

**Last Updated**: November 26, 2025
**Flutter Version**: 3.13+
**Dart Version**: 3.0+
