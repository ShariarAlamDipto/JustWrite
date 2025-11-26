import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/models/task.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<TaskProvider>(
      builder: (context, taskProvider, _) {
        if (taskProvider.isLoading) {
          return const Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00ffd5)),
            ),
          );
        }

        return DefaultTabController(
          length: 2,
          child: Column(
            children: [
              TabBar(
                tabs: [
                  Tab(
                    child: Text(
                      'PENDING (${taskProvider.pendingTasks.length})',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  Tab(
                    child: Text(
                      'DONE (${taskProvider.completedTasks.length})',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
                labelColor: const Color(0xFF00ffd5),
                unselectedLabelColor: const Color(0xFF7a7a7a),
                indicatorColor: const Color(0xFF00ffd5),
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _TaskList(tasks: taskProvider.pendingTasks),
                    _TaskList(tasks: taskProvider.completedTasks),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _TaskList extends StatelessWidget {
  final List<Task> tasks;

  const _TaskList({required this.tasks});

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '✓ All clear!',
              style: Theme.of(context).textTheme.displaySmall,
            ),
            const SizedBox(height: 8),
            Text(
              'No tasks here',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: tasks.length,
      itemBuilder: (context, index) {
        final task = tasks[index];
        return _TaskCard(task: task);
      },
    );
  }
}

class _TaskCard extends StatelessWidget {
  final Task task;

  const _TaskCard({required this.task});

  @override
  Widget build(BuildContext context) {
    final taskProvider = context.read<TaskProvider>();

    return Dismissible(
      key: Key(task.id),
      direction: DismissDirection.endToStart,
      onDismissed: (direction) {
        taskProvider.deleteTask(task.id);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task deleted')),
        );
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFff0033),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: ListTile(
          leading: Checkbox(
            value: task.isDone,
            onChanged: (_) => taskProvider.toggleTaskStatus(task),
            fillColor: WidgetStateProperty.all(const Color(0xFF00ffd5)),
            checkColor: const Color(0xFF0a0e27),
          ),
          title: Text(
            task.title,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              decoration: task.isDone ? TextDecoration.lineThrough : null,
              color: task.isDone
                  ? const Color(0xFF7a7a7a)
                  : const Color(0xFFffffff),
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text(
                task.description,
                style: Theme.of(context).textTheme.bodySmall,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: _getPriorityColor(task.priority),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      task.priority.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF0a0e27),
                      ),
                    ),
                  ),
                  if (task.dueDate != null) ...[
                    const SizedBox(width: 8),
                    Text(
                      'Due: ${task.dueDate!.toString().split(' ')[0]}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF00ffd5),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          isThreeLine: true,
          onTap: () {
            _showTaskDetail(context, task);
          },
        ),
      ),
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return const Color(0xFFff0033);
      case 'medium':
        return const Color(0xFF00ffd5);
      default:
        return const Color(0xFF7a7a7a);
    }
  }

  void _showTaskDetail(BuildContext context, Task task) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              task.title,
              style: Theme.of(context).textTheme.displaySmall,
            ),
            const SizedBox(height: 16),
            Text(
              task.description,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (task.ifThenPlan != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF1a1f3a),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'If-Then Plan:',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      task.ifThenPlan!,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  context.read<TaskProvider>().toggleTaskStatus(task);
                  Navigator.pop(context);
                },
                child: Text(task.isDone ? 'MARK AS PENDING' : 'MARK AS DONE'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
