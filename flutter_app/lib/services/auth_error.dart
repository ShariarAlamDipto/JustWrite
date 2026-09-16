import 'dart:async';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

/// Turns an auth failure into something a person can act on.
///
/// This exists because the previous handling collapsed every failure into
/// "Failed to send login code", which hid a server-side email rate limit
/// (HTTP 429) behind what looked like an app bug. Supabase reports the real
/// reason in [AuthException.statusCode] and [AuthException.message]; map those
/// rather than pattern-matching on stringified exceptions.
String describeAuthError(Object error) {
  if (error is AuthException) {
    final status = error.statusCode;
    final message = error.message.toLowerCase();

    if (status == '429' || message.contains('rate limit')) {
      return 'Too many sign-in emails were requested. Please wait about an '
          'hour, or tap "Already have a code?" if you still have one.';
    }

    if (message.contains('redirect')) {
      return 'This app is not an approved sign-in destination yet. '
          'Add justwrite://login-callback to the allowed redirect URLs.';
    }

    if (message.contains('signups not allowed') ||
        message.contains('otp_disabled')) {
      return 'Email sign-in is turned off for this project.';
    }

    if (message.contains('expired')) {
      return 'That code has expired. Request a new one.';
    }

    if (message.contains('invalid') || status == '403') {
      return 'That code is not valid. Check it and try again.';
    }

    // Anything unmapped: show what the server actually said rather than a
    // generic placeholder, so a new failure mode is diagnosable from the phone.
    return error.message;
  }

  if (error is SocketException || error is TimeoutException) {
    return 'Network error. Check your internet connection.';
  }

  return 'Something went wrong signing in. Please try again.';
}
