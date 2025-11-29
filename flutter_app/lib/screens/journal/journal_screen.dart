import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/entry.dart';
import '../../providers/auth_provider.dart';
import '../../providers/entry_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/llm_service.dart';
import '../../theme/app_theme.dart';
import '../entry/entry_screen.dart';

class JournalScreen extends StatefulWidget {
  const JournalScreen({super.key});

  @override
  State<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends State<JournalScreen> {
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EntryProvider>().loadEntries();
    });
  }

  List<Entry> _filterEntries(List<Entry> entries) {
    switch (_selectedFilter) {
      case 'journal':
        return entries.where((e) => e.source == 'text').toList();
      case 'ideas':
        return entries.where((e) => e.source == 'brainstorm').toList();
      case 'voice':
        return entries.where((e) => e.source == 'voice').toList();
      default:
        return entries;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Journal'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<EntryProvider>().loadEntries(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _FilterChip(
                  label: 'All',
                  isSelected: _selectedFilter == 'all',
                  onSelected: () => setState(() => _selectedFilter = 'all'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Journal',
                  isSelected: _selectedFilter == 'journal',
                  onSelected: () => setState(() => _selectedFilter = 'journal'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Ideas',
                  isSelected: _selectedFilter == 'ideas',
                  onSelected: () => setState(() => _selectedFilter = 'ideas'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Voice',
                  isSelected: _selectedFilter == 'voice',
                  onSelected: () => setState(() => _selectedFilter = 'voice'),
                ),
              ],
            ),
          ),
          // Entries list
          Expanded(
            child: Consumer<EntryProvider>(
              builder: (context, provider, child) {
                if (provider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (provider.error != null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 48,
                          color: isDark ? Colors.white70 : Colors.grey,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Error loading entries',
                          style: TextStyle(
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: () => provider.loadEntries(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final filteredEntries = _filterEntries(provider.entries);

                if (filteredEntries.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.book_outlined,
                          size: 64,
                          color: isDark ? Colors.white54 : Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _selectedFilter == 'all'
                              ? 'No entries yet'
                              : 'No $_selectedFilter entries',
                          style: TextStyle(
                            fontSize: 18,
                            color: isDark ? Colors.white70 : Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Start writing to create your first entry',
                          style: TextStyle(
                            color: isDark ? Colors.white54 : Colors.grey[500],
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => provider.loadEntries(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredEntries.length,
                    itemBuilder: (context, index) {
                      final entry = filteredEntries[index];
                      return _EntryCard(
                        entry: entry,
                        onTap: () => _openEntry(entry),
                        onDelete: () => _deleteEntry(entry),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _createNewEntry(),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _openEntry(Entry entry) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppTheme.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _EntryDetailSheet(entry: entry, isDark: isDark),
    );
  }

  void _createNewEntry() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const EntryScreen(),
      ),
    );
  }

  Future<void> _deleteEntry(Entry entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Entry'),
        content: const Text('Are you sure you want to delete this entry?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await context.read<EntryProvider>().deleteEntry(entry.id);
    }
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onSelected;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return GestureDetector(
      onTap: onSelected,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.navy
              : (isDark ? Colors.grey[800] : Colors.grey[200]),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? Colors.white
                : (isDark ? Colors.white : Colors.black87),
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _EntryCard extends StatelessWidget {
  final Entry entry;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _EntryCard({
    required this.entry,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Entry type badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getSourceColor(entry.source).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _getSourceIcon(entry.source),
                          size: 14,
                          color: isDark ? Colors.white : _getSourceColor(entry.source),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _getSourceLabel(entry.source),
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.white : _getSourceColor(entry.source),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatDate(entry.createdAt),
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : Colors.grey[600],
                    ),
                  ),
                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_vert,
                      color: isDark ? Colors.white70 : Colors.grey[600],
                    ),
                    onSelected: (value) {
                      if (value == 'delete') onDelete();
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Delete'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (entry.title != null && entry.title!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  entry.title!,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 8),
              Text(
                entry.content,
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? Colors.white70 : Colors.grey[700],
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              // Only show mood for journal entries (not brainstorm/ideas)
              if (entry.source != 'brainstorm') ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      _getMoodIcon(entry.mood),
                      size: 18,
                      color: isDark ? Colors.white70 : _getMoodColor(entry.mood),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Mood: ${entry.mood}/10',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white70 : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _getSourceColor(String? source) {
    switch (source) {
      case 'brainstorm':
        return Colors.purple;
      case 'voice':
        return Colors.blue;
      default:
        return AppTheme.navy;
    }
  }

  IconData _getSourceIcon(String? source) {
    switch (source) {
      case 'brainstorm':
        return Icons.lightbulb;
      case 'voice':
        return Icons.mic;
      default:
        return Icons.edit;
    }
  }

  String _getSourceLabel(String? source) {
    switch (source) {
      case 'brainstorm':
        return 'Idea';
      case 'voice':
        return 'Voice';
      default:
        return 'Journal';
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  IconData _getMoodIcon(int mood) {
    if (mood <= 3) return Icons.sentiment_very_dissatisfied;
    if (mood <= 5) return Icons.sentiment_neutral;
    if (mood <= 7) return Icons.sentiment_satisfied;
    return Icons.sentiment_very_satisfied;
  }

  Color _getMoodColor(int mood) {
    if (mood <= 3) return Colors.red;
    if (mood <= 5) return Colors.orange;
    if (mood <= 7) return Colors.lightGreen;
    return Colors.green;
  }
}

/// Entry detail sheet with options to copy, re-analyze with AI, edit
class _EntryDetailSheet extends StatefulWidget {
  final Entry entry;
  final bool isDark;

  const _EntryDetailSheet({required this.entry, required this.isDark});

  @override
  State<_EntryDetailSheet> createState() => _EntryDetailSheetState();
}

class _EntryDetailSheetState extends State<_EntryDetailSheet> {
  bool _isAnalyzing = false;
  String? _summary;
  List<Map<String, dynamic>> _extractedTasks = [];
  bool _isEditing = false;
  late TextEditingController _editController;

  @override
  void initState() {
    super.initState();
    _editController = TextEditingController(text: widget.entry.content);
    // If entry has existing AI metadata, show it
    if (widget.entry.aiMetadata != null) {
      final tasks = widget.entry.aiMetadata!['extracted_tasks'];
      if (tasks != null && tasks is List) {
        _extractedTasks = List<Map<String, dynamic>>.from(tasks);
      }
    }
    if (widget.entry.summary != null) {
      _summary = widget.entry.summary;
    }
  }

  @override
  void dispose() {
    _editController.dispose();
    super.dispose();
  }

  Future<void> _analyzeWithAI() async {
    setState(() => _isAnalyzing = true);

    try {
      final llm = LLMService();
      final [tasks, summary] = await Future.wait([
        llm.extractTasks(widget.entry.content),
        llm.generateSummary(widget.entry.content),
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

  Future<void> _saveTask(Map<String, dynamic> task) async {
    try {
      final auth = context.read<AuthProvider>();
      final taskProvider = context.read<TaskProvider>();

      await taskProvider.createTask(
        userId: auth.user!.id,
        title: task['title'] ?? '',
        description: task['description'] ?? '',
        priority: task['priority'] ?? 'medium',
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Task "${task['title']}" saved')),
      );
      setState(() => _extractedTasks.removeWhere((t) => t['title'] == task['title']));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Future<void> _updateEntry() async {
    try {
      final updatedEntry = widget.entry.copyWith(
        content: _editController.text,
        updatedAt: DateTime.now(),
      );
      await context.read<EntryProvider>().updateEntry(updatedEntry);
      if (!mounted) return;
      setState(() => _isEditing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Entry updated')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  void _copyToClipboard() {
    Clipboard.setData(ClipboardData(text: widget.entry.content));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Copied to clipboard')),
    );
  }

  Color _getPriorityColor(String? priority) {
    switch (priority?.toLowerCase()) {
      case 'high':
        return const Color(0xFFdc2626);
      case 'medium':
        return AppTheme.navy;
      default:
        return AppTheme.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final isIdea = widget.entry.source == 'brainstorm';

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => SingleChildScrollView(
        controller: scrollController,
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.greyDark : AppTheme.greyLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            
            // Header with type badge
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: isIdea ? Colors.purple.withValues(alpha: 0.2) : AppTheme.navy.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isIdea ? Icons.lightbulb : Icons.edit,
                        size: 16,
                        color: isDark ? Colors.white : (isIdea ? Colors.purple : AppTheme.navy),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isIdea ? 'Idea' : 'Journal Entry',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : (isIdea ? Colors.purple : AppTheme.navy),
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Text(
                  _formatDate(widget.entry.createdAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white70 : AppTheme.grey,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Title
            if (widget.entry.title != null && widget.entry.title!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  widget.entry.title!,
                  style: Theme.of(context).textTheme.displaySmall,
                ),
              ),
            
            // Content (editable or static)
            if (_isEditing)
              TextField(
                controller: _editController,
                maxLines: null,
                minLines: 5,
                style: TextStyle(color: isDark ? Colors.white : Colors.black),
                decoration: InputDecoration(
                  hintText: 'Edit your entry...',
                  hintStyle: TextStyle(color: isDark ? Colors.white54 : Colors.grey),
                  filled: true,
                  fillColor: isDark ? AppTheme.darkCard : AppTheme.greyLight.withValues(alpha: 0.3),
                ),
              )
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.darkCard : AppTheme.greyLight.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  widget.entry.content,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
            const SizedBox(height: 16),
            
            // Action buttons
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (_isEditing)
                  ElevatedButton.icon(
                    onPressed: _updateEntry,
                    icon: const Icon(Icons.save, size: 18),
                    label: const Text('SAVE'),
                  )
                else
                  OutlinedButton.icon(
                    onPressed: () => setState(() => _isEditing = true),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: isDark ? Colors.white : AppTheme.navy),
                    ),
                    icon: Icon(Icons.edit, size: 18, color: isDark ? Colors.white : AppTheme.navy),
                    label: Text('EDIT', style: TextStyle(color: isDark ? Colors.white : AppTheme.navy)),
                  ),
                if (_isEditing)
                  TextButton(
                    onPressed: () {
                      _editController.text = widget.entry.content;
                      setState(() => _isEditing = false);
                    },
                    child: const Text('CANCEL'),
                  )
                else ...[
                  OutlinedButton.icon(
                    onPressed: _copyToClipboard,
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: isDark ? Colors.white : AppTheme.navy),
                    ),
                    icon: Icon(Icons.copy, size: 18, color: isDark ? Colors.white : AppTheme.navy),
                    label: Text('COPY', style: TextStyle(color: isDark ? Colors.white : AppTheme.navy)),
                  ),
                  ElevatedButton.icon(
                    onPressed: _isAnalyzing ? null : _analyzeWithAI,
                    icon: _isAnalyzing
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.auto_awesome, size: 18),
                    label: Text(_isAnalyzing ? 'ANALYZING...' : 'AI ANALYZE'),
                  ),
                ],
              ],
            ),
            
            // Summary from AI
            if (_summary != null) ...[
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppTheme.darkCard : AppTheme.greyLight.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDark ? AppTheme.navyLight : AppTheme.navy,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.auto_awesome, size: 16, color: isDark ? Colors.white : AppTheme.navy),
                        const SizedBox(width: 8),
                        Text('AI SUMMARY', style: Theme.of(context).textTheme.labelLarge),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(_summary!, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
            ],
            
            // Extracted tasks
            if (_extractedTasks.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text('EXTRACTED TASKS (${_extractedTasks.length})', style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              for (var task in _extractedTasks)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? AppTheme.darkCard : Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isDark ? AppTheme.greyDark : AppTheme.greyLight),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _getPriorityColor(task['priority']).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          (task['priority'] ?? 'medium').toString().toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: _getPriorityColor(task['priority']),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              task['title'] ?? '',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                            ),
                            if (task['description']?.isNotEmpty ?? false) ...[
                              const SizedBox(height: 2),
                              Text(
                                task['description'],
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.add_circle, color: isDark ? Colors.white : AppTheme.navy),
                        onPressed: () => _saveTask(task),
                        tooltip: 'Save task',
                      ),
                    ],
                  ),
                ),
            ],
            
            // Mood display (only for journal entries)
            if (!isIdea) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(
                    _getMoodIcon(widget.entry.mood),
                    color: isDark ? Colors.white70 : _getMoodColor(widget.entry.mood),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Mood: ${widget.entry.mood}/10',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ],
            
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    return '${date.day}/${date.month}/${date.year}';
  }

  IconData _getMoodIcon(int mood) {
    if (mood <= 3) return Icons.sentiment_very_dissatisfied;
    if (mood <= 5) return Icons.sentiment_neutral;
    if (mood <= 7) return Icons.sentiment_satisfied;
    return Icons.sentiment_very_satisfied;
  }

  Color _getMoodColor(int mood) {
    if (mood <= 3) return Colors.red;
    if (mood <= 5) return Colors.orange;
    if (mood <= 7) return Colors.lightGreen;
    return Colors.green;
  }
}
