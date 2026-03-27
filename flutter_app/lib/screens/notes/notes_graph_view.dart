import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:justwrite_mobile/models/note.dart';
import 'package:justwrite_mobile/providers/note_provider.dart';

// ─── Background isolate worker ────────────────────────────────────────────────
// Top-level function so compute() can spawn it in a separate Dart isolate.
// Returns flattened [x0,y0, x1,y1, ...] positions + degree list.
Map<String, dynamic> _layoutWorker(Map<String, dynamic> params) {
  final nodeCount = params['nodeCount'] as int;
  final edgeFrom = List<int>.from(params['edgeFrom'] as List);
  final edgeTo = List<int>.from(params['edgeTo'] as List);
  final width = params['width'] as double;
  final height = params['height'] as double;

  if (nodeCount == 0) return {'positions': <double>[], 'degrees': <int>[]};

  final rand = Random(42);
  final cx = width / 2;
  final cy = height / 2;
  final radius = min(cx, cy) * 0.7;

  final x = List.generate(nodeCount, (i) {
    final angle = (2 * pi * i) / nodeCount;
    return cx + radius * cos(angle) + rand.nextDouble() * 10 - 5;
  });
  final y = List.generate(nodeCount, (i) {
    final angle = (2 * pi * i) / nodeCount;
    return cy + radius * sin(angle) + rand.nextDouble() * 10 - 5;
  });
  final vx = List.filled(nodeCount, 0.0);
  final vy = List.filled(nodeCount, 0.0);
  final degrees = List.filled(nodeCount, 0);

  for (int i = 0; i < edgeFrom.length; i++) {
    degrees[edgeFrom[i]]++;
    degrees[edgeTo[i]]++;
  }

  const repulsion = 8000.0;
  const attraction = 0.05;
  const damping = 0.85;
  const centerForce = 0.008;
  const iterations = 120;

  for (int iter = 0; iter < iterations; iter++) {
    for (int i = 0; i < nodeCount; i++) {
      for (int j = i + 1; j < nodeCount; j++) {
        final dx = x[i] - x[j];
        final dy = y[i] - y[j];
        final dist = max(sqrt(dx * dx + dy * dy), 0.1);
        final force = repulsion / (dist * dist);
        vx[i] += dx / dist * force;
        vy[i] += dy / dist * force;
        vx[j] -= dx / dist * force;
        vy[j] -= dy / dist * force;
      }
    }
    for (int e = 0; e < edgeFrom.length; e++) {
      final fi = edgeFrom[e];
      final ti = edgeTo[e];
      final dx = x[ti] - x[fi];
      final dy = y[ti] - y[fi];
      vx[fi] += dx * attraction;
      vy[fi] += dy * attraction;
      vx[ti] -= dx * attraction;
      vy[ti] -= dy * attraction;
    }
    for (int i = 0; i < nodeCount; i++) {
      vx[i] = (vx[i] + (cx - x[i]) * centerForce) * damping;
      vy[i] = (vy[i] + (cy - y[i]) * centerForce) * damping;
      x[i] += vx[i];
      y[i] += vy[i];
    }
  }

  final positions = <double>[];
  for (int i = 0; i < nodeCount; i++) {
    positions.add(x[i]);
    positions.add(y[i]);
  }
  return {'positions': positions, 'degrees': degrees};
}

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

  Future<void> _buildGraph() async {
    final notes = widget.provider.notes;
    if (notes.isEmpty) return;

    // Build edge list from wikilinks (fast — stays on main thread)
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

    // Run the O(n²) force simulation in a background isolate to avoid jank
    final result = await compute(_layoutWorker, {
      'nodeCount': notes.length,
      'edgeFrom': edges.map((e) => e.fromIdx).toList(),
      'edgeTo': edges.map((e) => e.toIdx).toList(),
      'width': 900.0,
      'height': 650.0,
    });

    if (!mounted) return;

    final positions = List<double>.from(result['positions'] as List);
    final degrees = List<int>.from(result['degrees'] as List);

    final nodes = List.generate(notes.length, (i) {
      final node = _GraphNode(
        note: notes[i],
        position: Offset(positions[i * 2], positions[i * 2 + 1]),
      );
      node.degree = degrees[i];
      return node;
    });

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
