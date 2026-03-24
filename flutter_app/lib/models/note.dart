import 'dart:convert';

// ─── Block Types ──────────────────────────────────────────────────────────────

enum NoteBlockType {
  paragraph,
  h1,
  h2,
  h3,
  bullet,
  numbered,
  toggle,
  quote,
  code,
  callout,
  divider,
}

// ─── NoteBlock ────────────────────────────────────────────────────────────────

class NoteBlock {
  final String id;
  final NoteBlockType type;
  final String content;
  final int indent;
  final bool open;
  final String icon;

  const NoteBlock({
    required this.id,
    this.type = NoteBlockType.paragraph,
    this.content = '',
    this.indent = 0,
    this.open = true,
    this.icon = '💡',
  });

  factory NoteBlock.create({NoteBlockType type = NoteBlockType.paragraph, String content = ''}) {
    return NoteBlock(
      id: _generateId(),
      type: type,
      content: content,
    );
  }

  factory NoteBlock.fromJson(Map<String, dynamic> json) {
    final typeName = json['type'] as String? ?? 'paragraph';
    final type = NoteBlockType.values.firstWhere(
      (t) => t.name == typeName,
      orElse: () => NoteBlockType.paragraph,
    );
    return NoteBlock(
      id: json['id'] as String? ?? _generateId(),
      type: type,
      content: json['content'] as String? ?? '',
      indent: json['indent'] as int? ?? 0,
      open: json['open'] as bool? ?? true,
      icon: json['icon'] as String? ?? '💡',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'content': content,
        'indent': indent,
        'open': open,
        'icon': icon,
      };

  NoteBlock copyWith({
    String? id,
    NoteBlockType? type,
    String? content,
    int? indent,
    bool? open,
    String? icon,
  }) =>
      NoteBlock(
        id: id ?? this.id,
        type: type ?? this.type,
        content: content ?? this.content,
        indent: indent ?? this.indent,
        open: open ?? this.open,
        icon: icon ?? this.icon,
      );

  static String _generateId() {
    final now = DateTime.now().microsecondsSinceEpoch;
    return now.toRadixString(36);
  }
}

// ─── Note ─────────────────────────────────────────────────────────────────────

class Note {
  final String id;
  final String userId;
  final String title;
  final String icon;
  final List<NoteBlock> blocks;
  final bool isPinned;
  final bool isLocked;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Note({
    required this.id,
    required this.userId,
    required this.title,
    this.icon = '📝',
    required this.blocks,
    this.isPinned = false,
    this.isLocked = false,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Note.fromJson(Map<String, dynamic> json) {
    List<NoteBlock> blocks = [];
    final rawBlocks = json['blocks'];
    if (rawBlocks is List) {
      blocks = rawBlocks
          .whereType<Map>()
          .map((b) => NoteBlock.fromJson(Map<String, dynamic>.from(b)))
          .toList();
    } else if (rawBlocks is String && rawBlocks.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawBlocks);
        if (decoded is List) {
          blocks = decoded
              .whereType<Map>()
              .map((b) => NoteBlock.fromJson(Map<String, dynamic>.from(b)))
              .toList();
        }
      } catch (_) {}
    }
    final now = DateTime.now();
    DateTime parseDate(dynamic raw, DateTime fallback) {
      if (raw is String && raw.isNotEmpty) {
        try {
          return DateTime.parse(raw);
        } catch (_) {
          return fallback;
        }
      }
      return fallback;
    }

    return Note(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] as String? ?? 'Untitled',
      icon: json['icon'] as String? ?? '📝',
      blocks: blocks,
      isPinned: json['is_pinned'] as bool? ?? false,
      isLocked: json['is_locked'] as bool? ?? false,
      createdAt: parseDate(json['created_at'], now),
      updatedAt: parseDate(json['updated_at'], now),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'title': title,
        'icon': icon,
        'blocks': blocks.map((b) => b.toJson()).toList(),
        'is_pinned': isPinned,
        'is_locked': isLocked,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };

  Note copyWith({
    String? id,
    String? userId,
    String? title,
    String? icon,
    List<NoteBlock>? blocks,
    bool? isPinned,
    bool? isLocked,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      Note(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        title: title ?? this.title,
        icon: icon ?? this.icon,
        blocks: blocks ?? this.blocks,
        isPinned: isPinned ?? this.isPinned,
        isLocked: isLocked ?? this.isLocked,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  /// Snippet for sidebar preview
  String get snippet {
    for (final block in blocks) {
      if (block.content.trim().isNotEmpty) {
        return block.content.trim();
      }
    }
    return 'No additional text';
  }
}
