import 'package:flutter/material.dart';
import 'package:flutter_acrylic/flutter_acrylic.dart';
import 'package:window_manager/window_manager.dart';

/// Call once from [main] before [runApp] on desktop platforms.
Future<void> setupDesktopWindow() async {
  // Acrylic/Mica effect must be initialized before window_manager
  await Window.initialize();

  await windowManager.ensureInitialized();

  const options = WindowOptions(
    size: Size(1200, 800),
    minimumSize: Size(900, 600),
    center: true,
    title: 'JustWrite',
    titleBarStyle: TitleBarStyle.hidden, // Custom title bar in sidebar
    windowButtonVisibility: false,
    backgroundColor: Color(0x00000000), // transparent for acrylic
  );

  await windowManager.waitUntilReadyToShow(options, () async {
    // Apply Windows 11 Mica effect (falls back to acrylic on Win10)
    await Window.setEffect(
      effect: WindowEffect.mica,
      dark: true,
    );
    await windowManager.show();
    await windowManager.focus();
  });
}
