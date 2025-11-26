import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/models/entry.dart';

class JournalScreen extends StatelessWidget {
  const JournalScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<EntryProvider>(
      builder: (context, entryProvider, _) {
        if (entryProvider.isLoading) {
          return const Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00ffd5)),
            ),
          );
        }

        if (entryProvider.entries.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '📝 No entries yet',
                  style: Theme.of(context).textTheme.displaySmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  'Start journaling to see your entries here',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: entryProvider.entries.length,
          itemBuilder: (context, index) {
            final entry = entryProvider.entries[index];
            return _EntryCard(entry: entry);
          },
        );
      },
    );
  }
}

class _EntryCard extends StatelessWidget {
  final Entry entry;

  const _EntryCard({required this.entry});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.title ?? 'Untitled Entry',
                        style: Theme.of(context).textTheme.bodyLarge,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        DateFormat('MMM d, yyyy • h:mm a')
                            .format(entry.createdAt),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                // Mood indicator
                Text(
                  ['😢', '😞', '😟', '😕', '😐', '🙂', '😊', '😄', '😃', '🌟']
                      [entry.mood.clamp(0, 9)],
                  style: const TextStyle(fontSize: 24),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Content preview
            Text(
              entry.content.length > 150
                  ? '${entry.content.substring(0, 150)}...'
                  : entry.content,
              style: Theme.of(context).textTheme.bodySmall,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            if (entry.summary != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF1a1f3a),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'AI Summary: ${entry.summary}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontStyle: FontStyle.italic,
                        color: const Color(0xFF00ffd5),
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
