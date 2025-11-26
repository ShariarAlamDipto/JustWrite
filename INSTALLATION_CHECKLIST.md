# JustWrite Flutter - Step-by-Step Installation Checklist

## Copy & Paste These Commands in Order

### ✅ STEP 1: Verify Flutter Installation (After downloading SDK)

```powershell
# Check Flutter version
flutter --version

# Expected: Flutter 3.x.x • channel stable
```

### ✅ STEP 2: Navigate to App Directory

```powershell
# Go to flutter app folder
cd C:\Users\shari\JustWrite\flutter_app

# Verify you're in the right place (should see pubspec.yaml)
ls
```

### ✅ STEP 3: Get Dependencies

```powershell
# Download all required packages (one-time, ~2 min)
flutter pub get

# Expected: no errors, see "Got dependencies"
```

### ✅ STEP 4: Verify Phone Connection

```powershell
# Check if phone is connected
flutter devices

# Expected: Should show your phone
# Example: emulator-5554 (mobile) • Android 13 (API 33) • [online]
```

### ✅ STEP 5: Check System Setup

```powershell
# Verify all dependencies are installed
flutter doctor

# Expected: All items marked with ✓
# If any ✗, see troubleshooting below
```

### ✅ STEP 6: Create .env File (One-time)

```powershell
# Copy the example file
Copy-Item .env.example .env

# Open for editing
notepad .env
```

**Then fill in these values:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your-groq-api-key-here
```

### ✅ STEP 7: Clean Previous Builds

```powershell
# Remove old build artifacts
flutter clean

# Reinstall dependencies
flutter pub get
```

### ✅ STEP 8: Run the App! 🚀

```powershell
# Build and run on your connected phone
flutter run

# Expected: See "Launching lib/main.dart..."
# Then app opens on your phone!
```

### ✅ STEP 9: Test the App

On your phone:
1. Enter your email on login screen
2. Check email for magic link
3. Click link to log in
4. Tap "New Entry"
5. Fill in mood and thoughts
6. Tap "ANALYZE WITH AI"
7. See extracted tasks!

---

## 🔥 During Development (After First Run)

While app is running in terminal, use these:

```powershell
# Hot reload - see code changes instantly (press 'r' in terminal)
r

# Hot restart - full app restart (press 'R' in terminal)
R

# View app logs (press 'q' to exit logs)
flutter logs

# Quit app (press 'q' in terminal)
q
```

---

## 🆘 Troubleshooting - Copy & Paste Solutions

### Problem: "flutter: The term 'flutter' is not recognized"

```powershell
# Add Flutter to current session
$env:PATH += ";C:\flutter\bin"
flutter --version

# If this works, Flutter PATH is not set permanently
# See "FLUTTER_WINDOWS_INSTALL.md" STEP 3 to fix permanently
```

### Problem: "No devices attached"

```powershell
# Verify ADB can see your phone
adb devices

# Expected: Your phone listed as "device"
# If "unauthorized", see next solution
```

### Problem: "Unauthorized device"

```powershell
# Restart ADB
adb kill-server
adb start-server

# Check again
adb devices

# Check your phone for "Trust" dialog and tap OK
```

### Problem: ".env file not found" or "Can't read credentials"

```powershell
# Verify .env exists
Test-Path .env

# If False, create it
Copy-Item .env.example .env
notepad .env

# Fill in credentials and save
```

### Problem: "Gradle build failed"

```powershell
# Full clean rebuild
flutter clean
flutter pub get
flutter run -v

# The -v flag shows detailed error messages
```

### Problem: "App crashes on startup"

```powershell
# View app logs to see error
flutter logs

# Common causes:
# 1. .env missing or wrong credentials
# 2. No internet connection
# 3. Supabase not configured

# Check .env file
type .env
```

### Problem: "Waiting for connection from device"

```powershell
# Phone needs to be unlocked
# Unlock your phone and press Enter in terminal

# Or restart the build
# Press Ctrl+C to cancel
# Then run flutter run again
```

---

## 📋 All Necessary Commands Reference

| What You Want | Command |
|---------------|---------|
| Check Flutter version | `flutter --version` |
| Check all dependencies | `flutter doctor` |
| List connected devices | `flutter devices` |
| Download dependencies | `flutter pub get` |
| Clean old builds | `flutter clean` |
| Run on phone | `flutter run` |
| Run with verbose output | `flutter run -v` |
| View app logs | `flutter logs` |
| Build APK for sharing | `flutter build apk --debug` |
| Stop running app | `Ctrl+C` in terminal |

---

## 🎯 Most Common First-Run Sequence

**Copy & paste these in order:**

```powershell
# 1. Go to app folder
cd C:\Users\shari\JustWrite\flutter_app

# 2. Verify Flutter works
flutter --version

# 3. Check phone connection
flutter devices

# 4. Get dependencies
flutter pub get

# 5. Create .env (if not exists)
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host "Created .env - Edit with your credentials!" }

# 6. Check setup
flutter doctor

# 7. Build and run! 🚀
flutter run
```

**After Step 7:**
- Wait 2-3 minutes for first build
- Watch your phone - app will launch automatically!

---

## ✅ Pre-Run Verification Checklist

Run this before `flutter run`:

```powershell
# Navigate to app
cd C:\Users\shari\JustWrite\flutter_app

# Check Flutter
Write-Host "Flutter version:"; flutter --version

# Check devices
Write-Host "Connected devices:"; flutter devices

# Check .env
Write-Host ".env file exists:"; Test-Path .env
Write-Host ".env contents:"; type .env

# Check dependencies ready
Write-Host "pubspec.yaml exists:"; Test-Path pubspec.yaml

# All ready?
Write-Host ""
Write-Host "Ready to run? Execute: flutter run" -ForegroundColor Green
```

---

## 🚀 What Happens When You Run It

```
1. flutter run
   ↓
2. Starts build process...
   ↓
3. Compiling Dart code to Android APK
   ↓
4. Gradle builds APK
   ↓
5. Installs APK on phone
   ↓
6. Launches app on phone
   ↓
7. You see login screen!
```

**Total time: ~2-3 minutes first run, ~30 seconds after**

---

## 💡 Pro Tips

1. **Keep phone unlocked** during build (prevents "Waiting for device" errors)
2. **Use hot reload** (`r` key) for rapid development
3. **Check logs** if app crashes: `flutter logs`
4. **Battery saver mode** can interfere - disable while developing
5. **USB cable quality** matters - use good quality cable

---

## 🎓 Learning Path

1. **Read first**: `QUICK_START.md` (5 min)
2. **Setup**: Follow steps 1-5 above (15 min)
3. **Run**: Execute step 6-7 (5 min)
4. **Test**: Use the app, create entries (5 min)
5. **Develop**: Make changes, use hot reload (ongoing)

---

## 📞 Stuck? Here's What to Do

1. **Read the error message** carefully
2. **Google the error** if it's unclear
3. **Run `flutter doctor`** to check dependencies
4. **Run `flutter logs`** to see app errors
5. **Try `flutter clean && flutter pub get`** to reset
6. **Restart phone and computer** (fixes 80% of issues!)
7. **Check credentials** in `.env` file

---

## 🎉 Once It's Working

**You now have:**
- ✅ Flutter app running on your Android phone
- ✅ Connection to Supabase backend
- ✅ AI-powered task extraction
- ✅ Same backend as web app (real-time sync!)

**You can:**
- ✅ Create journal entries
- ✅ Answer daily prompts
- ✅ Get AI summaries
- ✅ Extract actionable tasks
- ✅ Manage your tasks
- ✅ Use hot reload to develop new features

---

**Ready? Start with Step 1!** 🚀

```powershell
cd C:\Users\shari\JustWrite\flutter_app
flutter run
```

Let me know how it goes! 🎉
