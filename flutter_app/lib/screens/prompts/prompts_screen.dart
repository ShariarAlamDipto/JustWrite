import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/theme_provider.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';
import 'package:justwrite_mobile/services/supabase_service.dart';

// Built-in prompts data (matching web app)
const _builtInPrompts = [
  // Gratitude
  {'id': 'g1', 'category': 'gratitude', 'text': "What are three things you're grateful for today?"},
  {'id': 'g2', 'category': 'gratitude', 'text': 'Who made a positive impact on your life recently?'},
  {'id': 'g3', 'category': 'gratitude', 'text': 'What simple pleasure did you enjoy today?'},
  {'id': 'g4', 'category': 'gratitude', 'text': 'What ability or skill are you thankful to have?'},
  {'id': 'g5', 'category': 'gratitude', 'text': 'What challenge are you grateful for because it helped you grow?'},
  
  // Reflection
  {'id': 'r1', 'category': 'reflection', 'text': 'What was the highlight of your day?'},
  {'id': 'r2', 'category': 'reflection', 'text': 'What would you do differently if you could redo today?'},
  {'id': 'r3', 'category': 'reflection', 'text': 'What lesson did today teach you?'},
  {'id': 'r4', 'category': 'reflection', 'text': 'What made you smile or laugh today?'},
  {'id': 'r5', 'category': 'reflection', 'text': 'What was the most challenging part of your day?'},
  
  // Emotional Check-in
  {'id': 'e1', 'category': 'emotional_checkin', 'text': 'How are you feeling right now, and why?'},
  {'id': 'e2', 'category': 'emotional_checkin', 'text': 'What emotion has been dominant today?'},
  {'id': 'e3', 'category': 'emotional_checkin', 'text': 'Is there something weighing on your mind?'},
  {'id': 'e4', 'category': 'emotional_checkin', 'text': 'What do you need to let go of today?'},
  
  // Morning Intentions
  {'id': 'm1', 'category': 'morning_intentions', 'text': 'What are your top 3 priorities for today?'},
  {'id': 'm2', 'category': 'morning_intentions', 'text': 'What would make today great?'},
  {'id': 'm3', 'category': 'morning_intentions', 'text': 'What energy do you want to bring into today?'},
  {'id': 'm4', 'category': 'morning_intentions', 'text': 'What is one thing you can do today to care for yourself?'},
  
  // Self Discovery
  {'id': 's1', 'category': 'self_discovery', 'text': 'What are you most proud of about yourself?'},
  {'id': 's2', 'category': 'self_discovery', 'text': 'What would your ideal day look like?'},
  {'id': 's3', 'category': 'self_discovery', 'text': 'What fear would you like to overcome?'},
  {'id': 's4', 'category': 'self_discovery', 'text': 'What does success mean to you?'},
  
  // Creative
  {'id': 'c1', 'category': 'creative', 'text': 'If you could have any superpower, what would it be and why?'},
  {'id': 'c2', 'category': 'creative', 'text': 'Write about a place that makes you feel at peace.'},
  {'id': 'c3', 'category': 'creative', 'text': 'Describe your life in 5 years.'},
  {'id': 'c4', 'category': 'creative', 'text': 'If you could tell your younger self one thing, what would it be?'},
];

const _categories = [
  {'id': 'gratitude', 'label': 'Gratitude', 'color': Color(0xFF38A169), 'icon': Icons.favorite},
  {'id': 'reflection', 'label': 'Reflection', 'color': Color(0xFF3182CE), 'icon': Icons.psychology},
  {'id': 'emotional_checkin', 'label': 'Emotional', 'color': Color(0xFFDD6B20), 'icon': Icons.mood},
  {'id': 'morning_intentions', 'label': 'Morning', 'color': Color(0xFF805AD5), 'icon': Icons.wb_sunny},
  {'id': 'self_discovery', 'label': 'Self Discovery', 'color': Color(0xFFD69E2E), 'icon': Icons.explore},
  {'id': 'creative', 'label': 'Creative', 'color': Color(0xFFE53E3E), 'icon': Icons.brush},
  {'id': 'custom', 'label': 'Custom', 'color': Color(0xFF00FFD5), 'icon': Icons.edit},
];

class PromptsScreen extends StatefulWidget {
  const PromptsScreen({super.key});

  @override
  State<PromptsScreen> createState() => _PromptsScreenState();
}

class _PromptsScreenState extends State<PromptsScreen> {
  String _selectedCategory = 'all';
  List<Map<String, dynamic>> _customPrompts = [];
  bool _isLoading = false;
  bool _showAddForm = false;
  final _promptController = TextEditingController();
  String _newPromptCategory = 'custom';

  @override
  void initState() {
    super.initState();
    _loadCustomPrompts();
  }

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _loadCustomPrompts() async {
    setState(() => _isLoading = true);
    try {
      final supabase = SupabaseService();
      final userId = supabase.supabase.auth.currentUser?.id;
      if (userId == null) return;
      
      final response = await supabase.supabase
          .from('custom_prompts')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);
      
      setState(() {
        _customPrompts = List<Map<String, dynamic>>.from(response);
      });
    } catch (e) {
      debugPrint('[PromptsScreen] Error loading custom prompts: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _createPrompt() async {
    if (_promptController.text.trim().isEmpty) return;
    
    try {
      final supabase = SupabaseService();
      final userId = supabase.supabase.auth.currentUser?.id;
      if (userId == null) return;
      
      final response = await supabase.supabase
          .from('custom_prompts')
          .insert({
            'user_id': userId,
            'text': _promptController.text.trim(),
            'category': _newPromptCategory,
          })
          .select()
          .single();
      
      setState(() {
        _customPrompts.insert(0, response);
        _promptController.clear();
        _showAddForm = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Prompt created')),
        );
      }
    } catch (e) {
      debugPrint('[PromptsScreen] Error creating prompt: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _deletePrompt(String id) async {
    try {
      final supabase = SupabaseService();
      await supabase.supabase
          .from('custom_prompts')
          .delete()
          .eq('id', id);
      
      setState(() {
        _customPrompts.removeWhere((p) => p['id'] == id);
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Prompt deleted')),
        );
      }
    } catch (e) {
      debugPrint('[PromptsScreen] Error deleting prompt: $e');
    }
  }

  void _usePrompt(String promptText) {
    // Navigate back to entry screen with the prompt
    Navigator.of(context).pop(promptText);
  }

  List<Map<String, dynamic>> _getFilteredPrompts() {
    final allPrompts = [
      ..._builtInPrompts.map((p) => {...p, 'isCustom': false}),
      ..._customPrompts.map((p) => {...p, 'isCustom': true}),
    ];
    
    if (_selectedCategory == 'all') return allPrompts;
    return allPrompts.where((p) => p['category'] == _selectedCategory).toList();
  }

  Color _getCategoryColor(String category) {
    final cat = _categories.firstWhere(
      (c) => c['id'] == category,
      orElse: () => _categories.last,
    );
    return cat['color'] as Color;
  }

  String _getCategoryLabel(String category) {
    final cat = _categories.firstWhere(
      (c) => c['id'] == category,
      orElse: () => _categories.last,
    );
    return cat['label'] as String;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    final prompts = _getFilteredPrompts();
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Prompts'),
        actions: [
          IconButton(
            icon: Icon(_showAddForm ? Icons.close : Icons.add),
            onPressed: () => setState(() => _showAddForm = !_showAddForm),
          ),
        ],
      ),
      body: Column(
        children: [
          // Category filter chips
          SizedBox(
            height: 50,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                _CategoryChip(
                  label: 'All',
                  isSelected: _selectedCategory == 'all',
                  onTap: () => setState(() => _selectedCategory = 'all'),
                  isDark: isDark,
                ),
                ..._categories.map((cat) => Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: _CategoryChip(
                    label: cat['label'] as String,
                    color: cat['color'] as Color,
                    isSelected: _selectedCategory == cat['id'],
                    onTap: () => setState(() => _selectedCategory = cat['id'] as String),
                    isDark: isDark,
                  ),
                )),
              ],
            ),
          ),

          // Add prompt form
          if (_showAddForm)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppTheme.darkCard : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Create New Prompt',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _promptController,
                    maxLines: 3,
                    maxLength: 500,
                    style: TextStyle(color: isDark ? Colors.white : Colors.black),
                    decoration: InputDecoration(
                      hintText: 'What question would you like to reflect on?',
                      hintStyle: TextStyle(color: isDark ? Colors.white54 : Colors.grey),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _newPromptCategory,
                          dropdownColor: isDark ? AppTheme.darkCard : Colors.white,
                          style: TextStyle(color: isDark ? Colors.white : Colors.black),
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            filled: true,
                            fillColor: isDark ? AppTheme.darkSurface : AppTheme.greyLight,
                          ),
                          items: _categories.map((cat) => DropdownMenuItem(
                            value: cat['id'] as String,
                            child: Text(cat['label'] as String),
                          )).toList(),
                          onChanged: (value) => setState(() => _newPromptCategory = value ?? 'custom'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: _createPrompt,
                        child: const Text('Add'),
                      ),
                    ],
                  ),
                ],
              ),
            ),

          // Loading indicator
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(strokeWidth: 2),
            ),

          // Prompts list
          Expanded(
            child: prompts.isEmpty
                ? Center(
                    child: Text(
                      'No prompts in this category',
                      style: TextStyle(color: isDark ? Colors.white54 : Colors.grey),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: prompts.length,
                    itemBuilder: (context, index) {
                      final prompt = prompts[index];
                      final isCustom = prompt['isCustom'] == true;
                      
                      return _PromptCard(
                        text: prompt['text'] as String,
                        category: prompt['category'] as String,
                        categoryLabel: _getCategoryLabel(prompt['category'] as String),
                        categoryColor: _getCategoryColor(prompt['category'] as String),
                        isCustom: isCustom,
                        isDark: isDark,
                        onUse: () => _usePrompt(prompt['text'] as String),
                        onDelete: isCustom ? () => _deletePrompt(prompt['id'] as String) : null,
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final Color? color;
  final bool isSelected;
  final VoidCallback onTap;
  final bool isDark;

  const _CategoryChip({
    required this.label,
    this.color,
    required this.isSelected,
    required this.onTap,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? (color ?? AppTheme.navy)
              : (isDark ? AppTheme.darkCard : AppTheme.greyLight),
          borderRadius: BorderRadius.circular(16),
          border: isSelected && color != null
              ? Border.all(color: color!, width: 2)
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
          ),
        ),
      ),
    );
  }
}

class _PromptCard extends StatelessWidget {
  final String text;
  final String category;
  final String categoryLabel;
  final Color categoryColor;
  final bool isCustom;
  final bool isDark;
  final VoidCallback onUse;
  final VoidCallback? onDelete;

  const _PromptCard({
    required this.text,
    required this.category,
    required this.categoryLabel,
    required this.categoryColor,
    required this.isCustom,
    required this.isDark,
    required this.onUse,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? AppTheme.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: categoryColor.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        categoryLabel,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: categoryColor,
                        ),
                      ),
                    ),
                    if (isCustom) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00FFD5).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'Custom',
                          style: TextStyle(
                            fontSize: 10,
                            color: Color(0xFF00FFD5),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.4,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(
                  color: isDark ? AppTheme.navyLight : AppTheme.greyLight,
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (onDelete != null)
                  TextButton.icon(
                    onPressed: onDelete,
                    icon: Icon(
                      Icons.delete_outline,
                      size: 18,
                      color: isDark ? Colors.white54 : Colors.grey,
                    ),
                    label: Text(
                      'Delete',
                      style: TextStyle(
                        color: isDark ? Colors.white54 : Colors.grey,
                      ),
                    ),
                  ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: onUse,
                  icon: const Icon(Icons.edit, size: 16),
                  label: const Text('Use'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
