import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/providers/theme_provider.dart';
import 'package:justwrite_mobile/services/llm_service.dart';
import 'package:justwrite_mobile/widgets/mood_slider.dart';
import 'package:justwrite_mobile/widgets/prompt_card.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';

const _prompts = [
  {'id': 'planning-1', 'category': 'Planning', 'question': 'What are your top 3 goals for today?', 'rationale': 'Primes goal-directed behavior'},
  {'id': 'planning-2', 'category': 'Planning', 'question': 'If interrupted, how will you still make progress?', 'rationale': 'Implementation intentions increase follow-through'},
  {'id': 'gratitude-1', 'category': 'Gratitude', 'question': 'List three things you\'re grateful for today.', 'rationale': 'Boosts positive affect and wellbeing'},
  {'id': 'gratitude-2', 'category': 'Gratitude', 'question': 'What went well yesterday?', 'rationale': 'Reinforces learning from small wins'},
  {'id': 'cbt-1', 'category': 'Emotional', 'question': 'What caused the strongest emotion today? Rate 0-10.', 'rationale': 'Helps identify automatic thoughts'},
  {'id': 'cbt-2', 'category': 'Emotional', 'question': 'List one alternative thought or interpretation.', 'rationale': 'Reappraisal decreases emotional intensity'},
  {'id': 'reflection-1', 'category': 'Reflection', 'question': 'What\'s one lesson you learned recently?', 'rationale': 'Promotes metacognition'},
  {'id': 'reflection-2', 'category': 'Reflection', 'question': 'What can you do in 24 hours to improve tomorrow?', 'rationale': 'Keeps journal-to-action tight'},
  {'id': 'expressive-1', 'category': 'Expressive', 'question': 'What honest thing would you say right now?', 'rationale': 'Uncensored writing has therapeutic benefits'},
  {'id': 'closure-1', 'category': 'Action', 'question': 'Pick 1 task and write its immediate next step.', 'rationale': 'Breaking tasks reduces friction'},
];

class EntryScreen extends StatefulWidget {
  const EntryScreen({super.key});

  @override
  State<EntryScreen> createState() => _EntryScreenState();
}

class _EntryScreenState extends State<EntryScreen> with AutomaticKeepAliveClientMixin {
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _gratitudeControllers = [TextEditingController(), TextEditingController(), TextEditingController()];

  int _mood = 5;
  int _moodIntensity = 5;
  final Set<String> _selectedPrompts = {};
  final Map<String, String> _promptAnswers = {};
  bool _isAnalyzing = false;
  bool _isSaving = false;
  String? _summary;
  List<Map<String, dynamic>> _extractedTasks = [];

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    for (var c in _gratitudeControllers) {
      c.dispose();
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
      final text = [
        _titleController.text,
        _contentController.text,
        ..._promptAnswers.entries.map((e) => '${e.key}: ${e.value}'),
      ].where((s) => s.isNotEmpty).join('\n\n');

      final llm = LLMService();
      final [tasks, summary] = await Future.wait([
        llm.extractTasks(text),
        llm.generateSummary(text),
      ]);

      setState(() {
        _extractedTasks = (tasks as List?)?.cast<Map<String, dynamic>>() ?? [];
        _summary = summary as String;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
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

    setState(() => _isSaving = true);
    debugPrint('[EntryScreen] ===== SAVING ENTRY =====');

    try {
      final auth = context.read<AuthProvider>();
      final entries = context.read<EntryProvider>();
      final tasks = context.read<TaskProvider>();

      debugPrint('[EntryScreen] User ID: ${auth.user?.id}');
      debugPrint('[EntryScreen] Content: ${_contentController.text}');
      debugPrint('[EntryScreen] Title: ${_titleController.text}');
      debugPrint('[EntryScreen] Mood: $_mood, Intensity: $_moodIntensity');
      debugPrint('[EntryScreen] Gratitude: ${_gratitudeControllers.map((c) => c.text).toList()}');
      debugPrint('[EntryScreen] Prompt answers: $_promptAnswers');
      debugPrint('[EntryScreen] Summary: $_summary');
      debugPrint('[EntryScreen] Extracted tasks: $_extractedTasks');

      // Build AI metadata if we have analysis results
      Map<String, dynamic>? aiMetadata;
      if (_summary != null || _extractedTasks.isNotEmpty) {
        aiMetadata = {
          if (_extractedTasks.isNotEmpty) 'extracted_tasks': _extractedTasks,
          if (_extractedTasks.isNotEmpty) 'task_count': _extractedTasks.length,
          'processed_at': DateTime.now().toIso8601String(),
        };
        debugPrint('[EntryScreen] AI Metadata: $aiMetadata');
      }

      // Create entry with compression (handled by provider)
      final createdEntry = await entries.createEntry(
        userId: auth.user!.id,
        content: _contentController.text,
        title: _titleController.text.isEmpty ? null : _titleController.text,
        summary: _summary,
        mood: _mood,
        moodIntensity: _moodIntensity,
        gratitude: _gratitudeControllers.map((c) => c.text).where((s) => s.isNotEmpty).toList(),
        promptAnswers: _promptAnswers,
        aiMetadata: aiMetadata,
        source: 'text', // Journal entry
      );
      
      debugPrint('[EntryScreen] Entry created: ${createdEntry.id}');

      // Save extracted tasks
      for (var t in _extractedTasks) {
        debugPrint('[EntryScreen] Saving task: ${t['title']}');
        await tasks.createTask(
          userId: auth.user!.id,
          title: t['title'] ?? '',
          description: t['description'] ?? '',
          priority: t['priority'] ?? 'medium',
        );
      }

      // Clear form
      _titleController.clear();
      _contentController.clear();
      for (var c in _gratitudeControllers) {
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
      debugPrint('[EntryScreen] ===== ENTRY SAVED =====');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_extractedTasks.isNotEmpty 
              ? 'Entry saved with ${_extractedTasks.length} tasks'
              : 'Entry saved'),
        ),
      );
    } catch (e, stackTrace) {
      debugPrint('[EntryScreen] ERROR saving entry: $e');
      debugPrint('[EntryScreen] Stack: $stackTrace');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error saving: $e')));
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Color _getPriorityColor(String p) {
    switch (p.toLowerCase()) {
      case 'high': return const Color(0xFFdc2626);
      case 'medium': return AppTheme.navy;
      default: return AppTheme.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    final textColor = isDark ? Colors.white : Colors.black;
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text('New Entry', style: Theme.of(context).textTheme.displaySmall),
          Text(
            DateTime.now().toString().split(' ')[0],
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 24),

          // Title
          TextField(
            controller: _titleController,
            style: TextStyle(color: textColor),
            decoration: InputDecoration(
              hintText: 'Title (optional)',
              hintStyle: TextStyle(color: isDark ? Colors.white54 : Colors.grey),
              prefixIcon: const Icon(Icons.title, size: 20),
            ),
          ),
          const SizedBox(height: 20),

          // Mood
          Text('MOOD', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 12),
          MoodSlider(
            initialMood: _mood,
            initialIntensity: _moodIntensity,
            onChanged: (m, i) => setState(() {
              _mood = m;
              _moodIntensity = i;
            }),
          ),
          const SizedBox(height: 24),

          // Content
          Text('YOUR THOUGHTS', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 12),
          TextField(
            controller: _contentController,
            maxLines: 6,
            style: TextStyle(color: textColor),
            decoration: InputDecoration(
              hintText: 'Write freely...',
              hintStyle: TextStyle(color: isDark ? Colors.white54 : Colors.grey),
            ),
          ),
          const SizedBox(height: 24),

          // Gratitude
          Text('GRATITUDE', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 12),
          for (var i = 0; i < 3; i++) ...[
            TextField(
              controller: _gratitudeControllers[i],
              style: TextStyle(color: textColor),
              decoration: InputDecoration(
                hintText: 'Thing ${i + 1}',
                hintStyle: TextStyle(color: isDark ? Colors.white54 : Colors.grey),
              ),
            ),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 16),

          // Prompts (collapsed by default)
          ExpansionTile(
            title: Text('GUIDED PROMPTS', style: Theme.of(context).textTheme.labelLarge),
            tilePadding: EdgeInsets.zero,
            childrenPadding: const EdgeInsets.only(top: 8),
            children: _prompts.map((p) => PromptCard(
              prompt: p,
              isSelected: _selectedPrompts.contains(p['id']),
              answer: _promptAnswers[p['id']],
              onToggle: (s) => setState(() {
                if (s) {
                  _selectedPrompts.add(p['id'] as String);
                } else {
                  _selectedPrompts.remove(p['id']);
                  _promptAnswers.remove(p['id']);
                }
              }),
              onAnswerChange: (a) => setState(() => _promptAnswers[p['id'] as String] = a),
            )).toList(),
          ),
          const SizedBox(height: 24),

          // AI Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isAnalyzing ? null : _analyzeWithAI,
              child: _isAnalyzing
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('EXTRACT TASKS'),
            ),
          ),
          const SizedBox(height: 16),

          // Summary
          if (_summary != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark 
                    ? AppTheme.darkCard 
                    : AppTheme.greyLight.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('SUMMARY', style: Theme.of(context).textTheme.labelLarge),
                  const SizedBox(height: 8),
                  Text(_summary!, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ),
            ),
          const SizedBox(height: 12),

          // Tasks
          if (_extractedTasks.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(
                  color: isDark ? AppTheme.navyLight : AppTheme.navy,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('EXTRACTED TASKS (${_extractedTasks.length})', style: Theme.of(context).textTheme.labelLarge),
                  const SizedBox(height: 12),
                  for (var t in _extractedTasks)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getPriorityColor(t['priority']).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              (t['priority'] ?? 'medium').toUpperCase(),
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _getPriorityColor(t['priority'])),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(t['title'] ?? '', style: Theme.of(context).textTheme.bodyMedium)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 24),

          // Save
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _saveEntry,
              child: _isSaving
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('SAVE ENTRY'),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
