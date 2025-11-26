import 'package:flutter/material.dart';

class MoodSlider extends StatefulWidget {
  final int initialMood;
  final int initialIntensity;
  final Function(int mood, int intensity) onChanged;

  const MoodSlider({
    super.key,
    this.initialMood = 5,
    this.initialIntensity = 5,
    required this.onChanged,
  });

  @override
  State<MoodSlider> createState() => _MoodSliderState();
}

class _MoodSliderState extends State<MoodSlider> {
  late int selectedMood;
  late int selectedIntensity;

  final moodEmojis = ['😢', '😞', '😟', '😕', '😐', '🙂', '😊', '😄', '😃', '🌟'];

  @override
  void initState() {
    super.initState();
    selectedMood = widget.initialMood;
    selectedIntensity = widget.initialIntensity;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Emoji Buttons
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: List.generate(10, (index) {
            final isSelected = selectedMood == index;
            return GestureDetector(
              onTap: () {
                setState(() => selectedMood = index);
                widget.onChanged(index, selectedIntensity);
              },
              child: Container(
                decoration: BoxDecoration(
                  color: isSelected
                      ? const Color(0xFF00ffd5)
                      : const Color(0xFF1a1f3a),
                  border: Border.all(
                    color: const Color(0xFF00ffd5),
                    width: isSelected ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                padding: const EdgeInsets.all(12),
                child: Text(
                  moodEmojis[index],
                  style: const TextStyle(fontSize: 24),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 20),

        // Intensity Slider
        Text(
          'Intensity: $selectedIntensity/10',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 8),
        SliderTheme(
          data: SliderThemeData(
            activeTrackColor: const Color(0xFF00ffd5),
            inactiveTrackColor: const Color(0xFF1a1f3a),
            thumbColor: const Color(0xFF00ffd5),
            overlayColor: const Color(0xFF00ffd5).withValues(alpha: 0.3),
            trackHeight: 4,
            thumbShape: const RoundSliderThumbShape(
              elevation: 4,
              enabledThumbRadius: 8,
            ),
          ),
          child: Slider(
            value: selectedIntensity.toDouble(),
            min: 0,
            max: 10,
            divisions: 10,
            onChanged: (value) {
              setState(() => selectedIntensity = value.toInt());
              widget.onChanged(selectedMood, value.toInt());
            },
          ),
        ),
      ],
    );
  }
}
