import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppTheme {
  // Minimalist color palette: White, Black, Navy Blue
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color navy = Color(0xFF1a2744);
  static const Color navyLight = Color(0xFF2d3f5f);
  static const Color navyDark = Color(0xFF0d1522);
  static const Color grey = Color(0xFF6b7280);
  static const Color greyLight = Color(0xFFe5e7eb);
  static const Color greyDark = Color(0xFF374151);
  
  // Dark mode colors
  static const Color darkBg = Color(0xFF121212);
  static const Color darkSurface = Color(0xFF1E1E1E);
  static const Color darkCard = Color(0xFF2C2C2C);

  // No animations - instant transitions
  static const Duration noAnimation = Duration.zero;
  static const Duration minimalAnimation = Duration(milliseconds: 100);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      
      // Disable all default animations for performance
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: _NoAnimationPageTransitionsBuilder(),
          TargetPlatform.iOS: _NoAnimationPageTransitionsBuilder(),
        },
      ),
      
      // Colors
      scaffoldBackgroundColor: white,
      primaryColor: navy,
      canvasColor: white,
      
      // Color scheme
      colorScheme: const ColorScheme.light(
        primary: navy,
        secondary: navyLight,
        surface: white,
        onPrimary: white,
        onSecondary: white,
        onSurface: black,
      ),
      
      // AppBar - clean and minimal
      appBarTheme: const AppBarTheme(
        backgroundColor: white,
        foregroundColor: black,
        elevation: 0,
        centerTitle: true,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        titleTextStyle: TextStyle(
          color: black,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
          letterSpacing: 2,
        ),
      ),
      
      // Text - Times New Roman (serif) for all text for consistency
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          color: black,
          fontSize: 28,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
          letterSpacing: 1,
        ),
        displayMedium: TextStyle(
          color: black,
          fontSize: 22,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
        ),
        displaySmall: TextStyle(
          color: black,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
        ),
        bodyLarge: TextStyle(
          color: black,
          fontSize: 16,
          fontWeight: FontWeight.w400,
          fontFamily: 'Times New Roman',
          height: 1.5,
        ),
        bodyMedium: TextStyle(
          color: black,
          fontSize: 14,
          fontWeight: FontWeight.w400,
          fontFamily: 'Times New Roman',
          height: 1.5,
        ),
        bodySmall: TextStyle(
          color: grey,
          fontSize: 12,
          fontWeight: FontWeight.w400,
          fontFamily: 'Times New Roman',
        ),
        labelLarge: TextStyle(
          color: navy,
          fontSize: 12,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
          letterSpacing: 1,
        ),
      ),
      
      // Input - minimal borders
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: greyLight.withValues(alpha: 0.3),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: navy, width: 1.5),
        ),
        hintStyle: TextStyle(color: grey.withValues(alpha: 0.7)),
        labelStyle: const TextStyle(color: navy),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      
      // Buttons - solid navy, minimal
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: navy,
          foregroundColor: white,
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: 1,
          ),
        ),
      ),
      
      // Cards - minimal shadow
      cardTheme: CardThemeData(
        color: white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: greyLight),
        ),
        margin: EdgeInsets.zero,
      ),
      
      // Bottom nav - clean
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: white,
        selectedItemColor: navy,
        unselectedItemColor: grey,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 11),
      ),
      
      // FAB
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: navy,
        foregroundColor: white,
        elevation: 2,
      ),
      
      // Icons
      iconTheme: const IconThemeData(color: navy, size: 22),
      
      // Tabs
      tabBarTheme: const TabBarThemeData(
        labelColor: navy,
        unselectedLabelColor: grey,
        indicatorColor: navy,
        indicatorSize: TabBarIndicatorSize.label,
        labelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 12),
      ),
      
      // Checkbox
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return navy;
          return Colors.transparent;
        }),
        checkColor: WidgetStateProperty.all(white),
        side: const BorderSide(color: grey, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
      
      // Slider
      sliderTheme: SliderThemeData(
        activeTrackColor: navy,
        inactiveTrackColor: greyLight,
        thumbColor: navy,
        overlayColor: navy.withValues(alpha: 0.1),
        trackHeight: 3,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
      ),
      
      // Divider
      dividerTheme: const DividerThemeData(
        color: greyLight,
        thickness: 1,
        space: 1,
      ),
      
      // Snackbar
      snackBarTheme: SnackBarThemeData(
        backgroundColor: navyDark,
        contentTextStyle: const TextStyle(color: white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      
      // Dialog
      dialogTheme: DialogThemeData(
        backgroundColor: white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      
      // Bottom sheet
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      
      // Progress indicator
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: navy,
        linearTrackColor: greyLight,
      ),
      
      // Popup menu
      popupMenuTheme: PopupMenuThemeData(
        color: white,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      
      // Splash - minimal
      splashColor: navy.withValues(alpha: 0.05),
      highlightColor: navy.withValues(alpha: 0.05),
      splashFactory: NoSplash.splashFactory,
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      
      // Disable all default animations for performance
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: _NoAnimationPageTransitionsBuilder(),
          TargetPlatform.iOS: _NoAnimationPageTransitionsBuilder(),
        },
      ),
      
      // Colors - pure black and white
      scaffoldBackgroundColor: black,
      primaryColor: white,
      canvasColor: black,
      
      // Color scheme - black and white only
      colorScheme: const ColorScheme.dark(
        primary: white,
        secondary: greyLight,
        surface: black,
        onPrimary: black,
        onSecondary: black,
        onSurface: white,
      ),
      
      // AppBar - pure black
      appBarTheme: const AppBarTheme(
        backgroundColor: black,
        foregroundColor: white,
        elevation: 0,
        centerTitle: true,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleTextStyle: TextStyle(
          color: white,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
          letterSpacing: 2,
        ),
      ),
      
      // Text - ALL WHITE
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          color: white,
          fontSize: 28,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
          letterSpacing: 1,
        ),
        displayMedium: TextStyle(
          color: white,
          fontSize: 22,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
        ),
        displaySmall: TextStyle(
          color: white,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
        ),
        bodyLarge: TextStyle(
          color: white,
          fontSize: 16,
          fontWeight: FontWeight.w400,
          fontFamily: 'Times New Roman',
          height: 1.5,
        ),
        bodyMedium: TextStyle(
          color: white,
          fontSize: 14,
          fontWeight: FontWeight.w400,
          fontFamily: 'Times New Roman',
          height: 1.5,
        ),
        bodySmall: TextStyle(
          color: white,
          fontSize: 12,
          fontWeight: FontWeight.w400,
          fontFamily: 'Times New Roman',
        ),
        labelLarge: TextStyle(
          color: white,
          fontSize: 12,
          fontWeight: FontWeight.w600,
          fontFamily: 'Times New Roman',
          letterSpacing: 1,
        ),
      ),
      
      // Input - dark with white text and hints
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: greyDark, width: 0.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: white, width: 1.5),
        ),
        hintStyle: const TextStyle(color: grey, fontFamily: 'Times New Roman'),
        labelStyle: const TextStyle(color: white, fontFamily: 'Times New Roman'),
        floatingLabelStyle: const TextStyle(color: white, fontFamily: 'Times New Roman'),
        prefixIconColor: white,
        suffixIconColor: white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      
      // Text selection colors for dark mode
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: white,
        selectionColor: white.withValues(alpha: 0.3),
        selectionHandleColor: white,
      ),
      
      // Buttons - white on dark
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: white,
          foregroundColor: black,
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: 1,
          ),
        ),
      ),
      
      // Cards - dark surface
      cardTheme: CardThemeData(
        color: darkCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: greyDark),
        ),
        margin: EdgeInsets.zero,
      ),
      
      // Bottom nav - white icons
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: black,
        selectedItemColor: white,
        unselectedItemColor: grey,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 11),
      ),
      
      // FAB - white
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: white,
        foregroundColor: black,
        elevation: 2,
      ),
      
      // Icons - white
      iconTheme: const IconThemeData(color: white, size: 22),
      
      // Tabs - white
      tabBarTheme: const TabBarThemeData(
        labelColor: white,
        unselectedLabelColor: grey,
        indicatorColor: white,
        indicatorSize: TabBarIndicatorSize.label,
        labelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 12),
      ),
      
      // Checkbox - white
      checkboxTheme: CheckboxThemeData(
        fillColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return white;
          return Colors.transparent;
        }),
        checkColor: WidgetStateProperty.all(black),
        side: const BorderSide(color: white, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
      
      // Slider - white
      sliderTheme: SliderThemeData(
        activeTrackColor: white,
        inactiveTrackColor: greyDark,
        thumbColor: white,
        overlayColor: white.withValues(alpha: 0.1),
        trackHeight: 3,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
      ),
      
      // Divider
      dividerTheme: const DividerThemeData(
        color: greyDark,
        thickness: 1,
        space: 1,
      ),
      
      // Snackbar
      snackBarTheme: SnackBarThemeData(
        backgroundColor: darkCard,
        contentTextStyle: const TextStyle(color: white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      
      // Dialog
      dialogTheme: DialogThemeData(
        backgroundColor: darkSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      
      // Bottom sheet
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: darkSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
      
      // Progress indicator - white
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: white,
        linearTrackColor: greyDark,
      ),
      
      // Popup menu
      popupMenuTheme: PopupMenuThemeData(
        color: darkCard,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      
      // Splash - minimal
      splashColor: white.withValues(alpha: 0.1),
      highlightColor: white.withValues(alpha: 0.1),
      splashFactory: NoSplash.splashFactory,
    );
  }
}

// No animation page transition for instant screen changes
class _NoAnimationPageTransitionsBuilder extends PageTransitionsBuilder {
  const _NoAnimationPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return child;
  }
}
