import 'dart:math';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/note.dart';
import 'package:justwrite_mobile/providers/note_provider.dart';

// ─── Graph model ──────────────────────────────────────────────────────────────

class _GraphNode {
  final Note note;
  Offset position;
  Offset velocity;
  int degree = 0;

  _GraphNode({
    required this.note,
    required this.position,
  }) : velocity = Offset.zero;
}

class _GraphEdge {
  final int fromIdx;
  final int toIdx;
  const _GraphEdge(this.fromIdx, this.toIdx);
}

// ─── Force-directed layout ────────────────────────────────────────────────────

List<_GraphNode> _buildLayout(
    List<Note> notes, List<_GraphEdge> edges, Size size) {
  final rand = Random(42);
  final cx = size.width / 2;
  final cy = size.height / 2;
  final radius = min(cx, cy) * 0.7;

  final nodes = List.generate(notes.length, (i) {
    final angle = (2 * pi * i) / max(notes.length, 1);
    return _GraphNode(
      note: notes[i],
      position: Offset(
        cx + radius * cos(angle) + rand.nextDouble() * 10 - 5,
        cy + radius * sin(angle) + rand.nextDouble() * 10 - 5,
      ),
    );
  });

  // Count degrees
  for (final e in edges) {
    nodes[e.fromIdx].degree++;
    nodes[e.toIdx].degree++;
  }

  const repulsion = 8000.0;
  const attraction = 0.05;
  const damping = 0.85;
  const centerForce = 0.008;
  const iterations = 120;

  for (int iter = 0; iter < iterations; iter++) {
    // Repulsion between all node pairs
    for (int i = 0; i < nodes.length; i++) {
      for (int j = i + 1; j < nodes.length; j++) {
        final delta = nodes[i].position - nodes[j].position;
        final dist = max(delta.distance, 0.1);
        final force = repulsion / (dist * dist);
        final dir = delta / dist;
        nodes[i].velocity += dir * force;
        nodes[j].velocity -= dir * force;
      }
    }

    // Attraction along edges
    for (final e in edges) {
      final from = nodes[e.fromIdx];
      final to = nodes[e.toIdx];
      final delta = to.position - from.position;
      final force = delta * attraction;
      from.velocity += force;
      to.velocity -= force;
    }

    // Center pull
    for (final node in nodes) {
      node.velocity +=
          (Offset(cx, cy) - node.position) * centerForce;
      node.velocity *= damping;
      node.position += node.velocity;
    }
  }

  return nodes;
}

// ─── Painter ──────────────────────────────────────────────────────────────────

class _GraphPainter extends CustomPainter {
  final List<_GraphNode> nodes;
  final List<_GraphEdge> edges;
  final bool isDark;
  final String? selectedId;

  const _GraphPainter({
    required this.nodes,
    required this.edges,
    required this.isDark,
    this.selectedId,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final edgePaint = Paint()
      ..color =
          isDark ? Colors.white.withValues(alpha: 0.12) : Colors.black.withValues(alpha: 0.12)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    // Draw edges
    for (final e in edges) {
      canvas.drawLine(
        nodes[e.fromIdx].position,
        nodes[e.toIdx].position,
        edgePaint,
      );
    }

    // Draw nodes
    for (final node in nodes) {
      final isSelected = node.note.id == selectedId;
      final radius = (12.0 + node.degree * 3.0).clamp(12.0, 28.0);
      final fillColor = isSelected
          ? const Color(0xFF00ffd5)
          : (isDark
              ? Colors.white.withValues(alpha: 0.12)
              : Colors.black.withValues(alpha: 0.07));
      final borderColor = isSelected
          ? const Color(0xFF00ffd5)
          : (isDark
              ? Colors.white.withValues(alpha: 0.25)
              : Colors.black.withValues(alpha: 0.18));

      canvas.drawCircle(
        node.position,
        radius,
        Paint()..color = fillColor,
      );
      canvas.drawCircle(
        node.position,
        radius,
        Paint()
          ..color = borderColor
          ..style = PaintingStyle.stroke
          ..strokeWidth = isSelected ? 2.0 : 1.0,
      );

      // Draw emoji icon
      final tp = TextPainter(
        text: TextSpan(
          text: node.note.icon,
          style: TextStyle(fontSize: radius * 0.75),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(
        canvas,
        node.position - Offset(tp.width / 2, tp.height / 2),
      );
    }
  }

  @override
  bool shouldRepaint(_GraphPainter old) =>
      old.selectedId != selectedId || old.isDark != isDark;
}

// ─── Graph view widget ────────────────────────────────────────────────────────

class NotesGraphView extends StatefulWidget {
  final bool isDark;
  final NoteProvider provider;

  const NotesGraphView({
    super.key,
    required this.isDark,
    required this.provider,
  });

  @override
  State<NotesGraphView> createState() => _NotesGraphViewState();
}

class _NotesGraphViewState extends State<NotesGraphView> {
  List<_GraphNode> _nodes = [];
  List<_GraphEdge> _edges = [];
  String? _hoveredId;
  final TransformationController _transformCtrl = TransformationController();

  @override
  void initState() {
    super.initState();
    _buildGraph();
  }

  @override
  void didUpdateWidget(NotesGraphView old) {
    super.didUpdateWidget(old);
    if (widget.provider.notes.length != old.provider.notes.length) {
      _buildGraph();
    }
  }

  void _buildGraph() {
    final notes = widget.provider.notes;
    if (notes.isEmpty) return;

    // Build edge list from wikilinks
    final titleToIdx = <String, int>{};
    for (int i = 0; i < notes.length; i++) {
      titleToIdx[notes[i].title.toLowerCase()] = i;
    }

    final edges = <_GraphEdge>[];
    final seen = <String>{};
    for (int i = 0; i < notes.length; i++) {
      final links = NoteProvider.extractWikilinks(notes[i]);
      for (final link in links) {
        final j = titleToIdx[link.toLowerCase()];
        if (j != null && j != i) {
          final key = '${min(i, j)}-${max(i, j)}';
          if (!seen.contains(key)) {
            seen.add(key);
            edges.add(_GraphEdge(i, j));
          }
        }
      }
    }

    const layoutSize = Size(900, 650);
    final nodes = _buildLayout(notes, edges, layoutSize);

    setState(() {
      _nodes = nodes;
      _edges = edges;
    });
  }

  int? _hitTest(Offset localPos) {
    // Account for InteractiveViewer transform
    final matrix = _transformCtrl.value;
    final inv = Matrix4.inverted(matrix);
    final transformed = MatrixUtils.transformPoint(inv, localPos);

    for (int i = 0; i < _nodes.length; i++) {
      final radius = (12.0 + _nodes[i].degree * 3.0).clamp(12.0, 28.0);
      if ((_nodes[i].position - transformed).distance <= radius + 6) {
        return i;
      }
    }
    return null;
  }

  @override
  void dispose() {
    _transformCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final selectedId = widget.provider.selectedNote?.id;
    final textColor = isDark ? Colors.white : Colors.black87;
    final mutedColor = isDark ? Colors.grey[500]! : Colors.grey[500]!;

    if (_nodes.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.hub_outlined, size: 48, color: mutedColor),
            const SizedBox(height: 12),
            Text(
              widget.provider.notes.isEmpty
                  ? 'No notes to graph yet'
                  : 'Building graph…',
              style: TextStyle(color: mutedColor, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Toolbar
        Container(
          height: 42,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Icon(Icons.hub_outlined, size: 15, color: mutedColor),
              const SizedBox(width: 6),
              Text(
                'Graph View',
                style: TextStyle(
                    fontSize: 13,
                    color: mutedColor,
                    fontWeight: FontWeight.w500),
              ),
              const Spacer(),
              Text(
                '${_nodes.length} notes · ${_edges.length} links',
                style: TextStyle(fontSize: 11, color: mutedColor),
              ),
              const SizedBox(width: 12),
              // Reset zoom
              Tooltip(
                message: 'Reset zoom',
                child: InkWell(
                  borderRadius: BorderRadius.circular(6),
                  onTap: () => _transformCtrl.value = Matrix4.identity(),
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child:
                        Icon(Icons.fit_screen_outlined, size: 15, color: mutedColor),
                  ),
                ),
              ),
            ],
          ),
        ),
        Divider(
          height: 1,
          thickness: 1,
          color: isDark
              ? Colors.white.withValues(alpha: 0.06)
              : Colors.black.withValues(alpha: 0.06),
        ),
        // Graph canvas
        Expanded(
          child: Listener(
            onPointerSignal: (e) {
              if (e is PointerScrollEvent) {
                // Handled by InteractiveViewer
              }
            },
            child: MouseRegion(
              cursor: SystemMouseCursors.grab,
              child: GestureDetector(
                onTapUp: (details) {
                  final idx = _hitTest(details.localPosition);
                  if (idx != null) {
                    widget.provider.selectNote(_nodes[idx].note.id);
                  }
                },
                child: InteractiveViewer(
                  transformationController: _transformCtrl,
                  minScale: 0.3,
                  maxScale: 3.0,
                  boundaryMargin: const EdgeInsets.all(200),
                  child: SizedBox(
                    width: 900,
                    height: 650,
                    child: Stack(
                      children: [
                        // Edge + node painter
                        CustomPaint(
                          size: const Size(900, 650),
                          painter: _GraphPainter(
                            nodes: _nodes,
                            edges: _edges,
                            isDark: isDark,
                            selectedId: selectedId,
                          ),
                        ),
                        // Invisible hit areas + labels
                        ..._nodes.asMap().entries.map((entry) {
                          final node = entry.value;
                          final radius =
                              (12.0 + node.degree * 3.0).clamp(12.0, 28.0);
                          final isSelected = node.note.id == selectedId;
                          final isHovered = node.note.id == _hoveredId;

                          return Positioned(
                            left: node.position.dx - radius - 1,
                            top: node.position.dy - radius - 1,
                            child: MouseRegion(
                              onEnter: (_) =>
                                  setState(() => _hoveredId = node.note.id),
                              onExit: (_) =>
                                  setState(() => _hoveredId = null),
                              cursor: SystemMouseCursors.click,
                              child: GestureDetector(
                                onTap: () =>
                                    widget.provider.selectNote(node.note.id),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    SizedBox(
                                      width: radius * 2 + 2,
                                      height: radius * 2 + 2,
                                    ),
                                    if (isSelected || isHovered)
                                      Container(
                                        margin: const EdgeInsets.only(top: 4),
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: isDark
                                              ? Colors.black.withValues(alpha: 0.7)
                                              : Colors.white.withValues(alpha: 0.9),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                          border: Border.all(
                                            color: isSelected
                                                ? const Color(0xFF00ffd5)
                                                    .withValues(alpha: 0.5)
                                                : (isDark
                                                    ? Colors.white12
                                                    : Colors.black12),
                                          ),
                                        ),
                                        child: Text(
                                          node.note.title.isEmpty
                                              ? 'Untitled'
                                              : node.note.title,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: isSelected
                                                ? const Color(0xFF00ffd5)
                                                : textColor,
                                            fontWeight: isSelected
                                                ? FontWeight.w600
                                                : FontWeight.w400,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
