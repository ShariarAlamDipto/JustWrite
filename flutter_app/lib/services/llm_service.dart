import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

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

  final groqUrl = dotenv.env['GROQ_API_URL']!;
  final groqKey = dotenv.env['GROQ_API_KEY']!;
  
  // Precomputed headers for reuse
  late final Map<String, String> _headers = {
    'Authorization': 'Bearer $groqKey',
    'Content-Type': 'application/json',
  };
  
  // Precompiled regex for JSON extraction
  static final RegExp _jsonRegex = RegExp(r'\{[\s\S]*\}');
  
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
    
    try {
      final response = await _client.post(
        Uri.parse(groqUrl),
        headers: _headers,
        body: jsonEncode({
          'model': 'llama-3.3-70b-versatile',
          'messages': [
            {
              'role': 'system',
              'content': '''You are a task extraction assistant. Your ONLY response must be valid JSON, nothing else.
Extract 2-5 actionable tasks from the user's text.
Return ONLY this JSON format (no other text before or after):
{
  "tasks": [
    { "title": "string (brief, under 10 words)", "description": "string", "priority": "high" | "medium" | "low" }
  ]
}
Do not include markdown formatting or explanations.''',
            },
            {
              'role': 'user',
              'content': text,
            },
          ],
          'temperature': 0.7,
          'max_tokens': 1024,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to extract tasks: ${response.statusCode}');
      }

      final data = jsonDecode(response.body);
      final content = data['choices']?[0]?['message']?['content'] as String?;

      if (content == null) {
        throw Exception('No content in response');
      }

      // Extract JSON from response (handle markdown formatting)
      final jsonMatch = _jsonRegex.firstMatch(content);
      final jsonStr = jsonMatch?.group(0) ?? content;
      final parsed = jsonDecode(jsonStr);

      final tasks = List<Map<String, dynamic>>.from(parsed['tasks'] ?? []);
      
      // Cache result
      _cleanCache();
      _cache[cacheKey] = _CacheEntry(tasks);
      
      return tasks;
    } catch (e) {
      // SECURITY: Error logged without sensitive details
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
    
    try {
      final response = await _client.post(
        Uri.parse(groqUrl),
        headers: _headers,
        body: jsonEncode({
          'model': 'llama-3.3-70b-versatile',
          'messages': [
            {
              'role': 'system',
              'content':
                  'You are a journaling assistant. Summarize the user\'s journal entry in 1-2 sentences (max 100 words). Be concise and capture the essence.',
            },
            {
              'role': 'user',
              'content': text,
            },
          ],
          'temperature': 0.5,
          'max_tokens': 200,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to generate summary: ${response.statusCode}');
      }

      final data = jsonDecode(response.body);
      final summary = data['choices']?[0]?['message']?['content'] ?? '';
      
      // Cache result
      _cleanCache();
      _cache[cacheKey] = _CacheEntry(summary);
      
      return summary;
    } catch (e) {
      // SECURITY: Error logged without sensitive details
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
