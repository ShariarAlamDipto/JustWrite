# JustWrite Mobile - Flutter

Cross-platform mobile app (Android & iOS) for JustWrite journaling and AI-powered task management.

## Features

- 📝 Daily entry with 10 science-backed prompts
- 😊 Mood tracking with emoji slider (0-10 intensity)
- ✨ AI-powered task extraction via Groq LLM
- ✅ Task management and tracking
- 🔐 Secure authentication (Supabase magic links)
- 📱 Offline support with local database
- 🎨 Arcade theme UI (matching web app)

## Prerequisites

- Flutter SDK 3.13+
- Xcode 14+ (for iOS)
- Android Studio with Android SDK 34+
- A Supabase project with JustWrite backend

## Setup

### 1. Install Flutter Dependencies

```bash
flutter pub get
```

### 2. Configure Environment

Create `.env` file in `flutter_app/`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your-groq-key
```

### 3. iOS Setup (macOS required)

```bash
cd ios
pod install
cd ..
```

### 4. Android Setup

No additional setup needed beyond Android Studio.

## Running

### Development

```bash
flutter run
```

### Run on specific device

```bash
flutter devices                    # List available devices
flutter run -d <device-id>        # Run on specific device
```

### Build for Production

**Android APK:**
```bash
flutter build apk --release
```

**Android App Bundle (Google Play):**
```bash
flutter build appbundle --release
```

**iOS IPA:**
```bash
flutter build ios --release
```

## Architecture

```
lib/
├── models/                 # Data models
│   ├── entry.dart
│   ├── task.dart
│   └── user.dart
├── services/              # API & database services
│   ├── supabase_service.dart
│   ├── llm_service.dart
│   └── storage_service.dart
├── providers/             # State management (Provider)
│   ├── auth_provider.dart
│   ├── entry_provider.dart
│   └── task_provider.dart
├── screens/               # UI screens
│   ├── auth/
│   ├── entry/
│   ├── tasks/
│   └── brainstorm/
├── widgets/               # Reusable components
│   ├── mood_slider.dart
│   ├── prompt_card.dart
│   ├── task_list.dart
│   └── custom_app_bar.dart
└── main.dart
```

## Key Packages

- **supabase_flutter**: Authentication & backend API
- **provider**: State management
- **sqflite**: Local SQLite database
- **flutter_dotenv**: Environment variables
- **http**: HTTP requests
- **intl**: Localization & date formatting
- **shared_preferences**: Simple local storage

## Development Workflow

1. Create feature branch: `git checkout -b feature/mood-slider`
2. Make changes in `lib/`
3. Test on emulator/device: `flutter run`
4. Build for release: `flutter build apk --release`
5. Commit and push

## Troubleshooting

### Build Issues

```bash
flutter clean
flutter pub get
flutter run
```

### Pod Install Error (iOS)

```bash
cd ios
rm -rf Pods
rm Podfile.lock
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

## Related Documentation

- [Flutter Docs](https://flutter.dev/docs)
- [Supabase Flutter](https://supabase.com/docs/reference/flutter/introduction)
- [Provider Package](https://pub.dev/packages/provider)

## License

MIT - See LICENSE file in root directory
