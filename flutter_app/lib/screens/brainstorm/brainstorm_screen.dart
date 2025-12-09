import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/providers/theme_provider.dart';
import 'package:justwrite_mobile/services/llm_service.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';
import 'package:justwrite_mobile/models/entry.dart';

class BrainstormScreen extends StatefulWidget {
  const BrainstormScreen({super.key});

  @override
  State<BrainstormScreen> createState() => _BrainstormScreenState();
}

class _BrainstormScreenState extends State<BrainstormScreen> with AutomaticKeepAliveClientMixin {
  final _controller = TextEditingController();
  bool _isProcessing = false;
  bool _isSaving = false;
  bool _isSavingIdea = false;
  String? _summary;
  List<Map<String, dynamic>> _tasks = [];
  String? _originalContent; // Store original content for saving

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Save the current text directly as an Idea without AI processing
  Future<void> _saveAsIdea() async {
    if (_controller.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write something first')),
      );
      return;
    }

    setState(() => _isSavingIdea = true);

    try {
      final auth = context.read<AuthProvider>();
      final entryProvider = context.read<EntryProvider>();
      
      debugPrint('[Brainstorm] Saving idea...');
      debugPrint('[Brainstorm] User ID: ${auth.user?.id}');
      debugPrint('[Brainstorm] Content: ${_controller.text}');
      
      // Save directly as brainstorm entry (Idea) - minimal fields only
      await entryProvider.createEntry(
        userId: auth.user!.id,
        content: _controller.text,
        source: EntrySource.brainstorm,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Idea saved to Journal')),
      );
      
      // Clear form
      setState(() {
        _controller.clear();
        _summary = null;
        _tasks.clear();
        _originalContent = null;
      });
    } catch (e) {
      if (!mounted) return;
      debugPrint('[Brainstorm] Error saving idea: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString().split(':').last.trim()}')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSavingIdea = false);
      }
    }
  }

  Future<void> _process() async {
    if (_controller.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write something first')),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _summary = null;
      _tasks = [];
      _originalContent = _controller.text; // Store for later saving
    });

    try {
      final llm = LLMService();
      final [tasks, summary] = await Future.wait([
        llm.extractTasks(_controller.text),
        llm.generateSummary(_controller.text),
      ]);

      setState(() {
        _tasks = (tasks as List?)?.cast<Map<String, dynamic>>() ?? [];
        _summary = summary as String;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _saveTask(Map<String, dynamic> t) async {
    try {
      final auth = context.read<AuthProvider>();
      final tasks = context.read<TaskProvider>();

      await tasks.createTask(
        userId: auth.user!.id,
        title: t['title'] ?? '',
        description: t['description'] ?? '',
        priority: t['priority'] ?? 'medium',
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Task "${t['title']}" saved')),
      );
      setState(() => _tasks.removeWhere((x) => x['title'] == t['title']));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error saving task: $e')));
    }
  }

  Future<void> _saveAll() async {
    if (_tasks.isEmpty) return;

    // Capture values before async operations
    final auth = context.read<AuthProvider>();
    final taskProvider = context.read<TaskProvider>();
    final entryProvider = context.read<EntryProvider>();
    final userId = auth.user?.id;
    
    if (userId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in first')),
      );
      return;
    }

    setState(() => _isSaving = true);
    
    // Copy tasks to avoid modification during iteration
    final tasksToSave = List<Map<String, dynamic>>.from(_tasks);
    final contentToSave = _originalContent ?? _controller.text;
    final summaryToSave = _summary;
    final taskCount = tasksToSave.length;

    try {
      // Save all tasks sequentially to avoid race conditions
      for (final t in tasksToSave) {
        if (!mounted) return;
        await taskProvider.createTask(
          userId: userId,
          title: t['title']?.toString() ?? '',
          description: t['description']?.toString() ?? '',
          priority: t['priority']?.toString() ?? 'medium',
        );
      }
      
      // Save the brainstorm session as a journal entry for future reference
      if (contentToSave.isNotEmpty && summaryToSave != null && mounted) {
        await entryProvider.createBrainstormEntry(
          userId: userId,
          content: contentToSave,
          summary: summaryToSave,
          extractedTasks: tasksToSave,
        );
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$taskCount tasks saved')),
      );
      
      // Clear form only after successful save
      setState(() {
        _tasks.clear();
        _controller.clear();
        _summary = null;
        _originalContent = null;
      });
    } catch (e) {
      if (!mounted) return;
      debugPrint('[Brainstorm] Error saving: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString().split(':').last.trim()}')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Color _getPriorityColor(String? p) {
    switch (p?.toLowerCase()) {
      case 'high': return const Color(0xFFdc2626);
      case 'medium': return AppTheme.navy;
      default: return AppTheme.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Brainstorm', style: Theme.of(context).textTheme.displaySmall),
          const SizedBox(height: 4),
          Text(
            'Write freely. We\'ll help organize your thoughts.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 24),

          // Input
          TextField(
            controller: _controller,
            maxLines: 8,
            style: TextStyle(color: isDark ? Colors.white : Colors.black),
            decoration: InputDecoration(
              hintText: 'Start typing your ideas, problems, goals...',
              hintStyle: TextStyle(color: isDark ? Colors.white54 : Colors.grey),
            ),
          ),
          const SizedBox(height: 16),

          // Process button - turn thoughts into tasks
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isProcessing ? null : _process,
              child: _isProcessing
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('EXTRACT TASKS'),
            ),
          ),
          const SizedBox(height: 12),
          
          // Save as Idea button - save without processing
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _isSavingIdea ? null : _saveAsIdea,
              style: OutlinedButton.styleFrom(
                side: BorderSide(
                  color: isDark ? Colors.white : AppTheme.navy,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              ),
              child: _isSavingIdea
                  ? SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2, 
                        color: isDark ? Colors.white : AppTheme.navy,
                      ),
                    )
                  : Text(
                      'SAVE AS IDEA',
                      style: TextStyle(
                        color: isDark ? Colors.white : AppTheme.navy,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 24),

          // Summary
          if (_summary != null) ...[
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
                  SelectableText(_summary!, style: Theme.of(context).textTheme.bodyMedium),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Tasks
          if (_tasks.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('TASKS (${_tasks.length})', style: Theme.of(context).textTheme.labelLarge),
                TextButton(
                  onPressed: _isSaving ? null : _saveAll,
                  child: _isSaving 
                      ? const SizedBox(
                          height: 14,
                          width: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          'SAVE ALL',
                          style: TextStyle(color: isDark ? Colors.white : AppTheme.navy),
                        ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            for (var i = 0; i < _tasks.length; i++)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.darkCard : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? AppTheme.greyDark : AppTheme.greyLight,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _getPriorityColor(_tasks[i]['priority']).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  (_tasks[i]['priority'] ?? 'medium').toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: _getPriorityColor(_tasks[i]['priority']),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _tasks[i]['title'] ?? '',
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w500),
                          ),
                          if (_tasks[i]['description']?.isNotEmpty ?? false) ...[
                            const SizedBox(height: 4),
                            Text(
                              _tasks[i]['description'],
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(
                        Icons.add_circle,
                        color: isDark ? Colors.white : AppTheme.navy,
                      ),
                      onPressed: () => _saveTask(_tasks[i]),
                      tooltip: 'Save',
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppTheme.grey),
                      onPressed: () => setState(() => _tasks.removeAt(i)),
                      tooltip: 'Remove',
                    ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}
