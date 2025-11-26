import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/services/llm_service.dart';

class BrainstormScreen extends StatefulWidget {
  const BrainstormScreen({super.key});

  @override
  State<BrainstormScreen> createState() => _BrainstormScreenState();
}

class _BrainstormScreenState extends State<BrainstormScreen> {
  final _textController = TextEditingController();
  bool _isProcessing = false;
  String? _structuredOutput;
  List<Map<String, dynamic>> _extractedTasks = [];

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _processWithAI() async {
    if (_textController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write something first')),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _structuredOutput = null;
      _extractedTasks = [];
    });

    try {
      final llmService = LLMService();
      
      // Extract tasks and structure the brainstorm
      final [tasks, summary] = await Future.wait([
        llmService.extractTasks(_textController.text),
        llmService.generateSummary(_textController.text),
      ]);

      setState(() {
        _extractedTasks = (tasks as List?)?.cast<Map<String, dynamic>>() ?? [];
        _structuredOutput = summary as String;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _saveTask(Map<String, dynamic> taskData) async {
    try {
      final authProvider = context.read<AuthProvider>();
      final taskProvider = context.read<TaskProvider>();

      await taskProvider.createTask(
        userId: authProvider.user!.id,
        title: taskData['title'] ?? '',
        description: taskData['description'] ?? '',
        priority: taskData['priority'] ?? 'medium',
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✓ Task "${taskData['title']}" saved!')),
      );

      // Remove from local list
      setState(() {
        _extractedTasks.removeWhere((t) => t['title'] == taskData['title']);
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Future<void> _saveAllTasks() async {
    if (_extractedTasks.isEmpty) return;

    try {
      final authProvider = context.read<AuthProvider>();
      final taskProvider = context.read<TaskProvider>();

      for (var taskData in _extractedTasks) {
        await taskProvider.createTask(
          userId: authProvider.user!.id,
          title: taskData['title'] ?? '',
          description: taskData['description'] ?? '',
          priority: taskData['priority'] ?? 'medium',
        );
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✓ ${_extractedTasks.length} tasks saved!')),
      );

      setState(() {
        _extractedTasks.clear();
        _textController.clear();
        _structuredOutput = null;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  void _removeTask(int index) {
    setState(() {
      _extractedTasks.removeAt(index);
    });
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
              '🧠 BRAINSTORM',
              style: Theme.of(context).textTheme.displaySmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Dump your thoughts freely. AI will help you structure them into actionable tasks.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 24),

            // Input area
            TextField(
              controller: _textController,
              maxLines: 10,
              decoration: const InputDecoration(
                hintText: 'Start typing your thoughts, ideas, problems...\n\nExamples:\n• "I need to finish the project report by Friday, also call mom, and maybe start exercising again..."\n• "Feeling overwhelmed with work. Should delegate some tasks. Need to prioritize better..."',
                prefixIcon: Padding(
                  padding: EdgeInsets.only(bottom: 180),
                  child: Icon(Icons.lightbulb_outline),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Process Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isProcessing ? null : _processWithAI,
                child: _isProcessing
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                  Color(0xFF0a0e27)),
                            ),
                          ),
                          SizedBox(width: 12),
                          Text('Processing...'),
                        ],
                      )
                    : const Text('✨ STRUCTURE WITH AI'),
              ),
            ),
            const SizedBox(height: 24),

            // Summary
            if (_structuredOutput != null) ...[
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
                    Row(
                      children: [
                        const Icon(Icons.auto_awesome,
                            color: Color(0xFF00ffd5), size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'AI SUMMARY',
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _structuredOutput!,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Extracted Tasks
            if (_extractedTasks.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '✅ EXTRACTED TASKS (${_extractedTasks.length})',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  TextButton(
                    onPressed: _saveAllTasks,
                    child: const Text('SAVE ALL'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...List.generate(_extractedTasks.length, (index) {
                final task = _extractedTasks[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1a1f3a),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: const Color(0xFF2a2f4a),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _getPriorityColor(task['priority']),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              (task['priority'] ?? 'medium').toUpperCase(),
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0a0e27),
                              ),
                            ),
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.add_circle,
                                color: Color(0xFF00ffd5)),
                            onPressed: () => _saveTask(task),
                            tooltip: 'Save task',
                            iconSize: 20,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.delete,
                                color: Color(0xFFff3bff)),
                            onPressed: () => _removeTask(index),
                            tooltip: 'Remove',
                            iconSize: 20,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        task['title'] ?? '',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      if (task['description'] != null &&
                          task['description'].isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          task['description'],
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                );
              }),
            ],

            // Tips section
            if (_extractedTasks.isEmpty && _structuredOutput == null) ...[
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1a1f3a).withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '💡 Tips for effective brainstorming:',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 12),
                    _tipItem('Write without censoring - let ideas flow'),
                    _tipItem('Mix big goals with small tasks'),
                    _tipItem('Include deadlines if you have them'),
                    _tipItem('Mention people to involve or delegate to'),
                    _tipItem('Note any blockers or concerns'),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _tipItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(color: Color(0xFF00ffd5))),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  Color _getPriorityColor(String? priority) {
    switch (priority?.toLowerCase()) {
      case 'high':
        return const Color(0xFFff0033);
      case 'medium':
        return const Color(0xFF00ffd5);
      default:
        return const Color(0xFF7a7a7a);
    }
  }
}
