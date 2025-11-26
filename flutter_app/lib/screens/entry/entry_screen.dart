import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/services/llm_service.dart';
import 'package:justwrite_mobile/widgets/mood_slider.dart';
import 'package:justwrite_mobile/widgets/prompt_card.dart';

const scienceBackedPrompts = [
  {
    'id': 'planning-1',
    'category': 'Morning / Planning',
    'question': 'What are the top 3 outcomes I want from today?',
    'rationale': 'Forces prioritization; primes goal-directed behavior',
    'icon': '🎯',
  },
  {
    'id': 'planning-2',
    'category': 'Morning / Planning',
    'question': 'If I get interrupted, what will I do to still make progress?',
    'rationale': 'Implementation intentions dramatically increase follow-through',
    'icon': '📋',
  },
  {
    'id': 'gratitude-1',
    'category': 'Gratitude / Positive Affect',
    'question': 'List three things you\'re grateful for today — small or big.',
    'rationale': 'Short daily gratitude boosts positive affect and wellbeing',
    'icon': '🙏',
  },
  {
    'id': 'gratitude-2',
    'category': 'Gratitude / Positive Affect',
    'question': 'What went well yesterday?',
    'rationale': 'Reinforces learning from small wins and increases optimism',
    'icon': '✨',
  },
  {
    'id': 'cbt-1',
    'category': 'Emotional Processing / CBT',
    'question':
        'What situation caused the strongest emotion today? Describe what happened, the thought you had, and the emotion\'s intensity (0–10).',
    'rationale': 'Structured recording helps identify automatic thoughts and reduce impact',
    'icon': '💭',
  },
  {
    'id': 'cbt-2',
    'category': 'Emotional Processing / CBT',
    'question': 'Now list one realistic alternative thought or interpretation.',
    'rationale': 'Reappraisal decreases emotional intensity and improves regulation',
    'icon': '🔄',
  },
  {
    'id': 'reflection-1',
    'category': 'Reflection & Learning',
    'question': 'What\'s one lesson I learned recently that I want to keep in mind?',
    'rationale': 'Promotes metacognition and consolidates learning from experience',
    'icon': '📖',
  },
  {
    'id': 'reflection-2',
    'category': 'Reflection & Learning',
    'question':
        'What\'s the one thing I can do in the next 24 hours that would make tomorrow noticeably better?',
    'rationale': 'Keeps journal→action funnel tight; easy candidates for tasks',
    'icon': '🚀',
  },
  {
    'id': 'expressive-1',
    'category': 'Expressive / Stress',
    'question': 'If you could say one honest thing right now, what is it? (Write for 10 minutes.)',
    'rationale': 'Uncensored writing has therapeutic and mental health benefits',
    'icon': '💬',
  },
  {
    'id': 'closure-1',
    'category': 'Micro-planning / Closure',
    'question': 'Pick 1 task from today\'s extracted tasks and write its next step (one sentence).',
    'rationale': 'Breaking tasks into immediate next steps reduces friction',
    'icon': '✅',
  },
];

class EntryScreen extends StatefulWidget {
  const EntryScreen({super.key});

  @override
  State<EntryScreen> createState() => _EntryScreenState();
}

class _EntryScreenState extends State<EntryScreen> {
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _gratitudeControllers = [
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
  ];

  int _mood = 5;
  int _moodIntensity = 5;
  final Set<String> _selectedPrompts = {};
  final Map<String, String> _promptAnswers = {};
  bool _isAnalyzing = false;
  String? _summary;
  List<Map<String, dynamic>> _extractedTasks = [];

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    for (var controller in _gratitudeControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _analyzeWithAI() async {
    if (_contentController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write something first')),
      );
      return;
    }

    setState(() => _isAnalyzing = true);

    try {
      final combinedText = [
        _titleController.text,
        _contentController.text,
        ..._promptAnswers.entries.map((e) => '${e.key}: ${e.value}'),
      ].where((s) => s.isNotEmpty).join('\n\n');

      final llmService = LLMService();

      // Extract tasks and generate summary in parallel
      final [tasks, summary] = await Future.wait([
        llmService.extractTasks(combinedText),
        llmService.generateSummary(combinedText),
      ]);

      setState(() {
        _extractedTasks = (tasks as List?)?.cast<Map<String, dynamic>>() ?? [];
        _summary = summary as String;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isAnalyzing = false);
    }
  }

  Future<void> _saveEntry() async {
    if (_contentController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write something')),
      );
      return;
    }

    try {
      final authProvider = context.read<AuthProvider>();
      final entryProvider = context.read<EntryProvider>();

      await entryProvider.createEntry(
        userId: authProvider.user!.id,
        content: _contentController.text,
        title: _titleController.text.isEmpty ? null : _titleController.text,
        mood: _mood,
        moodIntensity: _moodIntensity,
        gratitude: _gratitudeControllers
            .map((c) => c.text)
            .where((s) => s.isNotEmpty)
            .toList(),
        promptAnswers: _promptAnswers,
      );

      // Save extracted tasks if any
      if (_extractedTasks.isNotEmpty) {
        if (!mounted) return;
        final taskProvider = context.read<TaskProvider>();
        for (var taskData in _extractedTasks) {
          await taskProvider.createTask(
            userId: authProvider.user!.id,
            title: taskData['title'] ?? '',
            description: taskData['description'] ?? '',
            priority: taskData['priority'] ?? 'medium',
          );
        }
      }

      // Reset form
      _titleController.clear();
      _contentController.clear();
      for (final c in _gratitudeControllers) {
        c.clear();
      }
      setState(() {
        _mood = 5;
        _moodIntensity = 5;
        _selectedPrompts.clear();
        _promptAnswers.clear();
        _summary = null;
        _extractedTasks.clear();
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ Entry saved!')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'NEW ENTRY',
              style: Theme.of(context).textTheme.displaySmall,
            ),
            Text(
              DateTime.now().toString().split(' ')[0],
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 24),

            // Title
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                hintText: 'Title (optional)',
                prefixIcon: Icon(Icons.label),
              ),
            ),
            const SizedBox(height: 16),

            // Mood
            Text(
              'MOOD',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            MoodSlider(
              initialMood: _mood,
              initialIntensity: _moodIntensity,
              onChanged: (mood, intensity) {
                setState(() {
                  _mood = mood;
                  _moodIntensity = intensity;
                });
              },
            ),
            const SizedBox(height: 24),

            // Content
            Text(
              'YOUR THOUGHTS',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _contentController,
              maxLines: 8,
              decoration: const InputDecoration(
                hintText: 'Write freely here...',
                prefixIcon: Icon(Icons.edit),
              ),
            ),
            const SizedBox(height: 24),

            // Gratitude
            Text(
              'GRATITUDE (3 things)',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            ...[0, 1, 2].map((i) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: TextField(
                controller: _gratitudeControllers[i],
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'Thing ${i + 1}',
                ),
              ),
            )),
            const SizedBox(height: 24),

            // Prompts
            Text(
              'GUIDED PROMPTS',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            ...scienceBackedPrompts.map((prompt) => PromptCard(
              prompt: prompt,
              isSelected: _selectedPrompts.contains(prompt['id']),
              answer: _promptAnswers[prompt['id']],
              onToggle: (selected) {
                setState(() {
                  if (selected) {
                    _selectedPrompts.add(prompt['id'] as String);
                  } else {
                    _selectedPrompts.remove(prompt['id']);
                    _promptAnswers.remove(prompt['id']);
                  }
                });
              },
              onAnswerChange: (answer) {
                setState(() {
                  _promptAnswers[prompt['id'] as String] = answer;
                });
              },
            )),
            const SizedBox(height: 24),

            // AI Analysis Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isAnalyzing ? null : _analyzeWithAI,
                child: _isAnalyzing
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Color(0xFF0a0e27)),
                        ),
                      )
                    : const Text('✨ ANALYZE WITH AI'),
              ),
            ),
            const SizedBox(height: 16),

            // AI Summary
            if (_summary != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1a1f3a),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF00ffd5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '📊 AI SUMMARY',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _summary!,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),

            // Extracted Tasks
            if (_extractedTasks.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1a1f3a),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF00ffd5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '✓ EXTRACTED TO-DOS (${_extractedTasks.length})',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 8),
                    ..._extractedTasks.map((task) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getPriorityColor(task['priority']),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              task['priority'].toUpperCase(),
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF0a0e27),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              task['title'],
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                        ],
                      ),
                    )),
                  ],
                ),
              ),
            const SizedBox(height: 24),

            // Save Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saveEntry,
                child: const Text('💾 SAVE ENTRY'),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return const Color(0xFFff0033);
      case 'medium':
        return const Color(0xFF00ffd5);
      default:
        return const Color(0xFF7a7a7a);
    }
  }
}
