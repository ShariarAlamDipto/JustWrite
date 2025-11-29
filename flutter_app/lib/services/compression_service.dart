import 'dart:convert';
import 'dart:io';

/// Service for compressing and decompressing text content for efficient storage.
/// Uses gzip compression which is widely supported and efficient for text.
class CompressionService {
  static final CompressionService _instance = CompressionService._internal();
  
  factory CompressionService() => _instance;
  
  CompressionService._internal();

  /// Compresses text content to a base64-encoded gzip string.
  /// Returns the original text if compression doesn't reduce size.
  String compress(String text) {
    if (text.isEmpty || text.length < 100) {
      // Don't compress very short text - overhead isn't worth it
      return text;
    }
    
    try {
      final bytes = utf8.encode(text);
      final compressed = gzip.encode(bytes);
      
      // Only use compressed version if it's actually smaller
      if (compressed.length < bytes.length) {
        // Prefix with 'gz:' to indicate compressed content
        return 'gz:${base64Encode(compressed)}';
      }
      return text;
    } catch (e) {
      // If compression fails, return original text
      return text;
    }
  }

  /// Decompresses a gzip-compressed base64 string back to text.
  /// Automatically handles both compressed and uncompressed content.
  String decompress(String content) {
    if (content.isEmpty) return content;
    
    // Check if content is compressed (starts with 'gz:')
    if (!content.startsWith('gz:')) {
      return content; // Not compressed, return as-is
    }
    
    try {
      final base64Data = content.substring(3); // Remove 'gz:' prefix
      final compressed = base64Decode(base64Data);
      final decompressed = gzip.decode(compressed);
      return utf8.decode(decompressed);
    } catch (e) {
      // If decompression fails, return original (might be plain text)
      return content;
    }
  }

  /// Calculates the compression ratio for given text.
  /// Returns a value between 0 and 1 where lower is better compression.
  double getCompressionRatio(String text) {
    if (text.isEmpty) return 1.0;
    
    final compressed = compress(text);
    if (!compressed.startsWith('gz:')) {
      return 1.0; // No compression applied
    }
    
    final originalSize = utf8.encode(text).length;
    final compressedSize = compressed.length;
    return compressedSize / originalSize;
  }

  /// Estimates storage savings in bytes for given text.
  int estimateSavings(String text) {
    if (text.isEmpty) return 0;
    
    final originalSize = utf8.encode(text).length;
    final compressed = compress(text);
    
    if (!compressed.startsWith('gz:')) {
      return 0; // No compression applied
    }
    
    final compressedSize = compressed.length;
    return originalSize - compressedSize;
  }
}
