import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart';

/// Response cache entry with expiration
class _CacheEntry {
  final dynamic data;
  final DateTime timestamp;
  
  _CacheEntry(this.data) : timestamp = DateTime.now();
  
  bool get isExpired => 
    DateTime.now().difference(timestamp) > const Duration(minutes: 5);
}

class LLMService {
  static final LLMService _instance = LLMService._internal();

  factory LLMService() {
    return _instance;
  }

  LLMService._internal();

  // Reusable HTTP client for connection pooling
  final http.Client _client = http.Client();
  
  // Response cache to avoid duplicate API calls
  final Map<String, _CacheEntry> _cache = {};
  static const int _maxCacheSize = 50;
  
  // Request timeout
  static const Duration _timeout = Duration(seconds: 30);

  final groqUrl = dotenv.env['GROQ_API_URL']!;
  final groqKey = dotenv.env['GROQ_API_KEY']!;
  
  // Precomputed headers for reuse
  late final Map<String, String> _headers = {
    'Authorization': 'Bearer $groqKey',
    'Content-Type': 'application/json',
  };
  
  // Precompiled regex for JSON extraction
  static final RegExp _jsonRegex = RegExp(r'\{[\s\S]*\}');
  
  // In-flight request tracking to prevent duplicate requests
  final Map<String, Future<dynamic>> _inFlightRequests = {};
  
  /// Generate cache key from text
  String _getCacheKey(String prefix, String text) {
    // Use hash for efficient lookup
    return '$prefix:${text.hashCode}';
  }
  
  /// Clean expired cache entries
  void _cleanCache() {
    if (_cache.length > _maxCacheSize) {
      _cache.removeWhere((_, entry) => entry.isExpired);
      // If still too large, remove oldest entries
      if (_cache.length > _maxCacheSize) {
        final entries = _cache.entries.toList()
          ..sort((a, b) => a.value.timestamp.compareTo(b.value.timestamp));
        final toRemove = entries.take(_cache.length - _maxCacheSize ~/ 2);
        for (final entry in toRemove) {
          _cache.remove(entry.key);
        }
      }
    }
  }

  /// Extract tasks from text using Groq LLM
  Future<List<Map<String, dynamic>>> extractTasks(String text) async {
    // Check cache first
    final cacheKey = _getCacheKey('tasks', text);
    final cached = _cache[cacheKey];
    if (cached != null && !cached.isExpired) {
      return List<Map<String, dynamic>>.from(cached.data);
    }
    
    // Check for in-flight request
    if (_inFlightRequests.containsKey(cacheKey)) {
      final result = await _inFlightRequests[cacheKey];
      return List<Map<String, dynamic>>.from(result ?? []);
    }
    
    // Create the request future
    final requestFuture = _extractTasksInternal(text, cacheKey);
    _inFlightRequests[cacheKey] = requestFuture;
    
    try {
      return await requestFuture;
    } finally {
      _inFlightRequests.remove(cacheKey);
    }
  }
  
  Future<List<Map<String, dynamic>>> _extractTasksInternal(String text, String cacheKey) async {
    try {
      final response = await _client.post(
        Uri.parse(groqUrl),
        headers: _headers,
        body: jsonEncode({
          'model': 'llama-3.3-70b-versatile',
          'messages': [
            {
              'role': 'system',
              'content': '''You are a task extraction assistant. Analyze the text thoroughly and extract ALL actionable tasks, no matter how many. Be comprehensive and detailed.

For each task provide:
- A clear, specific title
- Detailed description with step-by-step instructions when applicable
- Priority level (high/medium/low) based on urgency and importance

Return ONLY valid JSON in this format:
{"tasks":[{"title":"specific task title","description":"detailed steps and instructions","priority":"high|medium|low"}]}

Extract every possible task - do not limit the number. Be thorough and capture all actionable items from the text.''',
            },
            {'role': 'user', 'content': text},
          ],
          'temperature': 0.5,
          'max_tokens': 4000,
        }),
      ).timeout(const Duration(seconds: 60));

      if (response.statusCode != 200) {
        if (kDebugMode) debugPrint('[LLM] Task extraction failed: ${response.statusCode}');
        return [];
      }

      final data = jsonDecode(response.body);
      final content = data['choices']?[0]?['message']?['content'] as String?;
      if (content == null) return [];

      // Extract JSON from response
      final jsonMatch = _jsonRegex.firstMatch(content);
      final jsonStr = jsonMatch?.group(0) ?? content;
      final parsed = jsonDecode(jsonStr);
      final tasks = List<Map<String, dynamic>>.from(parsed['tasks'] ?? []);
      
      // Cache result
      _cleanCache();
      _cache[cacheKey] = _CacheEntry(tasks);
      
      return tasks;
    } on TimeoutException {
      if (kDebugMode) debugPrint('[LLM] Task extraction timeout');
      return [];
    } catch (e) {
      if (kDebugMode) debugPrint('[LLM] Task extraction error: $e');
      return [];
    }
  }

  /// Generate summary from text using Groq LLM
  Future<String> generateSummary(String text) async {
    // Check cache first
    final cacheKey = _getCacheKey('summary', text);
    final cached = _cache[cacheKey];
    if (cached != null && !cached.isExpired) {
      return cached.data as String;
    }
    
    // Check for in-flight request
    if (_inFlightRequests.containsKey(cacheKey)) {
      final result = await _inFlightRequests[cacheKey];
      return result as String? ?? '';
    }
    
    // Create the request future
    final requestFuture = _generateSummaryInternal(text, cacheKey);
    _inFlightRequests[cacheKey] = requestFuture;
    
    try {
      return await requestFuture;
    } finally {
      _inFlightRequests.remove(cacheKey);
    }
  }
  
  Future<String> _generateSummaryInternal(String text, String cacheKey) async {
    try {
      final response = await _client.post(
        Uri.parse(groqUrl),
        headers: _headers,
        body: jsonEncode({
          'model': 'llama-3.3-70b-versatile',
          'messages': [
            {
              'role': 'system',
              'content': 'Summarize in 1-2 sentences (max 50 words). Be concise.',
            },
            {'role': 'user', 'content': text},
          ],
          'temperature': 0.3,
          'max_tokens': 100,
        }),
      ).timeout(_timeout);

      if (response.statusCode != 200) {
        if (kDebugMode) debugPrint('[LLM] Summary failed: ${response.statusCode}');
        return '';
      }

      final data = jsonDecode(response.body);
      final summary = data['choices']?[0]?['message']?['content'] ?? '';
      
      // Cache result
      _cleanCache();
      _cache[cacheKey] = _CacheEntry(summary);
      
      return summary;
    } on TimeoutException {
      if (kDebugMode) debugPrint('[LLM] Summary timeout');
      return '';
    } catch (e) {
      if (kDebugMode) debugPrint('[LLM] Summary error: $e');
      return '';
    }
  }
  
  /// Clear response cache
  void clearCache() {
    _cache.clear();
  }
  
  /// Dispose of HTTP client when no longer needed
  void dispose() {
    _client.close();
    _cache.clear();
  }
}
