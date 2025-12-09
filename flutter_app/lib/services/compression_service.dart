import 'dart:convert';
import 'dart:io';

/// Service for compressing and decompressing text content for efficient storage.
/// Uses gzip compression which is widely supported and efficient for text.
class CompressionService {
  static final CompressionService _instance = CompressionService._internal();
  
  factory CompressionService() => _instance;
  
  CompressionService._internal();
  
  // Cache for recently decompressed content
  final Map<int, String> _decompressCache = {};
  static const int _maxCacheSize = 20;

  /// Compresses text content to a base64-encoded gzip string.
  /// Returns the original text if compression doesn't reduce size.
  String compress(String text) {
    if (text.isEmpty || text.length < 150) {
      // Increased threshold - don't compress shorter text
      return text;
    }
    
    try {
      final bytes = utf8.encode(text);
      final compressed = gzip.encode(bytes);
      
      // Only use compressed version if it saves at least 20%
      if (compressed.length < bytes.length * 0.8) {
        return 'gz:${base64Encode(compressed)}';
      }
      return text;
    } catch (e) {
      return text;
    }
  }

  /// Decompresses a gzip-compressed base64 string back to text.
  /// Uses caching for recently accessed content.
  String decompress(String content) {
    if (content.isEmpty) return content;
    if (!content.startsWith('gz:')) return content;
    
    // Check cache first
    final cacheKey = content.hashCode;
    if (_decompressCache.containsKey(cacheKey)) {
      return _decompressCache[cacheKey]!;
    }
    
    try {
      final base64Data = content.substring(3);
      final compressed = base64Decode(base64Data);
      final decompressed = gzip.decode(compressed);
      final result = utf8.decode(decompressed);
      
      // Cache result
      if (_decompressCache.length >= _maxCacheSize) {
        _decompressCache.remove(_decompressCache.keys.first);
      }
      _decompressCache[cacheKey] = result;
      
      return result;
    } catch (e) {
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
