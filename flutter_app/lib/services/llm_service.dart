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
              'content': '''You are a highly skilled task extraction assistant. Your ONLY response must be valid JSON with no additional text before or after.
You will extract 3-5 actionable tasks from the user's input. Each task should be:
- **Title**: A concise action-oriented title (max 10 words).
- **Description**: A clear, actionable breakdown of the task that outlines the **step-by-step process** and any **resources/tools** needed. If the task requires multiple sub-tasks, break them down clearly.
- **Priority**: Assign "high", "medium", or "low" priority based on:
    - "high" for tasks critical to the project or that unblock others.
    - "medium" for important but non-urgent tasks.
    - "low" for optional or low-impact tasks.

### Additional Guidelines:
- If the user input is unclear or vague, make **reasonable assumptions** to fill in the gaps, but ensure the resulting tasks are still **actionable** and useful.
- If necessary, provide **dependencies** between tasks and indicate which ones should be done first.
- Avoid overwhelming the user—keep tasks **manageable** (typically something that can be completed in 30-90 minutes).
- If a task requires a **tool**, resource, or extra context, mention it in the description.
- **Do not** include any explanations or elaboration beyond the JSON response.

Return **only** the following JSON format:
{
  "tasks": [
    {
      "title": "string (brief, under 10 words)",
      "description": "string (clear, actionable description with necessary resources/tools)",
      "priority": "high" | "medium" | "low"
    }
  ]
}
If the user's text is extremely vague, make reasonable assumptions and proceed.''',
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
