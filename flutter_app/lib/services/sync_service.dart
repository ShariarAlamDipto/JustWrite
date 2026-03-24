import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import 'package:supabase_flutter/supabase_flutter.dart';

/// Sync status for UI binding
enum SyncStatus { idle, syncing, synced, error, offline }

/// Lightweight offline-first sync layer.
///
/// Strategy:
///   • Writes go to local SQLite immediately (optimistic).
///   • A background loop pushes pending changes to Supabase when online.
///   • On startup, pulls remote changes newer than [_lastSyncAt].
///
/// Tables mirrored locally:
///   • entries  (journal + brainstorm)
///   • notes
class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  Database? _db;
  Timer? _syncTimer;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  final _statusController = StreamController<SyncStatus>.broadcast();
  Stream<SyncStatus> get status => _statusController.stream;
  SyncStatus _currentStatus = SyncStatus.idle;

  bool _isOnline = true;
  DateTime? _lastSyncAt;

  // ── Initialization ──────────────────────────────────────────────────────

  Future<void> initialize() async {
    _db = await _openDatabase();
    _connectivitySub = Connectivity().onConnectivityChanged.listen(_onConnectivityChanged);

    final result = await Connectivity().checkConnectivity();
    _isOnline = !result.contains(ConnectivityResult.none);

    // Kick off initial sync when online
    if (_isOnline) {
      unawaited(_runSync());
    }

    // Periodic background sync every 5 minutes
    _syncTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      if (_isOnline) unawaited(_runSync());
    });
  }

  void dispose() {
    _syncTimer?.cancel();
    _connectivitySub?.cancel();
    _statusController.close();
    _db?.close();
  }

  // ── Local write helpers (called by providers) ───────────────────────────

  /// Upsert an entry into the local queue and DB.
  Future<void> queueEntry(Map<String, dynamic> entry) async {
    final db = await _getDb();
    await db.insert(
      'entries_queue',
      {
        'id': entry['id'],
        'payload': jsonEncode(entry),
        'operation': entry['_deleted'] == true ? 'delete' : 'upsert',
        'queued_at': DateTime.now().toIso8601String(),
        'synced': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    debugPrint('[SyncService] Queued entry ${entry['id']}');
    if (_isOnline) unawaited(_runSync());
  }

  /// Upsert a note into the local queue and DB.
  Future<void> queueNote(Map<String, dynamic> note) async {
    final db = await _getDb();
    await db.insert(
      'notes_queue',
      {
        'id': note['id'],
        'payload': jsonEncode(note),
        'operation': note['_deleted'] == true ? 'delete' : 'upsert',
        'queued_at': DateTime.now().toIso8601String(),
        'synced': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    debugPrint('[SyncService] Queued note ${note['id']}');
    if (_isOnline) unawaited(_runSync());
  }

  // ── Pull: remote → local ────────────────────────────────────────────────

  Future<void> pullRemoteChanges() async {
    final supabase = Supabase.instance.client;
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;

    final since = _lastSyncAt?.toIso8601String();

    try {
      // Pull entries
      var entriesQuery = supabase
          .from('entries')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(500);

      if (since != null) {
        entriesQuery = entriesQuery.gte('updated_at', since) as dynamic;
      }

      final entries = await entriesQuery as List<dynamic>;
      final db = await _getDb();

      for (final row in entries) {
        await db.insert(
          'entries_cache',
          {
            'id': row['id'],
            'payload': jsonEncode(row),
            'updated_at': row['updated_at'] ?? row['created_at'],
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }

      // Pull notes
      var notesQuery = supabase
          .from('notes')
          .select()
          .eq('user_id', userId)
          .order('updated_at', ascending: false)
          .limit(200);

      if (since != null) {
        notesQuery = notesQuery.gte('updated_at', since) as dynamic;
      }

      final notes = await notesQuery as List<dynamic>;
      for (final row in notes) {
        await db.insert(
          'notes_cache',
          {
            'id': row['id'],
            'payload': jsonEncode(row),
            'updated_at': row['updated_at'] ?? row['created_at'],
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }

      debugPrint('[SyncService] Pulled ${entries.length} entries, ${notes.length} notes');
    } catch (e) {
      debugPrint('[SyncService] Pull error: $e');
    }
  }

  // ── Push: local queue → remote ──────────────────────────────────────────

  Future<void> _pushPendingEntries() async {
    final db = await _getDb();
    final supabase = Supabase.instance.client;
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;

    final pending = await db.query(
      'entries_queue',
      where: 'synced = 0',
      orderBy: 'queued_at ASC',
      limit: 50,
    );

    for (final row in pending) {
      final id = row['id'] as String;
      final operation = row['operation'] as String;
      final payload = jsonDecode(row['payload'] as String) as Map<String, dynamic>;
      payload.remove('_deleted');

      try {
        if (operation == 'delete') {
          await supabase.from('entries').delete().eq('id', id).eq('user_id', userId);
        } else {
          await supabase.from('entries').upsert(payload);
        }
        await db.update('entries_queue', {'synced': 1}, where: 'id = ?', whereArgs: [id]);
        debugPrint('[SyncService] Pushed entry $id ($operation)');
      } catch (e) {
        debugPrint('[SyncService] Push entry $id failed: $e');
      }
    }
  }

  Future<void> _pushPendingNotes() async {
    final db = await _getDb();
    final supabase = Supabase.instance.client;
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;

    final pending = await db.query(
      'notes_queue',
      where: 'synced = 0',
      orderBy: 'queued_at ASC',
      limit: 50,
    );

    for (final row in pending) {
      final id = row['id'] as String;
      final operation = row['operation'] as String;
      final payload = jsonDecode(row['payload'] as String) as Map<String, dynamic>;
      payload.remove('_deleted');

      try {
        if (operation == 'delete') {
          await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
        } else {
          await supabase.from('notes').upsert(payload);
        }
        await db.update('notes_queue', {'synced': 1}, where: 'id = ?', whereArgs: [id]);
        debugPrint('[SyncService] Pushed note $id ($operation)');
      } catch (e) {
        debugPrint('[SyncService] Push note $id failed: $e');
      }
    }
  }

  // ── Sync orchestration ──────────────────────────────────────────────────

  Future<void> _runSync() async {
    if (_currentStatus == SyncStatus.syncing) return;
    _setStatus(SyncStatus.syncing);

    try {
      await _pushPendingEntries();
      await _pushPendingNotes();
      await pullRemoteChanges();
      _lastSyncAt = DateTime.now();
      _setStatus(SyncStatus.synced);
    } catch (e) {
      debugPrint('[SyncService] Sync error: $e');
      _setStatus(SyncStatus.error);
    }
  }

  /// Force an immediate sync (e.g., on app foreground).
  Future<void> syncNow() async {
    if (_isOnline) await _runSync();
  }

  // ── Connectivity ────────────────────────────────────────────────────────

  void _onConnectivityChanged(List<ConnectivityResult> results) {
    final wasOnline = _isOnline;
    _isOnline = !results.contains(ConnectivityResult.none);
    if (!wasOnline && _isOnline) {
      debugPrint('[SyncService] Back online — running sync');
      unawaited(_runSync());
    } else if (!_isOnline) {
      _setStatus(SyncStatus.offline);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  void _setStatus(SyncStatus s) {
    _currentStatus = s;
    _statusController.add(s);
  }

  Future<Database> _getDb() async => _db ??= await _openDatabase();

  Future<Database> _openDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'justwrite_sync.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        // Outbound queues
        await db.execute('''
          CREATE TABLE entries_queue (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            operation TEXT NOT NULL DEFAULT 'upsert',
            queued_at TEXT NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE notes_queue (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            operation TEXT NOT NULL DEFAULT 'upsert',
            queued_at TEXT NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
          )
        ''');
        // Read-through caches (last-seen remote state)
        await db.execute('''
          CREATE TABLE entries_cache (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updated_at TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE notes_cache (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updated_at TEXT
          )
        ''');
        debugPrint('[SyncService] Sync database created');
      },
    );
  }

  /// Read cached entries from local DB (used when offline).
  Future<List<Map<String, dynamic>>> getCachedEntries() async {
    final db = await _getDb();
    final rows = await db.query('entries_cache', orderBy: 'updated_at DESC');
    return rows
        .map((r) => jsonDecode(r['payload'] as String) as Map<String, dynamic>)
        .toList();
  }

  /// Read cached notes from local DB (used when offline).
  Future<List<Map<String, dynamic>>> getCachedNotes() async {
    final db = await _getDb();
    final rows = await db.query('notes_cache', orderBy: 'updated_at DESC');
    return rows
        .map((r) => jsonDecode(r['payload'] as String) as Map<String, dynamic>)
        .toList();
  }
}
