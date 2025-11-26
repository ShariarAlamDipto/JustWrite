import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/providers/auth_provider.dart';
import 'package:justwrite_mobile/providers/entry_provider.dart';
import 'package:justwrite_mobile/providers/task_provider.dart';
import 'package:justwrite_mobile/screens/entry/entry_screen.dart';
import 'package:justwrite_mobile/screens/tasks/tasks_screen.dart';
import 'package:justwrite_mobile/screens/journal/journal_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  late final List<Widget> _screens = [
    const JournalScreen(),
    const EntryScreen(),
    const TasksScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Load data on app start
    context.read<EntryProvider>().loadEntries();
    context.read<TaskProvider>().loadTasks();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('JUSTWRITE'),
        elevation: 0,
        actions: [
          PopupMenuButton(
            itemBuilder: (context) => [
              PopupMenuItem(
                child: const Text('Sign Out'),
                onTap: () async {
                  await context.read<AuthProvider>().signOut();
                },
              ),
            ],
            icon: const Icon(Icons.menu),
          ),
        ],
      ),
      body: _screens[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Journal',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.edit),
            label: 'New Entry',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.check_circle),
            label: 'Tasks',
          ),
        ],
      ),
    );
  }
}
