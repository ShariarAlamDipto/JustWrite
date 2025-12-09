import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/theme_provider.dart';
import 'package:justwrite_mobile/widgets/mood_slider.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';
import 'dart:math';

// Full prompt pool for "Surprise Me" randomization
const _allPrompts = [
  {'id': 'planning-1', 'question': 'What are your top 3 goals for today?'},
  {'id': 'planning-2', 'question': 'If interrupted, how will you still make progress?'},
  {'id': 'gratitude-1', 'question': 'List three things you\'re grateful for today.'},
  {'id': 'gratitude-2', 'question': 'What went well yesterday?'},
  {'id': 'cbt-1', 'question': 'What caused the strongest emotion today? Rate 0-10.'},
  {'id': 'cbt-2', 'question': 'List one alternative thought or interpretation.'},
  {'id': 'reflection-1', 'question': 'What\'s one lesson you learned recently?'},
  {'id': 'reflection-2', 'question': 'What can you do in 24 hours to improve tomorrow?'},
  {'id': 'expressive-1', 'question': 'What honest thing would you say right now?'},
  {'id': 'closure-1', 'question': 'Pick 1 task and write its immediate next step.'},
  {'id': 'morning-1', 'question': 'How do you want to feel at the end of today?'},
  {'id': 'morning-2', 'question': 'What\'s one thing you\'re looking forward to today?'},
  {'id': 'evening-1', 'question': 'What was the highlight of your day?'},
  {'id': 'evening-2', 'question': 'What would you do differently tomorrow?'},
  {'id': 'self-1', 'question': 'What are you most proud of right now?'},
  {'id': 'self-2', 'question': 'What\'s a challenge you\'re currently facing?'},
];

/// Get 3 random prompts from the pool
List<Map<String, String>> _getRandomPrompts() {
  final random = Random();
  final shuffled = List<Map<String, dynamic>>.from(_allPrompts)..shuffle(random);
  return shuffled.take(3).map((p) => {
    'id': p['id'] as String,
    'question': p['question'] as String,
  }).toList();
}

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
  
  // Random prompts (3 prompts like the web version)
  late List<Map<String, String>> _dailyPrompts;
  final List<TextEditingController> _promptControllers = [
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
  ];
  
  bool _isSaving = false;

  @override
  bool get wantKeepAlive => true;
  
  @override
  void initState() {
    super.initState();
    _dailyPrompts = _getRandomPrompts();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    for (var c in _gratitudeControllers) {
      c.dispose();
    }
    for (var c in _promptControllers) {
      c.dispose();
    }
    super.dispose();
  }
  
  void _shufflePrompts() {
    setState(() {
      _dailyPrompts = _getRandomPrompts();
      for (var c in _promptControllers) {
        c.clear();
      }
    });
  }

  Future<void> _saveEntry() async {
    if (_contentController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write something')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final auth = context.read<AuthProvider>();
      final entries = context.read<EntryProvider>();

      // Combine free text with prompt answers (like web version)
      final promptAnswersText = _promptControllers.asMap().entries
          .where((e) => e.value.text.trim().isNotEmpty)
          .map((e) => '**${_dailyPrompts[e.key]['question']}**\n${e.value.text}')
          .toList();
      
      final fullContent = [
        _contentController.text.trim(),
        ...promptAnswersText,
      ].where((s) => s.isNotEmpty).join('\n\n');
      
      // Build prompt answers map for storage
      final promptAnswers = <String, String>{};
      for (var i = 0; i < _dailyPrompts.length; i++) {
        if (_promptControllers[i].text.trim().isNotEmpty) {
          promptAnswers[_dailyPrompts[i]['question']!] = _promptControllers[i].text;
        }
      }

      // Create entry (encrypted by provider for Journal entries)
      await entries.createEntry(
        userId: auth.user!.id,
        content: fullContent,
        title: _titleController.text.isEmpty ? null : _titleController.text,
        mood: _mood,
        moodIntensity: _moodIntensity,
        gratitude: _gratitudeControllers.map((c) => c.text).where((s) => s.isNotEmpty).toList(),
        promptAnswers: promptAnswers,
        source: 'text', // Journal entry
      );

      // Clear form
      _titleController.clear();
      _contentController.clear();
      for (var c in _gratitudeControllers) {
        c.clear();
      }
      for (var c in _promptControllers) {
        c.clear();
      }
      setState(() {
        _mood = 5;
        _moodIntensity = 5;
        _dailyPrompts = _getRandomPrompts(); // New prompts after save
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Entry saved')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error saving: $e')));
    } finally {
      setState(() => _isSaving = false);
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

          // Daily Prompts (3 random prompts + Surprise Me button)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('TODAY\'S PROMPTS', style: Theme.of(context).textTheme.labelLarge),
              TextButton.icon(
                onPressed: _shufflePrompts,
                icon: const Icon(Icons.shuffle, size: 16),
                label: const Text('Surprise Me'),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.navy,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < _dailyPrompts.length; i++) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.darkCard : Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _dailyPrompts[i]['question']!,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isDark ? Colors.white70 : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _promptControllers[i],
                    maxLines: 2,
                    style: TextStyle(color: textColor, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Your answer...',
                      hintStyle: TextStyle(color: isDark ? Colors.white38 : Colors.grey),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: isDark ? AppTheme.navyLight : AppTheme.greyLight),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: isDark ? AppTheme.navyLight : AppTheme.greyLight),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 8),

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
