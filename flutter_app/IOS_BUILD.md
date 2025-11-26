# iOS Build & App Store Deployment Guide

## Prerequisites

- macOS 12.0+
- Xcode 14.0+
- Apple Developer Program membership ($99/year)
- CocoaPods
- iOS deployment target: 12.0 or higher

## Build Configuration

### Project Setup

```bash
cd ios
pod install --repo-update
cd ..
```

### Xcode Configuration

Edit `ios/Podfile` if needed (usually auto-configured by Flutter):

```ruby
platform :ios, '12.0'

# Enable native network debugging
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
  end
end
```

## Building for iOS

### 1. Clean Build

```bash
flutter clean
flutter pub get
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

### 2. Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps"
3. Click "+"  → "New App"
4. **Name:** JustWrite
5. **Platform:** iOS
6. **Primary Language:** English
7. **Bundle ID:** com.justwrite.app (must match Xcode)
8. **SKU:** com.justwrite.app-001
9. **User Access:** Full Access

### 3. Update Bundle ID in Xcode

Edit `ios/Runner.xcodeproj/project.pbxproj` or use Xcode:

1. Open `ios/Runner.xcworkspace` in Xcode
2. Select "Runner" project
3. Select "Runner" target
4. Go to "Signing & Capabilities"
5. Set **Bundle Identifier:** `com.justwrite.app`
6. Set **Team** to your Apple Developer account
7. Ensure signing certificate is selected

Or edit in terminal:

```bash
cd ios
# View current bundle ID
grep -r "PRODUCT_BUNDLE_IDENTIFIER" Runner.xcodeproj

# Update bundle ID
sed -i '' 's/com.example.app/com.justwrite.app/g' Runner.xcodeproj/project.pbxproj
cd ..
```

### 4. Create Provisioning Profile

1. Go to [Apple Developer](https://developer.apple.com/account/resources/profiles/list)
2. Click "+"
3. Select "iOS App Development"
4. Select your app ID: `com.justwrite.app`
5. Select your device
6. Select your certificate
7. Download `.mobileprovision`

Double-click to install in Xcode.

### 5. Build Archive for Distribution

```bash
flutter build ios --release
```

This produces an `.app` bundle, but for distribution we need an Archive:

```bash
cd ios
xcodebuild -workspace Runner.xcworkspace \
  -scheme Runner \
  -configuration Release \
  -derivedDataPath build \
  -arch arm64 \
  -sdk iphoneos \
  archive -archivePath build/Runner.xcarchive
cd ..
```

### 6. Export Archive for App Store

Create `ios/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
</dict>
</plist>
```

Export IPA:

```bash
cd ios
xcodebuild -exportArchive \
  -archivePath build/Runner.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/ipa
cd ..
```

Output: `ios/build/ipa/Runner.ipa`

## App Store Submission

### 1. Prepare App Information

**In App Store Connect:**

1. Go to your app
2. Fill in all required sections:

**App Information:**
- Name: JustWrite
- Subtitle: AI-powered journaling
- Primary Category: Productivity
- Secondary Category: Lifestyle

**Version Information:**
- Version: 1.0
- Release Date: Today

**Descriptive Metadata:**
- Description:
```
JustWrite: Your personal AI journal

📝 Daily Journaling
- Create entries with mood tracking (emoji slider)
- 10 science-backed prompts based on CBT, gratitude, and goal-setting
- Auto-save as you type

✨ AI-Powered Task Extraction
- Groq LLM automatically extracts actionable tasks
- Get summaries of your thoughts
- Smart prioritization

✅ Task Management
- Organize and track tasks
- Set due dates and priorities
- If-then implementation plans

🔐 Secure & Private
- Passwordless authentication
- Your data is yours alone

🎮 Arcade-Themed UI
- Retro-inspired design
- Modern functionality

Transform your thoughts into action!
```

- Keywords: journal, diary, AI, productivity, tasks, planning, mood tracker

- Support URL: https://github.com/yourusername/justwrite
- Privacy Policy: https://yoursite.com/privacy
- License Agreement: https://yoursite.com/license

### 2. Add Screenshots

Required: At least 2 screenshots per device type
Recommended: 5 screenshots

**Screenshot Types:**
- iPhone 6.7-inch (Pro Max)
- iPad 12.9-inch

**Screenshot Tools:**
- Use Simulator: `Product` → `Screenshot`
- Use device screenshot: Hold home + power button
- Tools: Figma, Sketch, Photoshop

### 3. Set App Icon & Images

- **App Icon:** 1024x1024 PNG
- **Feature Graphic (optional):** 1024x500 PNG
- **Preview Video (optional):** 15-30 second MP4

### 4. Rating Questionnaire

Complete the content rating form:
1. Violence: None
2. Content Rating: 4+
3. Gambling: None
4. Medical: None

### 5. Build Configuration

Select build from "Builds" section:

1. App Store Connect → Your App
2. "Builds" section
3. Select your uploaded build
4. Set as "Release version"

### 6. Submit for Review

1. Complete all required sections
2. Review compliance info
3. Click "Submit for Review"
4. Wait for Apple review (usually 24-48 hours)

## Testing Before Submission

### TestFlight (Internal Testing)

1. Upload build to App Store Connect
2. Navigate to TestFlight → Internal Testing
3. Add test users (your Apple ID)
4. Download and test on device
5. Verify:
   - Authentication works
   - Entries save correctly
   - LLM task extraction works
   - UI renders properly on different device sizes

### Testing Checklist

- [ ] Login with magic link
- [ ] Create entry with mood slider
- [ ] Fill in prompts
- [ ] Analyze with AI
- [ ] Verify tasks created
- [ ] Toggle task completion
- [ ] View journal entries
- [ ] Delete entries/tasks
- [ ] Sign out
- [ ] Re-login
- [ ] Offline functionality (if implemented)
- [ ] Network reconnection

## Troubleshooting

### Pod Install Error

```bash
cd ios
rm -rf Pods Podfile.lock
pod repo update
pod install
cd ..
```

### Signing Error

```bash
# Check provisioning profile
security find-identity -v -p codesigning

# Update profile
open ~/Library/MobileDevice/Provisioning\ Profiles/
# Double-click .mobileprovision file
```

### Build Fails with "Swift Compatibility"

```bash
cd ios
xcode-select --reset
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
cd ..
```

### Export Archive Fails

1. Verify Bundle ID matches App Store Connect
2. Check provisioning profile is valid
3. Ensure signing certificate is in Keychain:
   ```bash
   security find-identity -v -p codesigning
   ```

### App Rejected by Review

**Common reasons:**
- Crashes on launch → Fix and resubmit
- Privacy policy missing → Add URL
- Magic link auth issue → Test thoroughly
- App too large → Optimize assets
- Unclear functionality → Improve description

**Response:** Submit revision with fixes

## Version Management

### Increment Version for Updates

Edit `pubspec.yaml`:
```yaml
version: 1.0.1+2  # Major.Minor.Patch+Build
```

Then rebuild:
```bash
flutter build ios --release
```

## Performance Tips

- Enable Link Time Optimization:
  ```bash
  cd ios
  # Edit Runner.xcodeproj/project.pbxproj
  # Set: GCC_OPTIMIZATION_LEVEL = 3
  # Set: LLVM_LTO = YES
  cd ..
  ```

- Strip debug symbols:
  ```bash
  cd ios
  xcodebuild -workspace Runner.xcworkspace \
    -scheme Runner -configuration Release \
    -derivedDataPath build strip
  cd ..
  ```

## Continuous Integration (GitHub Actions)

Create `.github/workflows/ios-build.yml`:

```yaml
name: iOS Build

on: [push]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter build ios --release --no-codesign
```

## Resources

- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Apple Developer Docs](https://developer.apple.com/documentation/)
- [Flutter iOS Docs](https://flutter.dev/docs/deployment/ios)
- [iOS App Submission Guide](https://developer.apple.com/app-store/review/guidelines/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)

## Support

For issues:
1. Check [Flutter Docs](https://flutter.dev)
2. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/ios+flutter)
3. Check [GitHub Issues](https://github.com/yourusername/justwrite/issues)
4. Contact Apple Developer Support
