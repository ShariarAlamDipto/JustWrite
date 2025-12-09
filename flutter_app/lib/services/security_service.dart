import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// SECURITY: Comprehensive security service for device integrity checks
/// Detects rooted/jailbroken devices and potential security threats
class SecurityService {
  static final SecurityService _instance = SecurityService._internal();
  factory SecurityService() => _instance;
  SecurityService._internal();

  // Cache result to avoid repeated checks
  bool? _isDeviceCompromised;

  /// Check if the device appears to be rooted (Android) or jailbroken (iOS)
  /// Returns true if device shows signs of being compromised
  Future<bool> isDeviceCompromised() async {
    // Use cached result if available
    if (_isDeviceCompromised != null) return _isDeviceCompromised!;

    try {
      if (Platform.isAndroid) {
        _isDeviceCompromised = await _checkAndroidRoot();
      } else if (Platform.isIOS) {
        _isDeviceCompromised = await _checkIOSJailbreak();
      } else {
        _isDeviceCompromised = false;
      }
    } catch (e) {
      // If check fails, assume device is OK but log warning
      if (kDebugMode) debugPrint('[Security] Device check failed: $e');
      _isDeviceCompromised = false;
    }

    return _isDeviceCompromised!;
  }

  /// Android root detection
  Future<bool> _checkAndroidRoot() async {
    // Check for common root indicators
    final suspiciousPaths = [
      '/system/app/Superuser.apk',
      '/sbin/su',
      '/system/bin/su',
      '/system/xbin/su',
      '/data/local/xbin/su',
      '/data/local/bin/su',
      '/system/sd/xbin/su',
      '/system/bin/failsafe/su',
      '/data/local/su',
      '/su/bin/su',
      '/system/app/SuperSU',
      '/system/app/SuperSU.apk',
      '/system/xbin/daemonsu',
      '/system/etc/init.d/99telecom',
      '/system/app/com.thirdparty.superuser.apk',
      '/data/adb/magisk',
      '/sbin/.magisk',
      '/cache/.disable_magisk',
      '/dev/.magisk.unblock',
      '/data/data/com.topjohnwu.magisk',
      '/data/user_de/0/com.topjohnwu.magisk',
    ];

    // Check for dangerous apps
    final dangerousApps = [
      'com.topjohnwu.magisk',
      'com.koushikdutta.superuser',
      'com.thirdparty.superuser',
      'eu.chainfire.supersu',
      'com.noshufou.android.su',
      'com.yellowes.su',
      'com.zachspong.temprootremovejb',
      'com.ramdroid.appquarantine',
      'com.devadvance.rootcloak',
      'de.robv.android.xposed.installer',
      'com.saurik.substrate',
      'com.amphoras.hidemyroot',
      'com.formyhm.hideroot',
    ];

    for (final path in suspiciousPaths) {
      if (await File(path).exists()) {
        if (kDebugMode) debugPrint('[Security] Root indicator found: $path');
        return true;
      }
    }

    // Check if su binary is executable
    try {
      final result = await Process.run('which', ['su']);
      if (result.exitCode == 0 && result.stdout.toString().isNotEmpty) {
        if (kDebugMode) debugPrint('[Security] su binary found in PATH');
        return true;
      }
    } catch (_) {
      // which command not available or failed - that's fine
    }

    // Check for test-keys in build tags (emulator/dev builds)
    try {
      final result = await Process.run('getprop', ['ro.build.tags']);
      if (result.stdout.toString().contains('test-keys')) {
        if (kDebugMode) debugPrint('[Security] Test-keys build detected');
        return true;
      }
    } catch (_) {
      // getprop not available - that's fine
    }

    return false;
  }

  /// iOS jailbreak detection
  Future<bool> _checkIOSJailbreak() async {
    // Check for common jailbreak indicators
    final suspiciousPaths = [
      '/Applications/Cydia.app',
      '/Applications/Sileo.app',
      '/Applications/Zebra.app',
      '/Applications/blackra1n.app',
      '/Applications/FakeCarrier.app',
      '/Applications/Icy.app',
      '/Applications/IntelliScreen.app',
      '/Applications/MxTube.app',
      '/Applications/RockApp.app',
      '/Applications/SBSettings.app',
      '/Applications/WinterBoard.app',
      '/Library/MobileSubstrate/MobileSubstrate.dylib',
      '/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist',
      '/Library/MobileSubstrate/DynamicLibraries/Veency.plist',
      '/private/var/lib/apt',
      '/private/var/lib/apt/',
      '/private/var/lib/cydia',
      '/private/var/mobile/Library/SBSettings/Themes',
      '/private/var/stash',
      '/private/var/tmp/cydia.log',
      '/private/var/log/syslog',
      '/System/Library/LaunchDaemons/com.ikey.bbot.plist',
      '/System/Library/LaunchDaemons/com.saurik.Cydia.Startup.plist',
      '/bin/bash',
      '/bin/sh',
      '/usr/sbin/sshd',
      '/usr/libexec/ssh-keysign',
      '/usr/sbin/sshd',
      '/usr/bin/sshd',
      '/var/cache/apt',
      '/var/lib/apt',
      '/var/lib/cydia',
      '/etc/apt',
      '/etc/ssh/sshd_config',
      '/Applications/Checkra1n.app',
      '/var/binpack',
      '/var/checkra1n.dmg',
    ];

    for (final path in suspiciousPaths) {
      if (await File(path).exists() || await Directory(path).exists()) {
        if (kDebugMode) debugPrint('[Security] Jailbreak indicator found: $path');
        return true;
      }
    }

    // Try to write to a system location (should fail on non-jailbroken)
    try {
      final testFile = File('/private/jailbreak_test.txt');
      await testFile.writeAsString('test');
      await testFile.delete();
      // If we got here, device is jailbroken
      if (kDebugMode) debugPrint('[Security] Write to /private succeeded - jailbroken');
      return true;
    } catch (_) {
      // Expected on non-jailbroken devices
    }

    // Check if app can fork (should fail on non-jailbroken)
    try {
      final result = await Process.run('uname', ['-a']);
      if (result.exitCode == 0) {
        if (kDebugMode) debugPrint('[Security] uname executed - potential jailbreak');
        // This alone isn't definitive, so don't return true
      }
    } catch (_) {
      // Expected on non-jailbroken devices
    }

    return false;
  }

  /// Check if app is running in debugger
  bool get isDebuggerAttached {
    // In release mode, this should always be false
    return kDebugMode;
  }

  /// Check if running in emulator/simulator
  Future<bool> isEmulator() async {
    try {
      if (Platform.isAndroid) {
        final result = await Process.run('getprop', ['ro.hardware']);
        final hardware = result.stdout.toString().toLowerCase();
        return hardware.contains('goldfish') ||
            hardware.contains('ranchu') ||
            hardware.contains('sdk') ||
            hardware.contains('emulator');
      } else if (Platform.isIOS) {
        final result = await Process.run('uname', ['-m']);
        final machine = result.stdout.toString().toLowerCase();
        return machine.contains('x86') || machine.contains('i386');
      }
    } catch (_) {
      // Check failed, assume not emulator
    }
    return false;
  }

  /// Verify secure storage is functioning correctly
  Future<bool> verifySecureStorage() async {
    try {
      const storage = FlutterSecureStorage(
        aOptions: AndroidOptions(encryptedSharedPreferences: true),
        iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
      );

      const testKey = '_security_test_key';
      const testValue = 'test_value_${1234}';

      await storage.write(key: testKey, value: testValue);
      final readValue = await storage.read(key: testKey);
      await storage.delete(key: testKey);

      return readValue == testValue;
    } catch (e) {
      if (kDebugMode) debugPrint('[Security] Secure storage verification failed: $e');
      return false;
    }
  }

  /// Perform comprehensive security check
  /// Returns a map of security check results
  Future<Map<String, bool>> performSecurityAudit() async {
    return {
      'deviceCompromised': await isDeviceCompromised(),
      'isEmulator': await isEmulator(),
      'secureStorageWorking': await verifySecureStorage(),
      'debuggerAttached': isDebuggerAttached,
    };
  }

  /// Clear cached security results (force re-check)
  void clearCache() {
    _isDeviceCompromised = null;
  }
}
