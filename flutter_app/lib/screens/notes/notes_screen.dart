import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:justwrite_mobile/models/note.dart';
import 'package:justwrite_mobile/providers/note_provider.dart';
import 'package:justwrite_mobile/providers/theme_provider.dart';
import 'package:justwrite_mobile/screens/notes/notes_reading_view.dart';


// ─── Entry point ──────────────────────────────────────────────────────────────

class NotesScreen extends StatefulWidget {
  const NotesScreen({super.key});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NoteProvider>().loadNotes();
    });
  }

  void _openCommandPalette() {
    final isDark = context.read<ThemeProvider>().isDarkMode;
    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.45),
      builder: (_) => _CommandPalette(isDark: isDark),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDarkMode;
    final provider = context.watch<NoteProvider>();

    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.keyP, control: true):
            _openCommandPalette,
        const SingleActivator(LogicalKeyboardKey.keyP, meta: true):
            _openCommandPalette,
      },
      child: Focus(
        autofocus: true,
        child: Row(
          children: [
            // Sidebar
            _NotesSidebar(isDark: isDark),
            // Divider
            VerticalDivider(
              width: 1,
              thickness: 1,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.07)
                  : Colors.black.withValues(alpha: 0.07),
            ),
            // Editor pane
            Expanded(
              child: provider.selectedNote == null
                  ? _EmptyState(isDark: isDark)
                  : _NoteEditorPane(
                      key: ValueKey(provider.selectedNote!.id), isDark: isDark),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final bool isDark;
  const _EmptyState({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final faded = isDark ? Colors.white30 : Colors.black26;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.article_outlined, size: 56, color: faded),
          const SizedBox(height: 16),
          Text(
            'Select a note or create one',
            style: TextStyle(fontSize: 16, color: faded),
          ),
        ],
      ),
    );
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

class _NotesSidebar extends StatefulWidget {
  final bool isDark;
  const _NotesSidebar({required this.isDark});

  @override
  State<_NotesSidebar> createState() => _NotesSidebarState();
}

class _NotesSidebarState extends State<_NotesSidebar> {
  final _searchCtrl = TextEditingController();
  String? _tagFilter;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NoteProvider>();
    final isDark = widget.isDark;
    final bg = isDark ? Colors.black.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.6);
    final textColor = isDark ? Colors.white : Colors.black87;
    final mutedColor = isDark ? Colors.grey[500]! : Colors.grey[500]!;
    final notes = provider.filtered(_searchCtrl.text, tagFilter: _tagFilter);
    final tagCounts = provider.tagCounts;
    final selectedNote = provider.selectedNote;
    final backlinks = selectedNote != null ? provider.getBacklinks(selectedNote) : <Note>[];

    return SizedBox(
      width: 240,
      child: Container(
        color: bg,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
              child: Row(
                children: [
                  Text(
                    'Notes',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      letterSpacing: 0.8,
                      color: mutedColor,
                    ),
                  ),
                  const Spacer(),
                  // New note button
                  Material(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(6),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(6),
                      onTap: () => _createNote(context),
                      child: const Padding(
                        padding: EdgeInsets.all(6),
                        child: Icon(Icons.add, size: 18, color: Color(0xFF00ffd5)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Search
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: TextField(
                controller: _searchCtrl,
                onChanged: (_) => setState(() {}),
                style: TextStyle(fontSize: 13, color: textColor),
                decoration: InputDecoration(
                  hintText: 'Search notes…',
                  hintStyle: TextStyle(fontSize: 13, color: mutedColor),
                  prefixIcon: Icon(Icons.search, size: 16, color: mutedColor),
                  filled: true,
                  fillColor: isDark
                      ? Colors.white.withValues(alpha: 0.06)
                      : Colors.black.withValues(alpha: 0.04),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide.none,
                  ),
                  isDense: true,
                ),
              ),
            ),

            // Tag filter chips
            if (tagCounts.isNotEmpty)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(8, 2, 8, 4),
                child: Row(
                  children: tagCounts.entries.take(12).map((entry) {
                    final isActive = _tagFilter == entry.key;
                    return Padding(
                      padding: const EdgeInsets.only(right: 5),
                      child: GestureDetector(
                        onTap: () => setState(
                            () => _tagFilter = isActive ? null : entry.key),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 120),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: isActive
                                ? const Color(0xFF7C3AED).withValues(alpha: 0.18)
                                : (isDark
                                    ? Colors.white.withValues(alpha: 0.06)
                                    : Colors.black.withValues(alpha: 0.04)),
                            borderRadius: BorderRadius.circular(4),
                            border: isActive
                                ? Border.all(
                                    color: const Color(0xFF7C3AED)
                                        .withValues(alpha: 0.4))
                                : null,
                          ),
                          child: Text(
                            '#${entry.key}',
                            style: TextStyle(
                              fontSize: 11,
                              color: isActive
                                  ? const Color(0xFF7C3AED)
                                  : mutedColor,
                              fontWeight: isActive
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),

            // Notes list
            Expanded(
              child: provider.isLoading
                  ? const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 1.5,
                          color: Color(0xFF00ffd5),
                        ),
                      ),
                    )
                  : notes.isEmpty
                      ? Center(
                          child: Text(
                            _searchCtrl.text.isEmpty ? 'No notes yet' : 'No results',
                            style: TextStyle(fontSize: 13, color: mutedColor),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                          itemCount: notes.length,
                          itemBuilder: (context, i) {
                            final note = notes[i];
                            final isSelected = provider.selectedNote?.id == note.id;
                            return _NoteListTile(
                              note: note,
                              isSelected: isSelected,
                              isDark: isDark,
                              onTap: () => context.read<NoteProvider>().selectNote(note.id),
                              onPin: () => context.read<NoteProvider>().togglePin(note.id),
                              onDelete: () => _confirmDelete(context, note),
                            );
                          },
                        ),
            ),
            // Backlinks section
            if (backlinks.isNotEmpty) ...[
              Divider(height: 1, color: isDark ? Colors.white10 : Colors.black12),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 8, 4),
                child: Text(
                  'LINKED FROM',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                    color: mutedColor,
                  ),
                ),
              ),
              ...backlinks.take(5).map((note) => GestureDetector(
                    onTap: () => context.read<NoteProvider>().selectNote(note.id),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      child: Row(
                        children: [
                          Text(note.icon,
                              style: const TextStyle(fontSize: 13)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              note.title.isEmpty ? 'Untitled' : note.title,
                              style: TextStyle(fontSize: 12, color: textColor),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
              const SizedBox(height: 8),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _createNote(BuildContext context) async {
    final provider = context.read<NoteProvider>();
    final note = await provider.createNote();
    if (!context.mounted) return;

    if (note == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.error ?? 'Failed to create note.'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  Future<void> _confirmDelete(BuildContext context, Note note) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete note?'),
        content: Text('Delete "${note.title}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      context.read<NoteProvider>().deleteNote(note.id);
    }
  }
}

// ─── Note list tile ───────────────────────────────────────────────────────────

class _NoteListTile extends StatefulWidget {
  final Note note;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;
  final VoidCallback onPin;
  final VoidCallback onDelete;

  const _NoteListTile({
    required this.note,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
    required this.onPin,
    required this.onDelete,
  });

  @override
  State<_NoteListTile> createState() => _NoteListTileState();
}

class _NoteListTileState extends State<_NoteListTile> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    const accent = Color(0xFF00ffd5);
    final selectedBg = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.black.withValues(alpha: 0.05);
    final textColor = isDark ? Colors.white : Colors.black87;
    final mutedColor = isDark ? Colors.grey[500]! : Colors.grey[500]!;

    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          margin: const EdgeInsets.symmetric(vertical: 1),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: widget.isSelected ? selectedBg : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: widget.isSelected
                ? const Border(left: BorderSide(color: Color(0xFF00ffd5), width: 2.5))
                : null,
          ),
          child: Row(
            children: [
              // Icon
              Text(widget.note.icon, style: const TextStyle(fontSize: 15)),
              const SizedBox(width: 8),
              // Title + snippet
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.note.title.isEmpty ? 'Untitled' : widget.note.title,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: widget.isSelected ? FontWeight.w600 : FontWeight.w400,
                        color: textColor,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (widget.note.snippet != 'No additional text') ...[
                      const SizedBox(height: 2),
                      Text(
                        widget.note.snippet,
                        style: TextStyle(fontSize: 11, color: mutedColor),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              // Actions (on hover or pin)
              if (_hovered || widget.note.isPinned)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _TileAction(
                      icon: widget.note.isPinned
                          ? Icons.push_pin_rounded
                          : Icons.push_pin_outlined,
                      color: widget.note.isPinned ? accent : mutedColor,
                      onTap: widget.onPin,
                      tooltip: widget.note.isPinned ? 'Unpin' : 'Pin',
                    ),
                    if (_hovered)
                      _TileAction(
                        icon: Icons.delete_outline_rounded,
                        color: Colors.red[400]!,
                        onTap: widget.onDelete,
                        tooltip: 'Delete',
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TileAction extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final String tooltip;
  const _TileAction({required this.icon, required this.color, required this.onTap, required this.tooltip});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 2),
          child: Icon(icon, size: 15, color: color),
        ),
      ),
    );
  }
}

// ─── Note Editor Pane ─────────────────────────────────────────────────────────

class _NoteEditorPane extends StatefulWidget {
  final bool isDark;
  const _NoteEditorPane({super.key, required this.isDark});

  @override
  State<_NoteEditorPane> createState() => _NoteEditorPaneState();
}

class _NoteEditorPaneState extends State<_NoteEditorPane> {
  final _titleCtrl = TextEditingController();
  final _titleFocus = FocusNode();
  final _scrollCtrl = ScrollController();

  // Per-block controllers & focus nodes, keyed by block id
  final List<TextEditingController> _blockCtrl = [];
  final List<FocusNode> _blockFocus = [];
  List<NoteBlock> _blocks = [];

  // Slash menu state
  int? _slashBlockIdx;
  String _slashQuery = '';
  final LayerLink _slashLayerLink = LayerLink();
  OverlayEntry? _slashOverlay;

  // Wikilink autocomplete state
  int? _wikiBlockIdx;
  String _wikiQuery = '';
  final LayerLink _wikiLayerLink = LayerLink();
  OverlayEntry? _wikiOverlay;

  // View mode
  bool _isReadMode = false;

  // Note id we're currently editing (to detect note switches)
  String? _noteId;

  @override
  void initState() {
    super.initState();
    _syncFromProvider();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final note = context.read<NoteProvider>().selectedNote;
    if (note != null && note.id != _noteId) {
      _syncFromProvider();
    }
  }

  void _syncFromProvider() {
    final note = context.read<NoteProvider>().selectedNote;
    if (note == null) return;
    _noteId = note.id;

    _titleCtrl.text = note.title;
    _titleCtrl.selection = TextSelection.collapsed(offset: note.title.length);

    _disposeBlockControllers();
    _blocks = List.from(note.blocks);
    if (_blocks.isEmpty) {
      _blocks = [NoteBlock.create()];
    }
    for (final block in _blocks) {
      _blockCtrl.add(TextEditingController(text: block.content));
      _blockFocus.add(FocusNode());
    }
  }

  void _disposeBlockControllers() {
    for (final c in _blockCtrl) { c.dispose(); }
    for (final f in _blockFocus) { f.dispose(); }
    _blockCtrl.clear();
    _blockFocus.clear();
  }

  @override
  void dispose() {
    _closeSlashMenu();
    _closeWikiMenu();
    _titleCtrl.dispose();
    _titleFocus.dispose();
    _scrollCtrl.dispose();
    _disposeBlockControllers();
    super.dispose();
  }

  // ── Block management ────────────────────────────────────────────────────

  void _insertBlockAfter(int idx, {NoteBlockType type = NoteBlockType.paragraph, String content = ''}) {
    final newBlock = NoteBlock.create(type: type, content: content);
    _blocks.insert(idx + 1, newBlock);
    _blockCtrl.insert(idx + 1, TextEditingController(text: content));
    final fn = FocusNode();
    _blockFocus.insert(idx + 1, fn);
    _notifyChange();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && idx + 1 < _blockFocus.length) {
        _blockFocus[idx + 1].requestFocus();
        final c = _blockCtrl[idx + 1];
        c.selection = TextSelection.collapsed(offset: c.text.length);
      }
    });
  }

  void _removeBlock(int idx) {
    if (_blocks.length <= 1) {
      // Keep at least one block; just clear it
      _blockCtrl[0].clear();
      _blocks[0] = _blocks[0].copyWith(content: '');
      _notifyChange();
      return;
    }
    _blocks.removeAt(idx);
    _blockCtrl[idx].dispose();
    _blockCtrl.removeAt(idx);
    _blockFocus[idx].dispose();
    _blockFocus.removeAt(idx);
    _notifyChange();

    final focusIdx = (idx - 1).clamp(0, _blocks.length - 1);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && focusIdx < _blockFocus.length) {
        _blockFocus[focusIdx].requestFocus();
        final c = _blockCtrl[focusIdx];
        c.selection = TextSelection.collapsed(offset: c.text.length);
      }
    });
  }

  void _changeBlockType(int idx, NoteBlockType type) {
    _closeSlashMenu();
    // Clear the slash command from text
    final ctrl = _blockCtrl[idx];
    final text = ctrl.text;
    final slashPos = text.lastIndexOf('/');
    final newText = slashPos >= 0 ? text.substring(0, slashPos) : '';
    ctrl.text = newText;
    ctrl.selection = TextSelection.collapsed(offset: newText.length);
    _blocks[idx] = _blocks[idx].copyWith(type: type, content: newText);

    if (type == NoteBlockType.divider) {
      _blocks[idx] = _blocks[idx].copyWith(content: '');
      ctrl.clear();
      _insertBlockAfter(idx);
    }

    _notifyChange();
    setState(() {});
  }

  void _notifyChange() {
    // Sync _blocks with current controller text
    for (int i = 0; i < _blocks.length; i++) {
      if (i < _blockCtrl.length) {
        _blocks[i] = _blocks[i].copyWith(content: _blockCtrl[i].text);
      }
    }
    context.read<NoteProvider>().updateContent(
          title: _titleCtrl.text,
          blocks: List.from(_blocks),
        );
    if (mounted) setState(() {});
  }

  // ── Slash menu ──────────────────────────────────────────────────────────

  void _openSlashMenu(int blockIdx, String query) {
    _closeSlashMenu();
    _slashBlockIdx = blockIdx;
    _slashQuery = query;

    _slashOverlay = OverlayEntry(
      builder: (_) => _SlashMenuOverlay(
        isDark: widget.isDark,
        query: _slashQuery,
        layerLink: _slashLayerLink,
        onSelect: (type) => _changeBlockType(blockIdx, type),
        onClose: _closeSlashMenu,
      ),
    );
    Overlay.of(context).insert(_slashOverlay!);
  }

  void _updateSlashQuery(String query) {
    _slashQuery = query;
    _slashOverlay?.markNeedsBuild();
  }

  void _closeSlashMenu() {
    _slashOverlay?.remove();
    _slashOverlay = null;
    _slashBlockIdx = null;
    _slashQuery = '';
  }

  // ── Wiki menu ────────────────────────────────────────────────────────────

  void _openWikiMenu(int blockIdx, String query) {
    _closeWikiMenu();
    _wikiBlockIdx = blockIdx;
    _wikiQuery = query;
    final notes = context.read<NoteProvider>().notes;
    _wikiOverlay = OverlayEntry(
      builder: (_) => _WikilinkMenuOverlay(
        isDark: widget.isDark,
        query: _wikiQuery,
        notes: notes,
        layerLink: _wikiLayerLink,
        onSelect: (title) => _applyWikilink(blockIdx, title),
        onClose: _closeWikiMenu,
      ),
    );
    Overlay.of(context).insert(_wikiOverlay!);
  }

  void _updateWikiQuery(String query) {
    _wikiQuery = query;
    _wikiOverlay?.markNeedsBuild();
  }

  void _closeWikiMenu() {
    _wikiOverlay?.remove();
    _wikiOverlay = null;
    _wikiBlockIdx = null;
    _wikiQuery = '';
  }

  void _applyWikilink(int idx, String title) {
    _closeWikiMenu();
    if (idx >= _blockCtrl.length) return;
    final ctrl = _blockCtrl[idx];
    final text = ctrl.text;
    final wikiStart = text.lastIndexOf('[[');
    if (wikiStart < 0) return;
    final newText = '${text.substring(0, wikiStart)}[[$title]]';
    ctrl.text = newText;
    ctrl.selection = TextSelection.collapsed(offset: newText.length);
    _blocks[idx] = _blocks[idx].copyWith(content: newText);
    _notifyChange();
  }

  // ── Keyboard handling ───────────────────────────────────────────────────

  KeyEventResult _handleBlockKey(int idx, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    final ctrl = _blockCtrl[idx];
    final text = ctrl.text;
    final sel = ctrl.selection;

    // Escape: close slash menu
    if (event.logicalKey == LogicalKeyboardKey.escape) {
      if (_slashBlockIdx != null) {
        _closeSlashMenu();
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }

    // Enter: insert new block
    if (event.logicalKey == LogicalKeyboardKey.enter) {
      if (_slashBlockIdx != null) return KeyEventResult.ignored; // Let menu handle it
      final cursorPos = sel.isValid ? sel.baseOffset : text.length;
      final before = text.substring(0, cursorPos);
      final after = text.substring(cursorPos);

      // Empty list item → convert to paragraph
      final block = _blocks[idx];
      if (text.isEmpty &&
          (block.type == NoteBlockType.bullet ||
              block.type == NoteBlockType.numbered)) {
        _blocks[idx] = block.copyWith(type: NoteBlockType.paragraph);
        _notifyChange();
        setState(() {});
        return KeyEventResult.handled;
      }

      ctrl.text = before;
      _blocks[idx] = _blocks[idx].copyWith(content: before);
      _insertBlockAfter(idx, content: after);
      return KeyEventResult.handled;
    }

    // Backspace on empty block: delete it
    if (event.logicalKey == LogicalKeyboardKey.backspace) {
      if (text.isEmpty) {
        _removeBlock(idx);
        return KeyEventResult.handled;
      }
    }

    // Tab: increase indent
    if (event.logicalKey == LogicalKeyboardKey.tab) {
      final block = _blocks[idx];
      if (HardwareKeyboard.instance.isShiftPressed) {
        _blocks[idx] = block.copyWith(indent: (block.indent - 1).clamp(0, 4));
      } else {
        _blocks[idx] = block.copyWith(indent: (block.indent + 1).clamp(0, 4));
      }
      _notifyChange();
      setState(() {});
      return KeyEventResult.handled;
    }

    // Arrow up: focus previous block
    if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
      if (idx > 0) {
        _blockFocus[idx - 1].requestFocus();
        return KeyEventResult.handled;
      }
    }

    // Arrow down: focus next block
    if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
      if (idx < _blocks.length - 1) {
        _blockFocus[idx + 1].requestFocus();
        return KeyEventResult.handled;
      }
    }

    return KeyEventResult.ignored;
  }

  // ── Build ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NoteProvider>();
    final note = provider.selectedNote;
    if (note == null) return const SizedBox();

    final isDark = widget.isDark;
    final textColor = isDark ? Colors.white : Colors.black87;
    final mutedColor = isDark ? Colors.grey[500]! : Colors.grey[500]!;
    // Detect note switch
    if (note.id != _noteId) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(_syncFromProvider);
      });
    }

    return Column(
      children: [
        // Top bar: breadcrumb + save status
        Container(
          height: 42,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              if (note.isPinned)
                const Padding(
                  padding: EdgeInsets.only(right: 6),
                  child: Icon(Icons.push_pin_rounded, size: 13, color: Color(0xFF00ffd5)),
                ),
              Expanded(
                child: Text(
                  note.title.isEmpty ? 'Untitled' : note.title,
                  style: TextStyle(
                    fontSize: 13,
                    color: mutedColor,
                    fontWeight: FontWeight.w400,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              // Reading mode toggle
              Tooltip(
                message: _isReadMode ? 'Edit mode' : 'Reading mode',
                child: InkWell(
                  borderRadius: BorderRadius.circular(6),
                  onTap: () => setState(() => _isReadMode = !_isReadMode),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    child: Icon(
                      _isReadMode ? Icons.edit_outlined : Icons.visibility_outlined,
                      size: 16,
                      color: _isReadMode ? const Color(0xFF00ffd5) : mutedColor,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 4),
              // Save status
              _SaveIndicator(status: provider.saveStatus, isDark: isDark),
              const SizedBox(width: 8),
              // Options menu
              _EditorOptionsMenu(
                isDark: isDark,
                isPinned: note.isPinned,
                onPin: () => provider.togglePin(note.id),
                onDelete: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('Delete note?'),
                      content: Text('Delete "${note.title}"? This cannot be undone.'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                        TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('Delete', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    ),
                  );
                  if (confirmed == true && context.mounted) {
                    provider.deleteNote(note.id);
                  }
                },
              ),
            ],
          ),
        ),
        Divider(
          height: 1,
          thickness: 1,
          color: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.06),
        ),
        // Editor body
        Expanded(
          child: _isReadMode
              ? NotesReadingView(
                  blocks: _blocks,
                  isDark: widget.isDark,
                  onWikilinkTap: (title) {
                    final p = context.read<NoteProvider>();
                    final target = p.notes
                        .where((n) => n.title.toLowerCase() == title.toLowerCase())
                        .firstOrNull;
                    if (target != null) p.selectNote(target.id);
                  },
                  onTagTap: (_) {},
                )
              : SingleChildScrollView(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.symmetric(horizontal: 72, vertical: 40),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Note icon picker
                      _IconPicker(
                        icon: note.icon,
                        isDark: isDark,
                        onChanged: (icon) {
                          context.read<NoteProvider>().updateContent(icon: icon);
                        },
                      ),
                      const SizedBox(height: 8),
                      // Title
                      TextField(
                        controller: _titleCtrl,
                        focusNode: _titleFocus,
                        style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.w700,
                          color: textColor,
                          height: 1.2,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Untitled',
                          hintStyle: TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w700,
                            color: mutedColor.withValues(alpha: 0.4),
                          ),
                          border: InputBorder.none,
                          filled: false,
                          contentPadding: EdgeInsets.zero,
                          isDense: true,
                        ),
                        maxLines: null,
                        keyboardType: TextInputType.multiline,
                        onChanged: (v) => _notifyChange(),
                        onSubmitted: (_) {
                          if (_blockFocus.isNotEmpty) {
                            _blockFocus[0].requestFocus();
                          }
                        },
                      ),
                      // Tag chips extracted from current blocks
                      _buildTagsChips(mutedColor),
                      const SizedBox(height: 16),
                      // Blocks
                      ..._buildBlocks(isDark, textColor, mutedColor),
                      // Tap below to add block
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () {
                          if (_blockFocus.isNotEmpty) {
                            _blockFocus.last.requestFocus();
                          }
                        },
                        child: const SizedBox(height: 120, width: double.infinity),
                      ),
                    ],
                  ),
                ),
        ),
      ],
    );
  }

  List<Widget> _buildBlocks(bool isDark, Color textColor, Color mutedColor) {
    final widgets = <Widget>[];
    for (int i = 0; i < _blocks.length; i++) {
      final block = _blocks[i];
      widgets.add(
        _BlockRow(
          key: ValueKey(block.id),
          block: block,
          controller: _blockCtrl[i],
          focusNode: _blockFocus[i],
          isDark: isDark,
          textColor: textColor,
          mutedColor: mutedColor,
          blockIndex: i,
          blockCount: _blocks.length,
          layerLink: i == _slashBlockIdx
              ? _slashLayerLink
              : (i == _wikiBlockIdx ? _wikiLayerLink : null),
          onChanged: (text) {
            _blocks[i] = _blocks[i].copyWith(content: text);
            // Detect slash command
            if (text.startsWith('/')) {
              final query = text.substring(1);
              if (_slashBlockIdx == i) {
                _updateSlashQuery(query);
              } else {
                _openSlashMenu(i, query);
              }
            } else if (_slashBlockIdx == i) {
              _closeSlashMenu();
            }
            // Detect [[wikilink autocomplete
            final wikiMatch = RegExp(r'\[\[([^\]]*)$').firstMatch(text);
            if (wikiMatch != null) {
              final query = wikiMatch.group(1) ?? '';
              if (_wikiBlockIdx == i) {
                _updateWikiQuery(query);
              } else {
                _openWikiMenu(i, query);
              }
            } else if (_wikiBlockIdx == i) {
              _closeWikiMenu();
            }
            _notifyChange();
          },
          onKeyEvent: (event) => _handleBlockKey(i, event),
          onTypeChange: (type) => _changeBlockType(i, type),
          numberedIndex: block.type == NoteBlockType.numbered
              ? _blocks
                  .take(i + 1)
                  .where((b) => b.type == NoteBlockType.numbered)
                  .length
              : null,
        ),
      );
    }
    return widgets;
  }

  Widget _buildTagsChips(Color mutedColor) {
    final tags = <String>{};
    for (final block in _blocks) {
      for (final m in RegExp(r'#(\w+)').allMatches(block.content)) {
        tags.add(m.group(1)!.toLowerCase());
      }
    }
    if (tags.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        spacing: 6,
        runSpacing: 4,
        children: tags.map((tag) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFF7C3AED).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              '#$tag',
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF7C3AED),
                fontWeight: FontWeight.w500,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── Block Row ────────────────────────────────────────────────────────────────

class _BlockRow extends StatefulWidget {
  final NoteBlock block;
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool isDark;
  final Color textColor;
  final Color mutedColor;
  final int blockIndex;
  final int blockCount;
  final LayerLink? layerLink;
  final ValueChanged<String> onChanged;
  final KeyEventResult Function(KeyEvent) onKeyEvent;
  final ValueChanged<NoteBlockType> onTypeChange;
  final int? numberedIndex;

  const _BlockRow({
    super.key,
    required this.block,
    required this.controller,
    required this.focusNode,
    required this.isDark,
    required this.textColor,
    required this.mutedColor,
    required this.blockIndex,
    required this.blockCount,
    required this.onChanged,
    required this.onKeyEvent,
    required this.onTypeChange,
    this.layerLink,
    this.numberedIndex,
  });

  @override
  State<_BlockRow> createState() => _BlockRowState();
}

class _BlockRowState extends State<_BlockRow> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final block = widget.block;
    final indent = block.indent * 24.0;

    if (block.type == NoteBlockType.divider) {
      return Padding(
        padding: EdgeInsets.only(left: indent, top: 8, bottom: 8),
        child: Divider(
          thickness: 1,
          color: widget.isDark ? Colors.white12 : Colors.black12,
        ),
      );
    }

    final style = _blockTextStyle(block.type, widget.textColor, widget.isDark);
    final hintText = _blockHint(block.type);

    Widget textField = TextField(
      controller: widget.controller,
      focusNode: widget.focusNode,
      style: style,
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: style.copyWith(
          color: widget.mutedColor.withValues(alpha: 0.4),
        ),
        border: InputBorder.none,
        filled: false,
        contentPadding: EdgeInsets.zero,
        isDense: true,
      ),
      maxLines: null,
      keyboardType: TextInputType.multiline,
      onChanged: widget.onChanged,
    );

    // Wrap with special block styles
    Widget content = textField;
    if (block.type == NoteBlockType.quote) {
      content = Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        decoration: const BoxDecoration(
          border: Border(
            left: BorderSide(
              color: Color(0xFF00ffd5),
              width: 3,
            ),
          ),
        ),
        child: DefaultTextStyle(
          style: style.copyWith(
            fontStyle: FontStyle.italic,
            color: widget.textColor.withValues(alpha: 0.75),
          ),
          child: textField,
        ),
      );
    } else if (block.type == NoteBlockType.code) {
      content = Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: widget.isDark
              ? Colors.black.withValues(alpha: 0.5)
              : Colors.grey[100],
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: widget.isDark ? Colors.white10 : Colors.black12,
          ),
        ),
        child: textField,
      );
    } else if (block.type == NoteBlockType.callout) {
      content = Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: widget.isDark
              ? const Color(0xFF00ffd5).withValues(alpha: 0.07)
              : const Color(0xFF00ffd5).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: const Color(0xFF00ffd5).withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(block.icon, style: const TextStyle(fontSize: 16)),
            const SizedBox(width: 10),
            Expanded(child: textField),
          ],
        ),
      );
    }

    // Add bullet / numbered prefix
    Widget rowChild;
    if (block.type == NoteBlockType.bullet) {
      rowChild = Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 4, right: 8),
            child: Text('•',
                style: TextStyle(fontSize: 16, color: widget.textColor)),
          ),
          Expanded(child: content),
        ],
      );
    } else if (block.type == NoteBlockType.numbered) {
      rowChild = Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2, right: 8),
            child: Text(
              '${widget.numberedIndex ?? widget.blockIndex + 1}.',
              style: TextStyle(
                fontSize: 15,
                color: widget.textColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(child: content),
        ],
      );
    } else if (block.type == NoteBlockType.toggle) {
      rowChild = Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 3, right: 6),
            child: Icon(Icons.arrow_right_rounded, size: 18, color: Colors.grey),
          ),
          Expanded(child: content),
        ],
      );
    } else {
      rowChild = content;
    }

    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: Padding(
        padding: EdgeInsets.only(left: indent, top: 2, bottom: 2),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle (shown on hover, desktop only)
            SizedBox(
              width: 20,
              child: _hovered
                  ? Icon(Icons.drag_indicator_rounded,
                      size: 14,
                      color: widget.mutedColor.withValues(alpha: 0.5))
                  : null,
            ),
            Expanded(
              child: Focus(
                onKeyEvent: (_, e) => widget.onKeyEvent(e),
                child: widget.layerLink != null
                    ? CompositedTransformTarget(
                        link: widget.layerLink!,
                        child: rowChild,
                      )
                    : rowChild,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Block styling helpers ────────────────────────────────────────────────────

TextStyle _blockTextStyle(NoteBlockType type, Color textColor, bool isDark) {
  switch (type) {
    case NoteBlockType.h1:
      return TextStyle(
          fontSize: 30,
          fontWeight: FontWeight.w700,
          color: textColor,
          height: 1.3);
    case NoteBlockType.h2:
      return TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          color: textColor,
          height: 1.3);
    case NoteBlockType.h3:
      return TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: textColor,
          height: 1.3);
    case NoteBlockType.code:
      return TextStyle(
          fontSize: 13,
          fontFamily: 'Courier New',
          color: isDark ? const Color(0xFF7EE787) : const Color(0xFF24292F),
          height: 1.6);
    case NoteBlockType.quote:
      return TextStyle(
          fontSize: 15,
          fontStyle: FontStyle.italic,
          color: textColor.withValues(alpha: 0.75),
          height: 1.6);
    default:
      return TextStyle(fontSize: 15, color: textColor, height: 1.7);
  }
}

String _blockHint(NoteBlockType type) {
  switch (type) {
    case NoteBlockType.h1: return 'Heading 1';
    case NoteBlockType.h2: return 'Heading 2';
    case NoteBlockType.h3: return 'Heading 3';
    case NoteBlockType.bullet: return 'List item';
    case NoteBlockType.numbered: return 'List item';
    case NoteBlockType.toggle: return 'Toggle';
    case NoteBlockType.quote: return 'Quote';
    case NoteBlockType.code: return '// code';
    case NoteBlockType.callout: return 'Callout';
    default: return "Type '/' for commands";
  }
}

// ─── Slash Menu Overlay ───────────────────────────────────────────────────────

const _slashItems = [
  (NoteBlockType.paragraph, 'Text', 'Plain paragraph', '¶'),
  (NoteBlockType.h1, 'Heading 1', 'Large title', 'H1'),
  (NoteBlockType.h2, 'Heading 2', 'Medium title', 'H2'),
  (NoteBlockType.h3, 'Heading 3', 'Small title', 'H3'),
  (NoteBlockType.bullet, 'Bullet List', 'Unordered list', '•'),
  (NoteBlockType.numbered, 'Numbered', 'Ordered list', '1.'),
  (NoteBlockType.toggle, 'Toggle', 'Collapsible', '▶'),
  (NoteBlockType.quote, 'Quote', 'Blockquote', '"'),
  (NoteBlockType.code, 'Code', 'Code block', '</>'),
  (NoteBlockType.callout, 'Callout', 'Highlighted note', '💡'),
  (NoteBlockType.divider, 'Divider', 'Horizontal line', '—'),
];

class _SlashMenuOverlay extends StatefulWidget {
  final bool isDark;
  final String query;
  final LayerLink layerLink;
  final ValueChanged<NoteBlockType> onSelect;
  final VoidCallback onClose;

  const _SlashMenuOverlay({
    required this.isDark,
    required this.query,
    required this.layerLink,
    required this.onSelect,
    required this.onClose,
  });

  @override
  State<_SlashMenuOverlay> createState() => _SlashMenuOverlayState();
}

class _SlashMenuOverlayState extends State<_SlashMenuOverlay> {
  int _activeIdx = 0;

  List<(NoteBlockType, String, String, String)> get _filtered {
    if (widget.query.isEmpty) return _slashItems;
    final q = widget.query.toLowerCase();
    return _slashItems.where((item) => item.$2.toLowerCase().contains(q)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final items = _filtered;
    final bg = widget.isDark ? const Color(0xFF2C2C2C) : Colors.white;
    final border = widget.isDark ? Colors.white12 : Colors.black12;
    final textColor = widget.isDark ? Colors.white : Colors.black87;
    final mutedColor = widget.isDark ? Colors.grey[400]! : Colors.grey[600]!;
    final selectedBg = widget.isDark ? Colors.white.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.05);

    return Positioned.fill(
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: widget.onClose,
        child: CompositedTransformFollower(
          link: widget.layerLink,
          showWhenUnlinked: false,
          offset: const Offset(0, 24),
          child: Align(
            alignment: Alignment.topLeft,
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(10),
              color: bg,
              child: Container(
                width: 260,
                constraints: const BoxConstraints(maxHeight: 320),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: border),
                ),
                child: items.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text('No results', style: TextStyle(color: mutedColor, fontSize: 13)),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        shrinkWrap: true,
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final (type, label, desc, symbol) = items[i];
                          final isActive = i == _activeIdx;
                          return GestureDetector(
                            onTap: () => widget.onSelect(type),
                            child: MouseRegion(
                              onEnter: (_) => setState(() => _activeIdx = i),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isActive ? selectedBg : Colors.transparent,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 32,
                                      height: 32,
                                      alignment: Alignment.center,
                                      decoration: BoxDecoration(
                                        color: widget.isDark
                                            ? Colors.white.withValues(alpha: 0.08)
                                            : Colors.black.withValues(alpha: 0.05),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        symbol,
                                        style: TextStyle(
                                          fontSize: symbol.length > 2 ? 10 : 13,
                                          fontWeight: FontWeight.w600,
                                          color: textColor,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(label,
                                            style: TextStyle(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w500,
                                                color: textColor)),
                                        Text(desc,
                                            style: TextStyle(fontSize: 11, color: mutedColor)),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Icon Picker ──────────────────────────────────────────────────────────────

class _IconPicker extends StatelessWidget {
  final String icon;
  final bool isDark;
  final ValueChanged<String> onChanged;

  const _IconPicker({required this.icon, required this.isDark, required this.onChanged});

  static const _icons = [
    '📝', '📖', '💡', '🔥', '⭐', '🎯', '📌', '🗂️',
    '🧠', '🌿', '💎', '🔑', '📅', '✅', '🎨', '🚀',
  ];

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Change icon',
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => _showPicker(context),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Text(icon, style: const TextStyle(fontSize: 40)),
        ),
      ),
    );
  }

  void _showPicker(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Choose an icon'),
        content: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _icons.map((e) {
            return InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () {
                onChanged(e);
                Navigator.pop(context);
              },
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Text(e, style: const TextStyle(fontSize: 28)),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ─── Wikilink Autocomplete Overlay ────────────────────────────────────────────

class _WikilinkMenuOverlay extends StatelessWidget {
  final bool isDark;
  final String query;
  final List<Note> notes;
  final LayerLink layerLink;
  final ValueChanged<String> onSelect;
  final VoidCallback onClose;

  const _WikilinkMenuOverlay({
    required this.isDark,
    required this.query,
    required this.notes,
    required this.layerLink,
    required this.onSelect,
    required this.onClose,
  });

  List<Note> get _filtered {
    if (query.isEmpty) return notes.take(8).toList();
    final q = query.toLowerCase();
    return notes.where((n) => n.title.toLowerCase().contains(q)).take(8).toList();
  }

  @override
  Widget build(BuildContext context) {
    final items = _filtered;
    final bg = isDark ? const Color(0xFF2C2C2C) : Colors.white;
    final border = isDark ? Colors.white12 : Colors.black12;
    final textColor = isDark ? Colors.white : Colors.black87;
    final mutedColor = isDark ? Colors.grey[400]! : Colors.grey[600]!;

    return Positioned.fill(
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: onClose,
        child: CompositedTransformFollower(
          link: layerLink,
          showWhenUnlinked: false,
          offset: const Offset(0, 24),
          child: Align(
            alignment: Alignment.topLeft,
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(10),
              color: bg,
              child: Container(
                width: 240,
                constraints: const BoxConstraints(maxHeight: 240),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: border),
                ),
                child: items.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text('No notes found',
                            style: TextStyle(fontSize: 12, color: mutedColor)),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        shrinkWrap: true,
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final note = items[i];
                          return GestureDetector(
                            onTap: () => onSelect(note.title),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 7),
                              child: Row(
                                children: [
                                  Text(note.icon,
                                      style: const TextStyle(fontSize: 14)),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      note.title.isEmpty ? 'Untitled' : note.title,
                                      style: TextStyle(
                                          fontSize: 13, color: textColor),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Save Indicator ───────────────────────────────────────────────────────────

class _SaveIndicator extends StatelessWidget {
  final SaveStatus status;
  final bool isDark;
  const _SaveIndicator({required this.status, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final muted = isDark ? Colors.grey[600]! : Colors.grey[400]!;
    switch (status) {
      case SaveStatus.saving:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 10,
              height: 10,
              child: CircularProgressIndicator(strokeWidth: 1.5, color: muted),
            ),
            const SizedBox(width: 5),
            Text('Saving…', style: TextStyle(fontSize: 11, color: muted)),
          ],
        );
      case SaveStatus.error:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 12, color: Colors.red[300]),
            const SizedBox(width: 4),
            Text('Error', style: TextStyle(fontSize: 11, color: Colors.red[300])),
          ],
        );
      case SaveStatus.saved:
        return Text('Saved', style: TextStyle(fontSize: 11, color: muted));
    }
  }
}

// ─── Editor Options Menu ──────────────────────────────────────────────────────

class _EditorOptionsMenu extends StatelessWidget {
  final bool isDark;
  final bool isPinned;
  final VoidCallback onPin;
  final VoidCallback onDelete;
  const _EditorOptionsMenu(
      {required this.isDark,
      required this.isPinned,
      required this.onPin,
      required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final muted = isDark ? Colors.grey[500]! : Colors.grey[500]!;
    return PopupMenuButton<String>(
      icon: Icon(Icons.more_horiz, size: 18, color: muted),
      tooltip: 'Options',
      onSelected: (val) {
        if (val == 'pin') onPin();
        if (val == 'delete') onDelete();
      },
      itemBuilder: (_) => [
        PopupMenuItem(
          value: 'pin',
          child: Row(
            children: [
              Icon(isPinned ? Icons.push_pin_rounded : Icons.push_pin_outlined,
                  size: 16, color: muted),
              const SizedBox(width: 8),
              Text(isPinned ? 'Unpin' : 'Pin'),
            ],
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem(
          value: 'delete',
          child: Row(
            children: [
              Icon(Icons.delete_outline_rounded, size: 16, color: Colors.red[400]),
              const SizedBox(width: 8),
              Text('Delete', style: TextStyle(color: Colors.red[400])),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Command Palette ──────────────────────────────────────────────────────────

class _CommandPalette extends StatefulWidget {
  final bool isDark;
  const _CommandPalette({required this.isDark});

  @override
  State<_CommandPalette> createState() => _CommandPaletteState();
}

class _CommandPaletteState extends State<_CommandPalette> {
  final _ctrl = TextEditingController();
  final _focus = FocusNode();
  int _selectedIdx = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _focus.requestFocus());
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _focus.dispose();
    super.dispose();
  }

  List<Note> get _results {
    final provider = context.read<NoteProvider>();
    return provider.filtered(_ctrl.text);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final bg = isDark ? const Color(0xFF1E1E2E) : Colors.white;
    final border = isDark ? Colors.white12 : Colors.black12;
    final textColor = isDark ? Colors.white : Colors.black87;
    final mutedColor = isDark ? Colors.grey[400]! : Colors.grey[600]!;
    final selectedBg = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.black.withValues(alpha: 0.05);

    final results = _results;
    if (_selectedIdx >= results.length && results.isNotEmpty) {
      _selectedIdx = results.length - 1;
    }

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 80, vertical: 120),
      child: Material(
        borderRadius: BorderRadius.circular(12),
        color: bg,
        elevation: 24,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 560, maxHeight: 420),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Search field
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                child: Row(
                  children: [
                    Icon(Icons.search, size: 18, color: mutedColor),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Focus(
                        onKeyEvent: (_, e) {
                          if (e is! KeyDownEvent) return KeyEventResult.ignored;
                          if (e.logicalKey == LogicalKeyboardKey.escape) {
                            Navigator.pop(context);
                            return KeyEventResult.handled;
                          }
                          if (results.isEmpty) return KeyEventResult.ignored;

                          if (e.logicalKey == LogicalKeyboardKey.arrowDown) {
                            setState(() => _selectedIdx =
                                (_selectedIdx + 1).clamp(0, results.length - 1));
                            return KeyEventResult.handled;
                          }

                          if (e.logicalKey == LogicalKeyboardKey.arrowUp) {
                            setState(() => _selectedIdx =
                                (_selectedIdx - 1).clamp(0, results.length - 1));
                            return KeyEventResult.handled;
                          }

                          if (e.logicalKey == LogicalKeyboardKey.enter) {
                            _select(results[_selectedIdx]);
                            return KeyEventResult.handled;
                          }

                          return KeyEventResult.ignored;
                        },
                        child: TextField(
                          controller: _ctrl,
                          focusNode: _focus,
                          style: TextStyle(fontSize: 15, color: textColor),
                          decoration: InputDecoration(
                            hintText: 'Search notes…',
                            hintStyle:
                                TextStyle(fontSize: 15, color: mutedColor),
                            border: InputBorder.none,
                            isDense: true,
                          ),
                          onChanged: (_) => setState(() => _selectedIdx = 0),
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Text('esc',
                          style: TextStyle(fontSize: 11, color: mutedColor)),
                    ),
                  ],
                ),
              ),
              Divider(
                  height: 14,
                  color: isDark ? Colors.white10 : Colors.black12),
              // Results
              Flexible(
                child: results.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text('No notes found',
                            style: TextStyle(color: mutedColor, fontSize: 13)),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                        shrinkWrap: true,
                        itemCount: results.length,
                        itemBuilder: (_, i) {
                          final note = results[i];
                          final isActive = i == _selectedIdx;
                          return GestureDetector(
                            onTap: () => _select(note),
                            child: MouseRegion(
                              onEnter: (_) =>
                                  setState(() => _selectedIdx = i),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isActive
                                      ? selectedBg
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(6),
                                  border: isActive
                                      ? Border.all(
                                          color: const Color(0xFF00ffd5)
                                              .withValues(alpha: 0.3))
                                      : null,
                                ),
                                child: Row(
                                  children: [
                                    Text(note.icon,
                                        style:
                                            const TextStyle(fontSize: 16)),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            note.title.isEmpty
                                                ? 'Untitled'
                                                : note.title,
                                            style: TextStyle(
                                                fontSize: 14,
                                                color: textColor,
                                                fontWeight: isActive
                                                    ? FontWeight.w600
                                                    : FontWeight.w400),
                                          ),
                                          if (note.snippet !=
                                              'No additional text')
                                            Text(
                                              note.snippet,
                                              style: TextStyle(
                                                  fontSize: 11,
                                                  color: mutedColor),
                                              maxLines: 1,
                                              overflow:
                                                  TextOverflow.ellipsis,
                                            ),
                                        ],
                                      ),
                                    ),
                                    if (isActive)
                                      Icon(Icons.arrow_forward_rounded,
                                          size: 14, color: mutedColor),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _select(Note note) {
    Navigator.pop(context);
    context.read<NoteProvider>().selectNote(note.id);
  }
}
