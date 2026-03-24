import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';
import '../providers/theme_provider.dart';
import '../screens/home/home_screen.dart';
import '../screens/notes/notes_screen.dart';
import '../screens/voice/voice_entries_screen.dart';
import '../screens/brainstorm/brainstorm_screen.dart';
import '../screens/tasks/tasks_screen.dart';

/// Windows 11-style shell: left sidebar nav + right content pane.
/// Acrylic / Mica effect is applied by [setupDesktopWindow] before this
/// widget mounts.
class DesktopShell extends StatefulWidget {
  const DesktopShell({super.key});

  @override
  State<DesktopShell> createState() => _DesktopShellState();
}

class _DesktopShellState extends State<DesktopShell> with WindowListener {
  int _selectedIndex = 0;

  // Ordered list of top-level destinations
  static const _destinations = [
    _NavItem(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Journal'),
    _NavItem(icon: Icons.article_outlined, activeIcon: Icons.article_rounded, label: 'Notes'),
    _NavItem(icon: Icons.mic_none_rounded, activeIcon: Icons.mic_rounded, label: 'Voice'),
    _NavItem(icon: Icons.lightbulb_outline_rounded, activeIcon: Icons.lightbulb_rounded, label: 'Brainstorm'),
    _NavItem(icon: Icons.check_box_outline_blank_rounded, activeIcon: Icons.check_box_rounded, label: 'Tasks'),
  ];

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    super.dispose();
  }

  Widget _buildPage(int index) {
    switch (index) {
      case 0: return const HomeScreen();
      case 1: return const NotesScreen();
      case 2: return const VoiceEntriesScreen();
      case 3: return const BrainstormScreen();
      case 4: return const TasksScreen();
      default: return const HomeScreen();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDarkMode;

    // Keyboard shortcut handler
    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.digit1, control: true): () => setState(() => _selectedIndex = 0),
        const SingleActivator(LogicalKeyboardKey.digit2, control: true): () => setState(() => _selectedIndex = 1),
        const SingleActivator(LogicalKeyboardKey.digit3, control: true): () => setState(() => _selectedIndex = 2),
        const SingleActivator(LogicalKeyboardKey.digit4, control: true): () => setState(() => _selectedIndex = 3),
        const SingleActivator(LogicalKeyboardKey.digit5, control: true): () => setState(() => _selectedIndex = 4),
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: Row(
            children: [
              // ── Sidebar ──────────────────────────────────────────────
              _Sidebar(
                isDark: isDark,
                selectedIndex: _selectedIndex,
                destinations: _destinations,
                onDestinationSelected: (i) => setState(() => _selectedIndex = i),
                onThemeToggle: () => context.read<ThemeProvider>().toggleTheme(),
              ),
              // Subtle vertical divider
              VerticalDivider(
                width: 1,
                thickness: 1,
                color: isDark
                    ? Colors.white.withValues(alpha: 0.06)
                    : Colors.black.withValues(alpha: 0.06),
              ),
              // ── Content pane ─────────────────────────────────────────
              Expanded(
                child: ClipRect(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    transitionBuilder: (child, animation) => FadeTransition(
                      opacity: animation,
                      child: child,
                    ),
                    child: KeyedSubtree(
                      key: ValueKey(_selectedIndex),
                      child: _buildPage(_selectedIndex),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

class _Sidebar extends StatelessWidget {
  final bool isDark;
  final int selectedIndex;
  final List<_NavItem> destinations;
  final ValueChanged<int> onDestinationSelected;
  final VoidCallback onThemeToggle;

  const _Sidebar({
    required this.isDark,
    required this.selectedIndex,
    required this.destinations,
    required this.onDestinationSelected,
    required this.onThemeToggle,
  });

  @override
  Widget build(BuildContext context) {
    final sidebarBg = isDark
        ? Colors.black.withValues(alpha: 0.4)
        : Colors.white.withValues(alpha: 0.55);
    const accentCyan = Color(0xFF00ffd5);

    return SizedBox(
      width: 220,
      child: Container(
        color: sidebarBg,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag area / title bar
            GestureDetector(
              behavior: HitTestBehavior.translucent,
              onPanStart: (_) => windowManager.startDragging(),
              child: Container(
                height: 48,
                alignment: Alignment.centerLeft,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  'JustWrite',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Nav items
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                itemCount: destinations.length,
                itemBuilder: (context, index) {
                  final item = destinations[index];
                  final isSelected = index == selectedIndex;
                  return _NavTile(
                    item: item,
                    isSelected: isSelected,
                    isDark: isDark,
                    accentCyan: accentCyan,
                    onTap: () => onDestinationSelected(index),
                    shortcut: 'Ctrl+${index + 1}',
                  );
                },
              ),
            ),

            // Bottom: theme toggle
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
              child: _NavTile(
                item: _NavItem(
                  icon: isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                  activeIcon: isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                  label: isDark ? 'Light mode' : 'Dark mode',
                ),
                isSelected: false,
                isDark: isDark,
                accentCyan: accentCyan,
                onTap: onThemeToggle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  final _NavItem item;
  final bool isSelected;
  final bool isDark;
  final Color accentCyan;
  final VoidCallback onTap;
  final String? shortcut;

  const _NavTile({
    required this.item,
    required this.isSelected,
    required this.isDark,
    required this.accentCyan,
    required this.onTap,
    this.shortcut,
  });

  @override
  Widget build(BuildContext context) {
    final selectedBg = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.black.withValues(alpha: 0.06);
    final textColor = isDark ? Colors.white : Colors.black87;
    final mutedColor = isDark ? Colors.grey[600]! : Colors.grey[500]!;

    return Tooltip(
      message: shortcut ?? '',
      preferBelow: false,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: isSelected ? selectedBg : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              border: isSelected
                  ? Border(left: BorderSide(color: accentCyan, width: 3))
                  : null,
            ),
            child: Row(
              children: [
                Icon(
                  isSelected ? item.activeIcon : item.icon,
                  size: 20,
                  color: isSelected ? accentCyan : mutedColor,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    item.label,
                    style: TextStyle(
                      color: isSelected ? textColor : mutedColor,
                      fontSize: 14,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem({required this.icon, required this.activeIcon, required this.label});
}
