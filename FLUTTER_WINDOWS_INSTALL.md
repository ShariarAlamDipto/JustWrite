# Flutter Installation & Deployment Guide for Windows

## 📋 What You Need

✅ **Already Done** (on your computer):
- Windows 11 Home
- JustWrite project folder at `C:\Users\shari\JustWrite`
- Flutter app code (ready to run)
- `flutter_app\.env.example` with credential template

❌ **Still Need**:
- Flutter SDK (~600MB download + extraction)
- Android phone connected via USB

---

## 🚀 Installation Steps

### STEP 1: Download Flutter SDK

**Option A - Direct Download** (Recommended)
```
1. Go to: https://flutter.dev/docs/get-started/install/windows
2. Download: flutter_windows_3.24.0-stable.zip (~600MB)
3. Save to: C:\Users\shari\Downloads\
4. Wait for download to complete
```

**Option B - Command Line** (If download fails, use this)
```powershell
# In PowerShell:
$url = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.0-stable.zip"
$output = "C:\Users\shari\Downloads\flutter.zip"
Invoke-WebRequest -Uri $url -OutFile $output -TimeoutSec 300
```

---

### STEP 2: Extract Flutter

```powershell
# In PowerShell (as Administrator):

# Create installation directory
New-Item -ItemType Directory -Path "C:\flutter" -Force

# Extract the zip file
Expand-Archive -Path "C:\Users\shari\Downloads\flutter.zip" -DestinationPath "C:\" -Force

# Verify extraction
Test-Path "C:\flutter\bin\flutter.bat"
# Should output: True
```

---

### STEP 3: Add Flutter to Windows PATH

**Method 1: GUI (Easier for beginners)**

1. Press `Windows Key` and type: `environment`
2. Click **"Edit the system environment variables"**
3. Click **"Environment Variables"** button
4. Under **"User variables for shari"**, click **"New"**
   - Variable name: `PATH`
   - Variable value: `C:\flutter\bin`
5. Click **OK** three times
6. **Close all PowerShell windows** and restart

**Method 2: PowerShell (Faster)**

```powershell
# Run as Administrator
$flutterPath = "C:\flutter\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($currentPath -notlike "*flutter*") {
    $newPath = "$currentPath;$flutterPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added Flutter to PATH"
    Write-Host "Restart PowerShell for changes to take effect"
} else {
    Write-Host "Flutter already in PATH"
}
```

**Step 3b: Verify Flutter Installation**

```powershell
# IMPORTANT: Close and reopen PowerShell!
# Then run:

flutter --version
```

**Expected output:**
```
Flutter 3.24.0 • channel stable
Engine • dart "3.x.x"
```

---

### STEP 4: Prepare Android Phone

**Step 4a: Enable Developer Mode**
1. Open: **Settings** > **About Phone**
2. Scroll to: **Build Number**
3. Tap **"Build Number"** exactly **7 times** 
4. See message: **"You are now a developer!"**

**Step 4b: Enable USB Debugging**
1. Go to: **Settings** > **Developer options** (new option)
2. Find: **"USB Debugging"**
3. Toggle: **ON**
4. Tap **OK** on the permission dialog

**Step 4c: Connect Phone to Computer**
1. Connect phone with USB cable
2. On phone, you may see a trust prompt
3. Tap **"Allow"** or **"Trust this computer"**
4. Select **"File Transfer"** mode (not "Charge Only")

**Step 4d: Verify Connection**
```powershell
# Check if phone is detected
adb devices

# Expected output:
# List of attached devices
# ABC123XYZ456    device
```

If you see "unauthorized":
```powershell
adb kill-server
adb start-server
adb devices
# Try again
```

---

### STEP 5: Set Up Flutter App Environment

```powershell
# Navigate to flutter app
cd C:\Users\shari\JustWrite\flutter_app

# Get all dependencies (one-time, ~2 minutes)
flutter pub get

# Clean previous builds
flutter clean

# Check system setup
flutter doctor
```

**What `flutter doctor` checks:**
- ✅ Flutter SDK
- ✅ Android toolchain
- ✅ Android Studio (or SDK)
- ✅ Connected devices

If you see ❌ marks:
- Missing **Android SDK**: Install Android Studio from https://developer.android.com/studio
- Missing **Java**: Should auto-install with Android Studio
- Missing **devices**: Ensure phone is plugged in and USB debugging is ON

---

### STEP 6: Configure App Credentials

**Edit `.env` file with your Supabase & Groq API keys:**

```powershell
# Open the .env file
notepad C:\Users\shari\JustWrite\flutter_app\.env
```

**Fill in these fields:**

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your-groq-api-key-here
```

**Where to find these?**
- **Supabase URL & Key**: Supabase Dashboard > Settings > API
- **Groq API Key**: Groq Console > API Keys

---

### STEP 7: Run the App on Your Phone! 🎉

```powershell
# Make sure you're in the flutter_app directory
cd C:\Users\shari\JustWrite\flutter_app

# Build and run on your phone
flutter run
```

**First run will take 2-3 minutes** (building APK, installing, launching)

**You'll see output like:**
```
Building flutter app...
Installing app...
Launching app...
```

**Then on your phone:**
- App opens automatically
- You see JustWrite login screen
- Ready to enter your email and get magic link!

---

## 🔥 Hot Reload Development

Once the app is running on your phone, use these shortcuts:

| Key | Action |
|-----|--------|
| `r` | Hot reload (fast, update code instantly) |
| `R` | Hot restart (full app restart) |
| `w` | Print widget tree |
| `q` | Quit app |

**Example workflow:**
1. App running on phone
2. Make code change in Flutter file
3. Save file
4. Press `r` in terminal
5. See changes on phone instantly! ⚡

---

## 🆘 Troubleshooting

### ❌ "flutter: The term 'flutter' is not recognized"

**Cause:** Flutter not in system PATH

**Solution:**
```powershell
# Add to current session temporarily:
$env:PATH += ";C:\flutter\bin"
flutter --version

# For permanent fix, follow STEP 3 again and restart PowerShell
```

---

### ❌ "adb: The term 'adb' is not recognized"

**Cause:** Android SDK platform-tools not in PATH

**Solution:**
```powershell
# Add to current session:
$env:PATH += ";C:\Users\shari\AppData\Local\Android\Sdk\platform-tools"
adb devices

# For permanent fix, follow STEP 3 with this path instead
```

---

### ❌ "No attached devices" or "Unauthorized"

**Causes & Solutions:**

1. **Phone not plugged in**
   - Check USB cable is fully connected
   - Try different USB port
   - Try different cable

2. **USB Debugging not enabled**
   - Go to Settings > Developer options > USB Debugging
   - Toggle ON
   - Check permission dialog on phone

3. **ADB server issue**
   ```powershell
   adb kill-server
   adb start-server
   adb devices
   ```

4. **Phone in wrong USB mode**
   - Phone notification > USB options > Select "File Transfer"
   - (Not "Charge Only")

5. **Trust computer dialog on phone**
   - Disconnect USB
   - Open phone Settings > Apps > Manage all apps > Show system
   - Find and clear: "USB Debugging" or "adb"
   - Reconnect USB
   - Tap "Trust this computer"

---

### ❌ "Gradle build failed" or "Waiting for connection"

**Solution:**
```powershell
cd C:\Users\shari\JustWrite\flutter_app

# Full clean rebuild
flutter clean
flutter pub get
flutter run -v  # -v for verbose output to see errors
```

---

### ❌ ".env file not found" or "App crashes on startup"

**Solution:**
```powershell
# Verify .env exists
Test-Path C:\Users\shari\JustWrite\flutter_app\.env

# If missing, copy from example
cp C:\Users\shari\JustWrite\flutter_app\.env.example C:\Users\shari\JustWrite\flutter_app\.env

# Then edit with your credentials
notepad C:\Users\shari\JustWrite\flutter_app\.env
```

**Check .env has valid values:**
- SUPABASE_URL: Starts with `https://`
- SUPABASE_ANON_KEY: Long string (50+ chars)
- GROQ_API_URL: Exact value above
- GROQ_API_KEY: Long string (50+ chars)

---

### ❌ "Connection refused" or "Can't reach backend"

**Causes:**
- Supabase credentials wrong
- Internet connection down
- Firewall blocking connection

**Solutions:**
```powershell
# Check .env is correct
type C:\Users\shari\JustWrite\flutter_app\.env

# Test internet
ping google.com

# View app logs
flutter logs
```

---

## 📝 Next Steps After First Run

1. **Test the app**
   - Login with your email
   - Create a journal entry
   - Answer a few prompts
   - Click "ANALYZE WITH AI"
   - Check extracted tasks

2. **Make code changes**
   - Edit any Flutter file
   - Press `r` to hot reload
   - See changes on phone instantly

3. **Build for production** (later)
   - Run: `flutter build apk --release`
   - Generate: `build/app/outputs/flutter-app.apk`
   - Share with others or upload to Google Play

---

## 🎯 Quick Reference

**Installation checklist:**
- [ ] Flutter SDK downloaded and extracted to C:\flutter
- [ ] Flutter added to PATH
- [ ] PowerShell restarted
- [ ] `flutter --version` works
- [ ] Phone USB debugging enabled
- [ ] Phone connected via USB cable
- [ ] `adb devices` shows your phone
- [ ] `.env` file created and filled with credentials
- [ ] `flutter pub get` completed
- [ ] `flutter run` starting build...

**Commands:**
```powershell
# Verify setup
flutter doctor

# List devices
flutter devices

# Run app
flutter run

# Clean build
flutter clean

# View logs
flutter logs

# Stop app
# (Press q in terminal while app running)
```

---

## 💡 Pro Tips

1. **Keep phone screen on** during build/installation (press power button when needed)
2. **Use hot reload** (`r` key) for rapid development
3. **Check flutter logs** if app crashes: `flutter logs`
4. **Battery saver mode** can interfere - disable while developing
5. **USB cable matters** - use quality cable, not cheap ones

---

## ✅ Ready?

When you're ready to start:

```powershell
# 1. Make sure Flutter is in PATH
flutter --version

# 2. Make sure phone is connected
flutter devices

# 3. Make sure .env is configured
type C:\Users\shari\JustWrite\flutter_app\.env

# 4. Run the app!
cd C:\Users\shari\JustWrite\flutter_app
flutter run
```

**Let me know when you hit each step and I'll help troubleshoot!** 🚀
