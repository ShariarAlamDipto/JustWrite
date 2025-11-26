# Flutter Android Phone Setup - Step-by-Step Guide

## ⚠️ Important: Flutter Installation Required

Before running the app on your Android phone, you need to install Flutter SDK first.

## Step 1: Install Flutter SDK

### Option A: Using Chocolatey (Easiest on Windows)

```powershell
# Run PowerShell as Administrator, then:
choco install flutter
```

### Option B: Manual Installation (If Chocolatey not available)

1. **Download Flutter SDK**
   - Go to: https://flutter.dev/docs/get-started/install/windows
   - Download the stable release (Flutter SDK zip file)
   - Extract to: `C:\src\flutter` or `C:\flutter`

2. **Add Flutter to PATH**
   - Open Environment Variables (search "Environment Variables" in Start menu)
   - Click "Edit the system environment variables"
   - Click "Environment Variables" button
   - Under "User variables", click "New"
     - Variable name: `FLUTTER_SDK`
     - Variable value: `C:\src\flutter` (or your extraction path)
   - Click on "Path" and add: `C:\src\flutter\bin`
   - Click OK and restart PowerShell

3. **Verify Installation**
   ```powershell
   flutter --version
   ```
   Should see: `Flutter X.XX.X • channel stable`

## Step 2: Install Android SDK & Configure ADB

### Check Current Android Setup

```powershell
flutter doctor
```

This will show you what's installed and what's missing.

### If Android SDK Missing

1. **Install Android Studio**
   - Download: https://developer.android.com/studio
   - Run installer and follow prompts
   - During setup, ensure "Android SDK" is checked

2. **Configure Android SDK**
   - Open Android Studio
   - Menu: **Tools** → **SDK Manager**
   - Under "SDK Platforms", ensure **Android API 34** is installed
   - Under "SDK Tools", ensure **Android SDK Platform-Tools** is installed
   - Click "Apply" and wait for installation

3. **Set ANDROID_HOME environment variable**
   - Open Environment Variables (same as Flutter setup)
   - Add new User variable:
     - Name: `ANDROID_HOME`
     - Value: `C:\Users\shari\AppData\Local\Android\Sdk` (or your Android SDK path)
   - Restart PowerShell

### Verify Android Setup

```powershell
flutter doctor
```

Look for ✅ next to "Android toolchain"

## Step 3: Enable Developer Mode on Your Android Phone

1. **Unlock Developer Options**
   - Go to: **Settings** → **About Phone**
   - Scroll down to "Build Number"
   - Tap "Build Number" **7 times** quickly
   - You'll see: "You are now a developer!" message

2. **Enable USB Debugging**
   - Go back to **Settings** → **Developer options** (now visible)
   - Find "USB Debugging" and toggle it **ON**
   - You may see a security prompt - tap "OK" to allow

3. **Set USB Connection Mode**
   - Connect phone to computer with USB cable
   - On phone, you may see a prompt asking permission for USB debugging
   - Tap "Allow" to trust this computer
   - Select "File Transfer" or "PTP" mode (not "Charge Only")

## Step 4: Verify Phone Connection

```powershell
adb devices
```

You should see:
```
List of attached devices
XXXXXXXXX    device
```

If you see "unauthorized" instead, check the phone for the permission prompt and tap "Allow".

**If device doesn't appear:**
```powershell
# Restart ADB server
adb kill-server
adb start-server

# Try again
adb devices
```

## Step 5: Configure Flutter App Environment

```powershell
cd C:\Users\shari\JustWrite\flutter_app

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Open .env in a text editor and fill in:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-key-here
# GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
# GROQ_API_KEY=your-key-here
```

## Step 6: Get Flutter Dependencies

```powershell
cd C:\Users\shari\JustWrite\flutter_app

# Clean previous builds
flutter clean

# Get all dependencies
flutter pub get

# Check system setup
flutter doctor
```

Should see all ✅ marks before proceeding.

## Step 7: Run on Your Android Phone

```powershell
# List connected devices
flutter devices

# You should see your phone listed

# Run the app on your phone
flutter run

# Or specify device if multiple connected
flutter run -d <device-id>
```

### If App Won't Install

```powershell
# Clean and rebuild
flutter clean
flutter pub get

# Try with verbose output
flutter run -v

# Or build APK first
flutter build apk --debug

# Then install manually
adb install build\app\outputs\flutter-app.apk
```

## Troubleshooting

### "flutter: The term 'flutter' is not recognized"
**Solution:** Flutter not in PATH. Restart PowerShell after adding to PATH, or:
```powershell
$env:PATH += ";C:\src\flutter\bin"
flutter --version
```

### "adb: The term 'adb' is not recognized"
**Solution:** ADB not in PATH. Add:
```powershell
$env:PATH += ";C:\Users\shari\AppData\Local\Android\Sdk\platform-tools"
adb devices
```

### "No devices found" or "Unauthorized"
**Solutions:**
1. Check phone shows USB Debugging prompt - tap "Allow"
2. Unplug and replug USB cable
3. Restart phone
4. Try different USB cable or port
5. Run: `adb kill-server` then `adb start-server`

### App Crashes on Launch
**Check logs:**
```powershell
flutter logs
```

Look for error messages. Common causes:
- Missing `.env` file
- Invalid Supabase credentials
- Missing internet connection

### Build Fails
```powershell
# Full clean rebuild
flutter clean
flutter pub get
flutter run -v
```

## Quick Reference Commands

| Command | Purpose |
|---------|---------|
| `flutter --version` | Check Flutter version |
| `flutter doctor` | Check system setup |
| `flutter devices` | List connected devices |
| `flutter run` | Run on device/emulator |
| `flutter run -d <id>` | Run on specific device |
| `flutter run -v` | Run with verbose logs |
| `flutter clean` | Clean build files |
| `flutter pub get` | Install dependencies |
| `flutter logs` | View app logs |
| `adb devices` | List connected Android devices |
| `adb install <path.apk>` | Install APK manually |

## Development Workflow

Once running, you can use **hot reload** to update the app without restarting:

**While app is running in terminal:**
- Press `r` → Hot reload (update code instantly)
- Press `R` → Hot restart (full app restart)
- Press `q` → Quit app

## Next Steps

1. ✅ Install Flutter SDK
2. ✅ Connect Android phone
3. ✅ Run: `flutter run`
4. ✅ Test app on your phone
5. ✅ Make changes and use hot reload to test

## Need Help?

If you get stuck:
1. Run `flutter doctor` and share the output
2. Run `flutter run -v` for verbose error messages
3. Check phone is unlocked and USB Debugging enabled
4. Try restarting phone and computer
5. Check `.env` file has valid credentials

---

**Once Flutter is installed and your phone is connected, simply run:**

```powershell
cd C:\Users\shari\JustWrite\flutter_app
flutter run
```

The app will build and launch on your Android phone! 🚀
