import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';

/// Service for encrypting and decrypting sensitive content.
/// Uses AES-256 encryption with user-specific keys derived from their user ID.
class EncryptionService {
  static final EncryptionService _instance = EncryptionService._internal();
  
  factory EncryptionService() => _instance;
  
  EncryptionService._internal();

  // App-level secret salt (in production, store this securely)
  static const String _appSalt = 'JustWrite2024SecureSalt!@#';

  /// Derives a 256-bit key from user ID using SHA-256
  Key _deriveKey(String userId) {
    final combined = '$_appSalt:$userId';
    final hash = sha256.convert(utf8.encode(combined));
    return Key(Uint8List.fromList(hash.bytes));
  }

  /// Generates a random 16-byte IV
  IV _generateIV() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    return IV(Uint8List.fromList(bytes));
  }

  /// Encrypts content using AES-256-CBC with user-specific key.
  /// Returns encrypted content prefixed with 'enc:' and IV.
  String encrypt(String content, String userId) {
    if (content.isEmpty) return content;
    
    try {
      final key = _deriveKey(userId);
      final iv = _generateIV();
      final encrypter = Encrypter(AES(key, mode: AESMode.cbc));
      
      final encrypted = encrypter.encrypt(content, iv: iv);
      
      // Format: enc:{base64(iv)}:{base64(encrypted)}
      final ivBase64 = base64Encode(iv.bytes);
      final encryptedBase64 = encrypted.base64;
      
      return 'enc:$ivBase64:$encryptedBase64';
    } catch (e) {
      // If encryption fails, return original content
      // (shouldn't happen, but fail safely)
      return content;
    }
  }

  /// Decrypts AES-256-CBC encrypted content.
  /// Automatically handles both encrypted and unencrypted content.
  String decrypt(String content, String userId) {
    if (content.isEmpty) return content;
    
    // Check if content is encrypted (starts with 'enc:')
    if (!content.startsWith('enc:')) {
      return content; // Not encrypted, return as-is
    }
    
    try {
      // Parse format: enc:{iv}:{encrypted}
      final parts = content.split(':');
      if (parts.length != 3) {
        return content; // Invalid format
      }
      
      final ivBase64 = parts[1];
      final encryptedBase64 = parts[2];
      
      final key = _deriveKey(userId);
      final iv = IV(Uint8List.fromList(base64Decode(ivBase64)));
      final encrypter = Encrypter(AES(key, mode: AESMode.cbc));
      
      final decrypted = encrypter.decrypt64(encryptedBase64, iv: iv);
      return decrypted;
    } catch (e) {
      // If decryption fails, return original
      // (might be corrupted or wrong key)
      return content;
    }
  }

  /// Checks if content is encrypted
  bool isEncrypted(String content) {
    return content.startsWith('enc:');
  }
}
