import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class LLMService {
  static final LLMService _instance = LLMService._internal();

  factory LLMService() {
    return _instance;
  }

  LLMService._internal();

  final groqUrl = dotenv.env['GROQ_API_URL']!;
  final groqKey = dotenv.env['GROQ_API_KEY']!;

  /// Extract tasks from text using Groq LLM
  Future<List<Map<String, dynamic>>> extractTasks(String text) async {
    try {
      final response = await http.post(
        Uri.parse(groqUrl),
        headers: {
          'Authorization': 'Bearer $groqKey',
          'Content-Type': 'application/json',
        },
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
      final jsonMatch = RegExp(r'\{[\s\S]*\}').firstMatch(content);
      final jsonStr = jsonMatch?.group(0) ?? content;
      final parsed = jsonDecode(jsonStr);

      return List<Map<String, dynamic>>.from(parsed['tasks'] ?? []);
    } catch (e) {
      print('LLM Error: $e');
      return [];
    }
  }

  /// Generate summary from text using Groq LLM
  Future<String> generateSummary(String text) async {
    try {
      final response = await http.post(
        Uri.parse(groqUrl),
        headers: {
          'Authorization': 'Bearer $groqKey',
          'Content-Type': 'application/json',
        },
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
      return data['choices']?[0]?['message']?['content'] ?? '';
    } catch (e) {
      print('LLM Error: $e');
      return '';
    }
  }
}
