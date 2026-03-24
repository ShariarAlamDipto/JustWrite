import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Service for encrypting and decrypting sensitive content.
/// Uses AES-256-GCM encryption with PBKDF2-derived keys for maximum security.
///
/// CRITICAL: PBKDF2 iterations MUST match the web app (600,000) to ensure
/// cross-platform decryption works. Both platforms embed the salt in the
/// ciphertext format enc2:{salt}:{iv}:{data}.
class EncryptionService {
  static final EncryptionService _instance = EncryptionService._internal();

  factory EncryptionService() => _instance;

  EncryptionService._internal();

  // Secure storage (uses Android Keystore / iOS Keychain)
  static FlutterSecureStorage get _secureStorage => const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      sharedPreferencesName: 'justwrite_secure_prefs',
      preferencesKeyPrefix: 'jw_',
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  // PBKDF2 iterations - MUST match web app (600,000) for cross-platform sync
  static const int _pbkdf2Iterations = 600000;
  // Legacy iteration count used by Flutter before the cross-platform fix
  static const int _pbkdf2IterationsLegacy = 210000;

  static const int _saltLength = 32;
  static const int _keyLength = 32; // 256 bits
  static const int _ivLength = 12; // GCM standard IV length

  /// Generates a cryptographically secure random salt
  Uint8List _generateSalt() {
    final random = Random.secure();
    return Uint8List.fromList(
      List<int>.generate(_saltLength, (_) => random.nextInt(256))
    );
  }

  /// PBKDF2 key derivation with SHA-256
  /// Implements standard PBKDF2-HMAC-SHA256 algorithm.
  Key _pbkdf2DeriveKey(String password, Uint8List salt, {int iterations = _pbkdf2Iterations}) {
    var result = Uint8List(_keyLength);
    var block = Uint8List(_keyLength);

    // U1 = PRF(Password, Salt || INT(1))
    var hmacInput = Uint8List(salt.length + 4);
    hmacInput.setRange(0, salt.length, salt);
    hmacInput[salt.length + 0] = 0;
    hmacInput[salt.length + 1] = 0;
    hmacInput[salt.length + 2] = 0;
    hmacInput[salt.length + 3] = 1;

    var hmac = Hmac(sha256, utf8.encode(password));
    var u = hmac.convert(hmacInput).bytes;
    block = Uint8List.fromList(u);

    // Iterate: U_{n} = PRF(Password, U_{n-1}), DK = U1 XOR U2 XOR ... XOR U_c
    for (var i = 1; i < iterations; i++) {
      u = hmac.convert(u).bytes;
      for (var j = 0; j < _keyLength; j++) {
        block[j] ^= u[j];
      }
    }

    result.setRange(0, _keyLength, block);
    return Key(result);
  }

  /// Generates a random IV for GCM mode
  IV _generateIV() {
    final random = Random.secure();
    final bytes = List<int>.generate(_ivLength, (_) => random.nextInt(256));
    return IV(Uint8List.fromList(bytes));
  }

  /// Encrypts content using AES-256-GCM with a fresh random salt.
  /// Returns encrypted content in format: enc2:{salt}:{iv}:{encrypted}
  Future<String> encryptAsync(String content, String userId) async {
    if (content.isEmpty) return content;

    try {
      // Always use a fresh random salt per encryption (never reuse)
      final salt = _generateSalt();
      final key = _pbkdf2DeriveKey(userId, salt);
      final iv = _generateIV();

      final encrypter = Encrypter(AES(key, mode: AESMode.gcm));
      final encrypted = encrypter.encrypt(content, iv: iv);

      final saltBase64 = base64Encode(salt);
      final ivBase64 = base64Encode(iv.bytes);
      final encryptedBase64 = encrypted.base64;

      return 'enc2:$saltBase64:$ivBase64:$encryptedBase64';
    } catch (e) {
      throw Exception('Encryption failed - cannot save unencrypted content');
    }
  }

  /// Synchronous encrypt - uses fresh random salt
  String encrypt(String content, String userId) {
    if (content.isEmpty) return content;

    try {
      // Always use a fresh random salt per encryption
      final salt = _generateSalt();
      final key = _pbkdf2DeriveKey(userId, salt);
      final iv = _generateIV();

      final encrypter = Encrypter(AES(key, mode: AESMode.gcm));
      final encrypted = encrypter.encrypt(content, iv: iv);

      final saltBase64 = base64Encode(salt);
      final ivBase64 = base64Encode(iv.bytes);
      final encryptedBase64 = encrypted.base64;

      return 'enc2:$saltBase64:$ivBase64:$encryptedBase64';
    } catch (e) {
      throw Exception('Encryption failed - cannot save unencrypted content');
    }
  }

  /// Decrypts content encrypted with either old (enc:) or new (enc2:) format.
  Future<String> decryptAsync(String content, String userId) async {
    if (content.isEmpty) return content;

    if (content.startsWith('enc2:')) {
      return _decryptV2(content, userId);
    }

    if (content.startsWith('enc:')) {
      return _decryptLegacy(content, userId);
    }

    return content; // Not encrypted
  }

  /// Synchronous decrypt for backward compatibility
  String decrypt(String content, String userId) {
    if (content.isEmpty) return content;

    if (content.startsWith('enc2:')) {
      return _decryptV2(content, userId);
    }

    if (content.startsWith('enc:')) {
      return _decryptLegacy(content, userId);
    }

    return content;
  }

  /// Decrypts new format (enc2:) with embedded salt.
  /// IMPORTANT: Always derives key fresh from the embedded salt.
  /// Tries 600k iterations first (web/new mobile), falls back to 210k (old mobile).
  String _decryptV2(String content, String userId) {
    try {
      final parts = content.split(':');
      if (parts.length != 4) return content;

      final salt = Uint8List.fromList(base64Decode(parts[1]));
      final iv = IV(Uint8List.fromList(base64Decode(parts[2])));
      final encryptedBase64 = parts[3];

      // Try primary iterations (600k - matches web and new mobile)
      // IMPORTANT: Always derive fresh from embedded salt, never use a cached key
      try {
        final key = _pbkdf2DeriveKey(userId, salt, iterations: _pbkdf2Iterations);
        final encrypter = Encrypter(AES(key, mode: AESMode.gcm));
        return encrypter.decrypt64(encryptedBase64, iv: iv);
      } catch (_) {
        // Primary failed - try legacy mobile iterations (210k for old entries)
      }

      // Fallback: old Flutter encryption before cross-platform fix
      final legacyKey = _pbkdf2DeriveKey(userId, salt, iterations: _pbkdf2IterationsLegacy);
      final legacyEncrypter = Encrypter(AES(legacyKey, mode: AESMode.gcm));
      return legacyEncrypter.decrypt64(encryptedBase64, iv: iv);
    } catch (e) {
      // Return original content if all decryption attempts fail
      return content;
    }
  }

  /// Decrypts legacy format (enc:) for backward compatibility
  /// WARNING: Legacy format uses weak key derivation, data should be re-encrypted
  String _decryptLegacy(String content, String userId) {
    try {
      final parts = content.split(':');
      if (parts.length != 3) return content;

      final ivBase64 = parts[1];
      final encryptedBase64 = parts[2];

      // Legacy: Simple SHA-256 hash (kept for backward compatibility only)
      const legacySalt = 'JustWrite2024SecureSalt!@#';
      final combined = '$legacySalt:$userId';
      final hash = sha256.convert(utf8.encode(combined));
      final key = Key(Uint8List.fromList(hash.bytes));

      final iv = IV(Uint8List.fromList(base64Decode(ivBase64)));
      final encrypter = Encrypter(AES(key, mode: AESMode.cbc));

      return encrypter.decrypt64(encryptedBase64, iv: iv);
    } catch (e) {
      return content;
    }
  }

  /// Checks if content is encrypted
  bool isEncrypted(String content) {
    return content.startsWith('enc:') || content.startsWith('enc2:');
  }

  /// Checks if content uses legacy encryption (should be re-encrypted)
  bool isLegacyEncryption(String content) {
    return content.startsWith('enc:');
  }

  /// Re-encrypts content from legacy format to new secure format
  Future<String> upgradeEncryption(String content, String userId) async {
    if (!isLegacyEncryption(content)) return content;

    final decrypted = _decryptLegacy(content, userId);
    if (decrypted == content) return content; // Decryption failed

    return encryptAsync(decrypted, userId);
  }

  /// Clear any stored per-user salts on logout (housekeeping)
  Future<void> clearUserData(String userId) async {
    try {
      await _secureStorage.delete(key: 'encryption_salt_$userId');
    } catch (_) {}
  }
}
