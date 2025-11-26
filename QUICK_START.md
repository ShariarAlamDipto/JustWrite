# Quick Start: Run JustWrite on Your Android Phone

## Prerequisites Checklist

Before we start, make sure you have:
- [ ] Android phone with USB cable
- [ ] Computer with Windows 11
- [ ] Internet connection
- [ ] Administrator access to install software

## Step 1: Install Flutter SDK (One-Time Setup)

### Download Flutter Manually

1. **Download Flutter**
   - Visit: https://flutter.dev/docs/get-started/install/windows
   - Click **"Windows"** tab
   - Download the stable release (`.zip` file, ~600MB)
   - Save to: `C:\Users\shari\Downloads\`

2. **Extract Flutter**
   - Right-click the downloaded `.zip` file
   - Select **"Extract All..."**
   - Extract to: **`C:\`** (not in Downloads)
   - You should have: `C:\flutter\bin\flutter.bat`

3. **Add Flutter to System PATH**
   - Press `Windows Key` and search: **"Environment Variables"**
   - Click **"Edit the system environment variables"**
   - Click **"Environment Variables"** button (bottom right)
   - Under **"User variables"**, click **"New"**
   - **Variable name:** `PATH`
   - **Variable value:** `C:\flutter\bin`
   - Click **OK** three times
   - **Close and reopen PowerShell** (important!)

4. **Verify Installation**
   - Open a **new PowerShell window**
   - Type: `flutter --version`
   - Should see: `Flutter 3.x.x • channel stable`

## Step 2: Prepare Your Phone

1. **Enable Developer Mode**
   - Go to: **Settings > About Phone**
   - Find **"Build Number"**
   - Tap **"Build Number"** exactly **7 times** quickly
   - You'll see: **"You are now a developer!"**

2. **Enable USB Debugging**
   - Go to: **Settings > Developer options** (now visible)
   - Find **"USB Debugging"**
   - Toggle it **ON**
   - A dialog will appear asking to allow USB debugging
   - Tap **"OK"**

3. **Connect Your Phone**
   - Plug in your Android phone with USB cable
   - You may see a prompt on the phone
   - Tap **"Allow"** to trust this computer
   - Select **"File Transfer"** mode (not "Charge Only")

4. **Verify Connection**
   - Open PowerShell
   - Type: `adb devices`
   - Should show your phone (not "unauthorized")

## Step 3: Set Up the Flutter App

```powershell
# Navigate to the app directory
cd C:\Users\shari\JustWrite\flutter_app

# Download dependencies (one-time, ~2 min)
flutter pub get

# Clean any old builds
flutter clean
```

## Step 4: Configure App Settings

1. **Create `.env` file**
   ```powershell
   # In PowerShell, from flutter_app directory:
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials**
   - Open: `C:\Users\shari\JustWrite\flutter_app\.env`
   - Fill in your Supabase and Groq credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-key-here
   GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
   GROQ_API_KEY=your-key-here
   ```

## Step 5: Run the App on Your Phone

```powershell
# From C:\Users\shari\JustWrite\flutter_app
flutter run
```

**What will happen:**
1. Flutter will build the app (~2-3 minutes first time)
2. App will install on your phone
3. App will launch automatically
4. You'll see the JustWrite login screen

## Step 6: Use the App

1. **Login**
   - Enter your email
   - Click "Send Magic Link"
   - Check email for link
   - Click link and return to app
   - App will auto-login

2. **Create an Entry**
   - Tap **"New Entry"** button
   - Fill in your mood, thoughts, and gratitude
   - Answer some of the 10 science-backed prompts
   - Tap **"ANALYZE WITH AI"**
   - Wait for summary and task extraction

3. **View Tasks**
   - Tap **"Tasks"** tab
   - See extracted tasks
   - Tap to mark complete

## Troubleshooting

### "flutter: The term 'flutter' is not recognized"
```powershell
# Flutter not in PATH. Fix:
$env:PATH += ";C:\flutter\bin"
flutter --version
```

### "No devices connected"
```powershell
# Check ADB
adb devices

# If "unauthorized", restart ADB
adb kill-server
adb start-server
adb devices
```

### "App won't build"
```powershell
cd C:\Users\shari\JustWrite\flutter_app
flutter clean
flutter pub get
flutter run -v
```

### "App crashes on startup"
- Check `.env` file has valid credentials
- Check internet connection
- Run: `flutter logs` to see error messages

## After First Run (Hot Reload)

Once the app is running on your phone, you can make changes and see them instantly:
- While app is running in terminal, press `r` to reload
- Press `R` to fully restart
- Press `q` to quit

---

## Quick Command Reference

```powershell
# List connected devices
flutter devices

# Run on connected device
flutter run

# Run with verbose logging
flutter run -v

# View app logs
flutter logs

# Check system setup
flutter doctor

# Clean build files
flutter clean
```

---

## Need Help?

If you get stuck:
1. Make sure PowerShell is **restarted** after PATH changes
2. Verify phone is **unlocked** and plugged in
3. Confirm `.env` file exists and has valid credentials
4. Run `flutter doctor` to check for missing dependencies
5. Share the error from `flutter run -v` output

**You're all set! Ready to run the app?** 🚀
