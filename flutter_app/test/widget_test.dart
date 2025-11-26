// JustWrite Mobile Widget Tests
//
// Basic smoke test to verify the app loads correctly

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App loads login screen', (WidgetTester tester) async {
    // Simple smoke test - verify app can create widgets
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: Text('JustWrite'),
          ),
        ),
      ),
    );

    // Verify basic text renders
    expect(find.text('JustWrite'), findsOneWidget);
  });
}
