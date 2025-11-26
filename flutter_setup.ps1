# Flutter & Android Setup Script for Windows
# This script automates the Flutter SDK installation and Android setup

# Run as Administrator
# powershell -ExecutionPolicy Bypass -File flutter_setup.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Flutter Android Setup Script  " -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Configuration
$flutterDstPath = "C:\src\flutter"
$flutterZip = "$env:TEMP\flutter.zip"
$flutterUrl = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.0-stable.zip"

Write-Host "[1/5] Checking existing Flutter installation..." -ForegroundColor Yellow

if (Test-Path $flutterDstPath) {
    Write-Host "Flutter already exists at $flutterDstPath" -ForegroundColor Green
} else {
    Write-Host "[2/5] Downloading Flutter SDK..." -ForegroundColor Yellow
    Write-Host "URL: $flutterUrl" -ForegroundColor Gray
    Write-Host "Destination: $flutterZip" -ForegroundColor Gray
    Write-Host ""
    Write-Host "This may take 2-5 minutes..." -ForegroundColor Cyan
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $flutterUrl -OutFile $flutterZip -TimeoutSec 300
    Write-Host "Download complete" -ForegroundColor Green
    
    Write-Host "[3/5] Extracting Flutter SDK..." -ForegroundColor Yellow
    
    if (-not (Test-Path "C:\src")) {
        New-Item -ItemType Directory -Path "C:\src" | Out-Null
    }
    
    Expand-Archive -Path $flutterZip -DestinationPath "C:\src" -Force
    Remove-Item $flutterZip
    Write-Host "Extraction complete" -ForegroundColor Green
}

Write-Host "[4/5] Adding Flutter to PATH..." -ForegroundColor Yellow

$flutterBinPath = "$flutterDstPath\bin"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($currentPath -like "*flutter*") {
    Write-Host "Flutter already in PATH" -ForegroundColor Green
} else {
    $newPath = "$currentPath;$flutterBinPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added Flutter to PATH" -ForegroundColor Green
    Write-Host "Note: Restart PowerShell to apply changes" -ForegroundColor Yellow
}

# Add to current session
$env:PATH += ";$flutterBinPath"

Write-Host "[5/5] Verifying Flutter installation..." -ForegroundColor Yellow
Write-Host ""

# Test Flutter
$flutterVersion = & "$flutterBinPath\flutter.bat" --version 2>&1
Write-Host "Flutter installed successfully!" -ForegroundColor Green
Write-Host "  $flutterVersion" -ForegroundColor Cyan

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Running flutter doctor...     " -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

& "$flutterBinPath\flutter.bat" doctor

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "  Setup Complete!               " -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Restart PowerShell to apply PATH changes"
Write-Host "2. Run: flutter doctor"
Write-Host "3. Check for any missing components (marked with X)"
Write-Host ""
Write-Host "Common Issues:" -ForegroundColor Yellow
Write-Host "- Android Studio: If missing, install from https://developer.android.com/studio"
Write-Host "- Android SDK: If missing, open Android Studio Tools SDK Manager"
Write-Host "- Java: Should be auto-installed with Android Studio"
Write-Host ""
Write-Host "Once everything is done, connect your Android phone and run:" -ForegroundColor Cyan
Write-Host "  cd C:\Users\shari\JustWrite\flutter_app" -ForegroundColor White
Write-Host "  flutter run" -ForegroundColor White
Write-Host ""
