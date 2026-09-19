import 'package:flutter/material.dart';

/// The official four-colour Google "G" mark, drawn with a [CustomPainter] so it
/// needs no image asset or SVG dependency. Coordinates are normalised from
/// Google's 48×48 brand artwork (halved to a 24×24 grid) and scaled to [size].
class GoogleLogo extends StatelessWidget {
  final double size;

  const GoogleLogo({super.key, this.size = 20});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _GoogleLogoPainter()),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width / 24;
    final double h = size.height / 24;
    final Paint paint = Paint()..isAntiAlias = true;

    // Blue (right arc + horizontal bar)
    paint.color = const Color(0xFF4285F4);
    final Path blue = Path()
      ..moveTo(23.52 * w, 12.27 * h)
      ..cubicTo(23.52 * w, 11.48 * h, 23.45 * w, 10.72 * h, 23.32 * w, 9.99 * h)
      ..lineTo(12 * w, 9.99 * h)
      ..lineTo(12 * w, 14.51 * h)
      ..lineTo(18.47 * w, 14.51 * h)
      ..cubicTo(18.18 * w, 15.99 * h, 17.34 * w, 17.25 * h, 16.07 * w, 18.09 * h)
      ..lineTo(16.07 * w, 21.09 * h)
      ..lineTo(19.93 * w, 21.09 * h)
      ..cubicTo(22.19 * w, 19.01 * h, 23.52 * w, 15.92 * h, 23.52 * w, 12.27 * h)
      ..close();
    canvas.drawPath(blue, paint);

    // Green (bottom arc)
    paint.color = const Color(0xFF34A853);
    final Path green = Path()
      ..moveTo(12 * w, 24 * h)
      ..cubicTo(15.24 * w, 24 * h, 17.95 * w, 22.92 * h, 19.93 * w, 21.09 * h)
      ..lineTo(16.07 * w, 18.09 * h)
      ..cubicTo(15 * w, 18.81 * h, 13.62 * w, 19.25 * h, 12 * w, 19.25 * h)
      ..cubicTo(8.87 * w, 19.25 * h, 6.22 * w, 17.14 * h, 5.28 * w, 14.29 * h)
      ..lineTo(1.29 * w, 14.29 * h)
      ..lineTo(1.29 * w, 17.385 * h)
      ..cubicTo(3.26 * w, 21.31 * h, 7.31 * w, 24 * h, 12 * w, 24 * h)
      ..close();
    canvas.drawPath(green, paint);

    // Yellow (left arc)
    paint.color = const Color(0xFFFBBC05);
    final Path yellow = Path()
      ..moveTo(5.28 * w, 14.29 * h)
      ..cubicTo(5.04 * w, 13.57 * h, 4.91 * w, 12.8 * h, 4.91 * w, 12 * h)
      ..cubicTo(4.91 * w, 11.2 * h, 5.04 * w, 10.43 * h, 5.28 * w, 9.71 * h)
      ..lineTo(5.28 * w, 6.615 * h)
      ..lineTo(1.29 * w, 6.615 * h)
      ..cubicTo(0.47 * w, 8.24 * h, 0 * w, 10.06 * h, 0 * w, 12 * h)
      ..cubicTo(0 * w, 13.94 * h, 0.47 * w, 15.76 * h, 1.29 * w, 17.385 * h)
      ..lineTo(5.28 * w, 14.29 * h)
      ..close();
    canvas.drawPath(yellow, paint);

    // Red (top arc)
    paint.color = const Color(0xFFEA4335);
    final Path red = Path()
      ..moveTo(12 * w, 4.75 * h)
      ..cubicTo(13.77 * w, 4.75 * h, 15.35 * w, 5.36 * h, 16.6 * w, 6.55 * h)
      ..lineTo(20.02 * w, 3.13 * h)
      ..cubicTo(17.95 * w, 1.19 * h, 15.24 * w, 0 * h, 12 * w, 0 * h)
      ..cubicTo(7.31 * w, 0 * h, 3.26 * w, 2.69 * h, 1.29 * w, 6.615 * h)
      ..lineTo(5.28 * w, 9.71 * h)
      ..cubicTo(6.22 * w, 6.86 * h, 8.87 * w, 4.75 * h, 12 * w, 4.75 * h)
      ..close();
    canvas.drawPath(red, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
