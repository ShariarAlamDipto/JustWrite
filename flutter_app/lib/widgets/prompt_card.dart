import 'package:flutter/material.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';

class PromptCard extends StatefulWidget {
  final Map<String, dynamic> prompt;
  final bool isSelected;
  final String? answer;
  final Function(bool) onToggle;
  final Function(String) onAnswerChange;

  const PromptCard({
    super.key,
    required this.prompt,
    required this.isSelected,
    this.answer,
    required this.onToggle,
    required this.onAnswerChange,
  });

  @override
  State<PromptCard> createState() => _PromptCardState();
}

class _PromptCardState extends State<PromptCard> {
  late TextEditingController _answerController;
  bool _showRationale = false;

  @override
  void initState() {
    super.initState();
    _answerController = TextEditingController(text: widget.answer ?? '');
  }

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: widget.isSelected ? AppTheme.navy.withValues(alpha: 0.05) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: widget.isSelected ? AppTheme.navy : AppTheme.greyLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          InkWell(
            onTap: () => widget.onToggle(!widget.isSelected),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: widget.isSelected ? AppTheme.navy : Colors.transparent,
                      border: Border.all(
                        color: widget.isSelected ? AppTheme.navy : AppTheme.grey,
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: widget.isSelected
                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.prompt['category'] ?? '',
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          widget.prompt['question'] ?? '',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      _showRationale ? Icons.info : Icons.info_outline,
                      size: 18,
                      color: AppTheme.grey,
                    ),
                    onPressed: () => setState(() => _showRationale = !_showRationale),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
          ),

          // Rationale
          if (_showRationale)
            Container(
              margin: const EdgeInsets.fromLTRB(48, 0, 12, 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.greyLight.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                widget.prompt['rationale'] ?? '',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),

          // Answer
          if (widget.isSelected)
            Padding(
              padding: const EdgeInsets.fromLTRB(48, 0, 12, 12),
              child: TextField(
                controller: _answerController,
                maxLines: 3,
                onChanged: widget.onAnswerChange,
                decoration: const InputDecoration(
                  hintText: 'Your answer...',
                  isDense: true,
                  contentPadding: EdgeInsets.all(12),
                ),
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
        ],
      ),
    );
  }
}
