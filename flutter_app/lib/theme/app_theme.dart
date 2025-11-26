import 'package:flutter/material.dart';

class AppTheme {
  // Colors matching web app arcade theme
  static const Color bgColor = Color(0xFF0a0e27);
  static const Color fgColor = Color(0xFFffffff);
  static const Color accentCyan = Color(0xFF00ffd5);
  static const Color accentMagenta = Color(0xFFff3bff);
  static const Color accentRed = Color(0xFFff0033);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bgColor,
      primaryColor: accentCyan,
      canvasColor: bgColor,
      appBarTheme: const AppBarTheme(
        backgroundColor: bgColor,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: const TextStyle(
          color: fgColor,
          fontSize: 24,
          fontWeight: FontWeight.bold,
        ),
      ),
      textTheme: const TextTheme(
        displayLarge: const TextStyle(
          color: fgColor,
          fontSize: 32,
          fontWeight: FontWeight.bold,
        ),
        displayMedium: const TextStyle(
          color: fgColor,
          fontSize: 24,
          fontWeight: FontWeight.bold,
        ),
        displaySmall: const TextStyle(
          color: fgColor,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        bodyLarge: TextStyle(
          color: fgColor,
          fontSize: 16,
        ),
        bodyMedium: TextStyle(
          color: fgColor,
          fontSize: 14,
        ),
        bodySmall: TextStyle(
          color: Color(0xFFb0b0b0),
          fontSize: 12,
        ),
        labelLarge: TextStyle(
          color: accentCyan,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Color(0xFF1a1f3a),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: accentCyan, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: accentCyan, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: accentCyan, width: 2),
        ),
        hintStyle: const TextStyle(color: Color(0xFF7a7a7a)),
        labelStyle: const TextStyle(color: accentCyan),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accentCyan,
          foregroundColor: bgColor,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: Color(0xFF1a1f3a),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: accentCyan, width: 1),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: accentCyan,
        foregroundColor: bgColor,
      ),
      iconTheme: const IconThemeData(color: accentCyan),
    );
  }
}
