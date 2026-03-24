import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/note.dart';

// ─── Inline content parser ────────────────────────────────────────────────────
//
// Parses a block's content string into styled InlineSpan list supporting:
//   [[wikilink]]   → accent-underline, tappable
//   #tag           → cyan, tappable
//   **bold**       → bold
//   *italic*       → italic
//   `code`         → monospace + bg
//   ==highlight==  → yellow highlight

const _accentColor  = Color(0xFF00ffd5);
const _tagColor     = Color(0xFF7C3AED);  // purple, Obsidian-like
const _wikiColor    = Color(0xFF60A5FA);  // blue link

List<InlineSpan> parseInline({
  required String text,
  required TextStyle base,
  required bool isDark,
  ValueChanged<String>? onWikilink,
  ValueChanged<String>? onTag,
  List<TapGestureRecognizer>? recognizerCollector,
}) {
  final spans = <InlineSpan>[];
  // Order matters: longest/most specific patterns first
  final pattern = RegExp(
    r'\[\[([^\]]+)\]\]'   // [[wikilink]]
    r'|#(\w+)'            // #tag
    r'|\*\*(.+?)\*\*'     // **bold**
    r'|\*(.+?)\*'         // *italic*
    r'|`(.+?)`'           // `code`
    r'|==(.+?)==',        // ==highlight==
  );

  int last = 0;
  for (final m in pattern.allMatches(text)) {
    if (m.start > last) {
      spans.add(TextSpan(text: text.substring(last, m.start), style: base));
    }
    if (m.group(1) != null) {
      // [[wikilink]]
      final link = m.group(1)!;
      final rec = TapGestureRecognizer()..onTap = () => onWikilink?.call(link);
      recognizerCollector?.add(rec);
      spans.add(TextSpan(
        text: link,
        style: base.copyWith(
          color: _wikiColor,
          decoration: TextDecoration.underline,
          decorationColor: _wikiColor,
        ),
        recognizer: rec,
      ));
    } else if (m.group(2) != null) {
      // #tag
      final tag = m.group(2)!;
      final rec = TapGestureRecognizer()..onTap = () => onTag?.call(tag);
      recognizerCollector?.add(rec);
      spans.add(TextSpan(
        text: '#$tag',
        style: base.copyWith(color: _tagColor, fontWeight: FontWeight.w600),
        recognizer: rec,
      ));
    } else if (m.group(3) != null) {
      spans.add(TextSpan(
        text: m.group(3),
        style: base.copyWith(fontWeight: FontWeight.bold),
      ));
    } else if (m.group(4) != null) {
      spans.add(TextSpan(
        text: m.group(4),
        style: base.copyWith(fontStyle: FontStyle.italic),
      ));
    } else if (m.group(5) != null) {
      spans.add(TextSpan(
        text: m.group(5),
        style: base.copyWith(
          fontFamily: 'Courier New',
          fontSize: (base.fontSize ?? 15) - 1,
          color: isDark ? const Color(0xFF7EE787) : const Color(0xFF24292F),
          backgroundColor: isDark
              ? Colors.black.withValues(alpha: 0.4)
              : Colors.grey[200],
        ),
      ));
    } else if (m.group(6) != null) {
      spans.add(TextSpan(
        text: m.group(6),
        style: base.copyWith(
          backgroundColor: isDark
              ? Colors.yellow.withValues(alpha: 0.25)
              : Colors.yellow.withValues(alpha: 0.5),
        ),
      ));
    }
    last = m.end;
  }
  if (last < text.length) {
    spans.add(TextSpan(text: text.substring(last), style: base));
  }
  return spans;
}

// ─── Reading view ─────────────────────────────────────────────────────────────

class NotesReadingView extends StatefulWidget {
  final List<NoteBlock> blocks;
  final bool isDark;
  final ValueChanged<String>? onWikilinkTap;
  final ValueChanged<String>? onTagTap;

  const NotesReadingView({
    super.key,
    required this.blocks,
    required this.isDark,
    this.onWikilinkTap,
    this.onTagTap,
  });

  @override
  State<NotesReadingView> createState() => _NotesReadingViewState();
}

class _NotesReadingViewState extends State<NotesReadingView> {
  final List<TapGestureRecognizer> _recognizers = [];

  void _disposeRecognizers() {
    for (final recognizer in _recognizers) {
      recognizer.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Rebuild spans with fresh recognizers each frame, disposing old ones first.
    _disposeRecognizers();

    final textColor = widget.isDark ? Colors.white : Colors.black87;
    int numberedCounter = 0;

    final widgets = <Widget>[];
    for (int i = 0; i < widget.blocks.length; i++) {
      final block = widget.blocks[i];
      if (block.type == NoteBlockType.numbered) {
        numberedCounter++;
      } else {
        numberedCounter = 0;
      }
      widgets.add(_buildBlock(block, textColor, numberedCounter));
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 72, vertical: 32),
      children: widgets,
    );
  }

  Widget _buildBlock(NoteBlock block, Color textColor, int numberedIdx) {
    if (block.type == NoteBlockType.divider) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Divider(color: widget.isDark ? Colors.white12 : Colors.black12),
      );
    }

    if (block.content.trim().isEmpty &&
        block.type == NoteBlockType.paragraph) {
      return const SizedBox(height: 8);
    }

    final indent = block.indent * 24.0;
    final base = _baseStyle(block.type, textColor, widget.isDark);
    final spans = parseInline(
      text: block.content,
      base: base,
      isDark: widget.isDark,
      onWikilink: widget.onWikilinkTap,
      onTag: widget.onTagTap,
      recognizerCollector: _recognizers,
    );
    final richText = SelectableText.rich(
      TextSpan(children: spans),
    );

    Widget content;
    switch (block.type) {
      case NoteBlockType.quote:
        content = Container(
          padding: const EdgeInsets.only(left: 14, top: 4, bottom: 4),
          decoration: const BoxDecoration(
            border: Border(left: BorderSide(color: _accentColor, width: 3)),
          ),
          child: richText,
        );
      case NoteBlockType.code:
        content = Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: widget.isDark ? Colors.black.withValues(alpha: 0.5) : Colors.grey[100],
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: widget.isDark ? Colors.white10 : Colors.black12,
            ),
          ),
          child: SelectableText(
            block.content,
            style: TextStyle(
              fontFamily: 'Courier New',
              fontSize: 13,
              color: widget.isDark ? const Color(0xFF7EE787) : const Color(0xFF24292F),
              height: 1.6,
            ),
          ),
        );
      case NoteBlockType.callout:
        content = Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: widget.isDark
                ? _accentColor.withValues(alpha: 0.07)
                : _accentColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: _accentColor.withValues(alpha: 0.3)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(block.icon, style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 10),
              Expanded(child: richText),
            ],
          ),
        );
      case NoteBlockType.bullet:
        content = Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 4, right: 8),
              child: Text('•', style: TextStyle(fontSize: 16, color: textColor)),
            ),
            Expanded(child: richText),
          ],
        );
      case NoteBlockType.numbered:
        content = Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2, right: 8),
              child: Text(
                '$numberedIdx.',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                ),
              ),
            ),
            Expanded(child: richText),
          ],
        );
      case NoteBlockType.toggle:
        content = _ToggleBlock(
          block: block,
          base: base,
          spans: spans,
          isDark: widget.isDark,
          textColor: textColor,
        );
      default:
        content = richText;
    }

    return Padding(
      padding: EdgeInsets.only(left: indent, top: 2, bottom: 2),
      child: content,
    );
  }

  TextStyle _baseStyle(NoteBlockType type, Color textColor, bool isDark) {
    switch (type) {
      case NoteBlockType.h1:
        return TextStyle(
            fontSize: 30, fontWeight: FontWeight.w700, color: textColor, height: 1.3);
      case NoteBlockType.h2:
        return TextStyle(
            fontSize: 24, fontWeight: FontWeight.w700, color: textColor, height: 1.3);
      case NoteBlockType.h3:
        return TextStyle(
            fontSize: 20, fontWeight: FontWeight.w600, color: textColor, height: 1.3);
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
}

// ─── Toggle block ─────────────────────────────────────────────────────────────

class _ToggleBlock extends StatefulWidget {
  final NoteBlock block;
  final TextStyle base;
  final List<InlineSpan> spans;
  final bool isDark;
  final Color textColor;
  const _ToggleBlock({
    required this.block,
    required this.base,
    required this.spans,
    required this.isDark,
    required this.textColor,
  });
  @override
  State<_ToggleBlock> createState() => _ToggleBlockState();
}

class _ToggleBlockState extends State<_ToggleBlock> {
  bool _open = true;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => setState(() => _open = !_open),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AnimatedRotation(
                turns: _open ? 0.25 : 0,
                duration: const Duration(milliseconds: 150),
                child: Icon(Icons.arrow_right_rounded,
                    size: 18, color: Colors.grey[500]),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: SelectableText.rich(TextSpan(children: widget.spans)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
