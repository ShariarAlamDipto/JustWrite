import 'package:flutter/material.dart';
import 'package:justwrite_mobile/theme/app_theme.dart';

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

  // Simple text labels instead of emojis
  static const _moodLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  static const _moodDescriptions = ['Very Low', 'Low', 'Below Average', 'Slightly Low', 'Neutral', 'Slightly High', 'Above Average', 'Good', 'Great', 'Excellent'];

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
        // Current mood display
        Row(
          children: [
            Text(
              'Current: ',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            Text(
              _moodDescriptions[selectedMood.clamp(0, 9)],
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppTheme.navy,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        // Mood selector - horizontal scroll with numbers
        SizedBox(
          height: 48,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: 10,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final isSelected = selectedMood == index;
              return GestureDetector(
                onTap: () {
                  setState(() => selectedMood = index);
                  widget.onChanged(index, selectedIntensity);
                },
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.navy : AppTheme.greyLight.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(8),
                    border: isSelected ? null : Border.all(color: AppTheme.greyLight),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _moodLabels[index],
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'Times New Roman',
                      color: isSelected ? Colors.white : AppTheme.black,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 20),

        // Intensity
        Row(
          children: [
            Text(
              'Intensity',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const Spacer(),
            Text(
              '$selectedIntensity/10',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppTheme.navy,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 4,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
          ),
          child: Slider(
            value: selectedIntensity.toDouble(),
            min: 1,
            max: 10,
            divisions: 9,
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
