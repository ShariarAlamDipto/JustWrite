import 'package:flutter/material.dart';

class PromptCard extends StatefulWidget {
  final Map<String, dynamic> prompt;
  final bool isSelected;
  final String? answer;
  final Function(bool) onToggle;
  final Function(String) onAnswerChange;

  const PromptCard({
    Key? key,
    required this.prompt,
    required this.isSelected,
    this.answer,
    required this.onToggle,
    required this.onAnswerChange,
  }) : super(key: key);

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
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with checkbox
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Checkbox(
                  value: widget.isSelected,
                  onChanged: (value) {
                    widget.onToggle(value ?? false);
                  },
                  fillColor: MaterialStateProperty.all(const Color(0xFF00ffd5)),
                  checkColor: const Color(0xFF0a0e27),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            widget.prompt['icon'] ?? '✨',
                            style: const TextStyle(fontSize: 18),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              widget.prompt['category'] ?? '',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: const Color(0xFF00ffd5),
                                  ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.prompt['question'] ?? '',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.info_outline),
                  onPressed: () {
                    setState(() => _showRationale = !_showRationale);
                  },
                  iconSize: 18,
                  constraints: const BoxConstraints(),
                  padding: const EdgeInsets.all(4),
                ),
              ],
            ),

            // Rationale
            if (_showRationale)
              Padding(
                padding: const EdgeInsets.only(top: 8, left: 40),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1a1f3a),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    widget.prompt['rationale'] ?? '',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(fontStyle: FontStyle.italic),
                  ),
                ),
              ),

            // Answer TextField
            if (widget.isSelected)
              Padding(
                padding: const EdgeInsets.only(top: 12, left: 40),
                child: TextField(
                  controller: _answerController,
                  maxLines: 3,
                  onChanged: (value) {
                    widget.onAnswerChange(value);
                  },
                  decoration: InputDecoration(
                    hintText: 'Your answer...',
                    isDense: true,
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  ),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
