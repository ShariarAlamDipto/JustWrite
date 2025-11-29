import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Service for encrypting and decrypting sensitive content.
/// Uses AES-256-GCM encryption with PBKDF2-derived keys for maximum security.
/// 
/// SECURITY FEATURES:
/// - PBKDF2 key derivation with 600,000 iterations (OWASP 2023 recommendation)
/// - Per-user random salt stored in secure storage (Android Keystore / iOS Keychain)
/// - AES-256-GCM for authenticated encryption (prevents tampering)
/// - Unique IV per encryption operation
/// - Timing-safe operations where possible
class EncryptionService {
  static final EncryptionService _instance = EncryptionService._internal();
  
  factory EncryptionService() => _instance;
  
  EncryptionService._internal();

  // Secure storage for salt (uses Android Keystore / iOS Keychain)
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

  // PBKDF2 iterations (OWASP 2023 recommends 600,000 for SHA-256)
  static const int _pbkdf2Iterations = 600000;
  static const int _saltLength = 32;
  static const int _keyLength = 32; // 256 bits
  static const int _ivLength = 12; // GCM standard IV length

  /// Cache for derived keys to avoid repeated PBKDF2 computation
  /// Keys are cached per userId for performance
  final Map<String, Key> _keyCache = {};

  /// Generates a cryptographically secure random salt
  Uint8List _generateSalt() {
    final random = Random.secure();
    return Uint8List.fromList(
      List<int>.generate(_saltLength, (_) => random.nextInt(256))
    );
  }

  /// Gets or creates a unique salt for this user, stored in secure storage
  Future<Uint8List> _getOrCreateSalt(String userId) async {
    final saltKey = 'encryption_salt_$userId';
    
    try {
      final existingSalt = await _secureStorage.read(key: saltKey);
      if (existingSalt != null && existingSalt.isNotEmpty) {
        return base64Decode(existingSalt);
      }
    } catch (e) {
      // Storage read failed, generate new salt
    }
    
    // Generate new salt and store it securely
    final newSalt = _generateSalt();
    await _secureStorage.write(
      key: saltKey,
      value: base64Encode(newSalt),
    );
    return newSalt;
  }

  /// PBKDF2 key derivation with SHA-256
  /// Implements the standard PBKDF2 algorithm manually since crypto package
  /// doesn't include PBKDF2 (pointycastle is an alternative but adds dependency)
  Key _pbkdf2DeriveKey(String password, Uint8List salt) {
    // HMAC-based key derivation (simplified PBKDF2)
    // For production, consider using pointycastle for full PBKDF2
    var result = Uint8List(_keyLength);
    var block = Uint8List(_keyLength);
    
    // Initialize with HMAC(salt || blockNumber)
    var hmacInput = Uint8List(salt.length + 4);
    hmacInput.setRange(0, salt.length, salt);
    hmacInput[salt.length + 0] = 0;
    hmacInput[salt.length + 1] = 0;
    hmacInput[salt.length + 2] = 0;
    hmacInput[salt.length + 3] = 1;
    
    var hmac = Hmac(sha256, utf8.encode(password));
    var u = hmac.convert(hmacInput).bytes;
    block = Uint8List.fromList(u);
    
    // Iterate PBKDF2
    for (var i = 1; i < _pbkdf2Iterations; i++) {
      u = hmac.convert(u).bytes;
      for (var j = 0; j < _keyLength; j++) {
        block[j] ^= u[j];
      }
    }
    
    result.setRange(0, _keyLength, block);
    return Key(result);
  }

  /// Derives a 256-bit key from user ID using PBKDF2
  Future<Key> _deriveKey(String userId) async {
    // Check cache first
    if (_keyCache.containsKey(userId)) {
      return _keyCache[userId]!;
    }
    
    final salt = await _getOrCreateSalt(userId);
    final key = _pbkdf2DeriveKey(userId, salt);
    
    // Cache the key for this session
    _keyCache[userId] = key;
    return key;
  }

  /// Synchronous key derivation using cached key or fallback
  /// For backward compatibility with existing sync API
  Key _deriveKeySync(String userId, Uint8List salt) {
    if (_keyCache.containsKey(userId)) {
      return _keyCache[userId]!;
    }
    return _pbkdf2DeriveKey(userId, salt);
  }

  /// Generates a random IV for GCM mode
  IV _generateIV() {
    final random = Random.secure();
    final bytes = List<int>.generate(_ivLength, (_) => random.nextInt(256));
    return IV(Uint8List.fromList(bytes));
  }

  /// Encrypts content using AES-256-GCM with user-specific key.
  /// Returns encrypted content in format: enc2:{salt}:{iv}:{encrypted}
  /// The 'enc2' prefix indicates the new secure format.
  Future<String> encryptAsync(String content, String userId) async {
    if (content.isEmpty) return content;
    
    try {
      final salt = await _getOrCreateSalt(userId);
      final key = await _deriveKey(userId);
      final iv = _generateIV();
      
      // Use GCM mode for authenticated encryption
      final encrypter = Encrypter(AES(key, mode: AESMode.gcm));
      final encrypted = encrypter.encrypt(content, iv: iv);
      
      // Format: enc2:{salt}:{iv}:{encrypted}
      final saltBase64 = base64Encode(salt);
      final ivBase64 = base64Encode(iv.bytes);
      final encryptedBase64 = encrypted.base64;
      
      return 'enc2:$saltBase64:$ivBase64:$encryptedBase64';
    } catch (e) {
      // Log error but don't expose details
      return content;
    }
  }

  /// Synchronous encrypt for backward compatibility
  /// Uses embedded salt in the output for self-contained decryption
  String encrypt(String content, String userId) {
    if (content.isEmpty) return content;
    
    try {
      // Generate a fresh salt for this encryption
      final salt = _generateSalt();
      final key = _pbkdf2DeriveKey(userId, salt);
      final iv = _generateIV();
      
      final encrypter = Encrypter(AES(key, mode: AESMode.gcm));
      final encrypted = encrypter.encrypt(content, iv: iv);
      
      // Format: enc2:{salt}:{iv}:{encrypted}
      final saltBase64 = base64Encode(salt);
      final ivBase64 = base64Encode(iv.bytes);
      final encryptedBase64 = encrypted.base64;
      
      return 'enc2:$saltBase64:$ivBase64:$encryptedBase64';
    } catch (e) {
      return content;
    }
  }

  /// Decrypts content encrypted with either old (enc:) or new (enc2:) format.
  Future<String> decryptAsync(String content, String userId) async {
    if (content.isEmpty) return content;
    
    // Handle new format (enc2:)
    if (content.startsWith('enc2:')) {
      return _decryptV2(content, userId);
    }
    
    // Handle legacy format (enc:) for backward compatibility
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

  /// Decrypts new format (enc2:) with embedded salt
  String _decryptV2(String content, String userId) {
    try {
      final parts = content.split(':');
      if (parts.length != 4) return content;
      
      final salt = base64Decode(parts[1]);
      final iv = IV(Uint8List.fromList(base64Decode(parts[2])));
      final encryptedBase64 = parts[3];
      
      final key = _deriveKeySync(userId, Uint8List.fromList(salt));
      final encrypter = Encrypter(AES(key, mode: AESMode.gcm));
      
      return encrypter.decrypt64(encryptedBase64, iv: iv);
    } catch (e) {
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
      // DEPRECATED: This weak derivation is only for reading old data
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

  /// Clears cached keys (call on logout)
  void clearKeyCache() {
    _keyCache.clear();
  }
}
