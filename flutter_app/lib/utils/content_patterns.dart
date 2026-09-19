/// Shared inline-syntax patterns for notes.
///
/// The editor, reading view, provider, and service all recognise the same
/// `#tag` and `[[wikilink]]` syntax. Keeping the regexes here stops the four
/// copies from drifting apart. Unicode-aware so non-ASCII tags such as `#café`
/// or `#日本語` are matched (plain `\w` is ASCII-only in Dart).
class ContentPatterns {
  ContentPatterns._();

  /// `[[wikilink]]` — captures the inner title in group 1.
  static final RegExp wikilink = RegExp(r'\[\[([^\]]+)\]\]');

  /// `#tag` — captures the tag (without `#`) in group 1. Unicode letters,
  /// numbers, and underscore are allowed.
  static final RegExp tag = RegExp(r'#([\p{L}\p{N}_]+)', unicode: true);

  /// An unterminated `[[query` at the end of a string — used to drive the
  /// wikilink autocomplete popup while typing.
  static final RegExp wikilinkTypeahead = RegExp(r'\[\[([^\]]*)$');
}
