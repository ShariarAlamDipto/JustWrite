import { createClient } from '@supabase/supabase-js';

// Use Supabase for persistent storage (works on Vercel serverless)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// SECURITY: Use service role key for server-side operations only (never expose to client)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Prefer service role key which bypasses RLS
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

// Fail fast if Supabase is not configured (avoids silent null-client errors)
if (!supabaseUrl || !supabaseKey) {
  console.error('[storage] Supabase URL or key is missing Ã¢â‚¬â€ database calls will fail');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

function getUserScopedClient(accessToken?: string) {
  if (!supabaseUrl) return null;

  // Service role bypasses RLS and is preferred for server-side jobs.
  if (supabaseServiceKey) return supabase;

  if (!supabaseAnonKey) return null;
  if (!accessToken) return supabase;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// In-memory fallback for development without Supabase
let memoryDb: { entries: any[]; tasks: any[] } = { entries: [], tasks: [] };

// Track if is_locked column exists (checked on first query)
let isLockedColumnExists: boolean | null = null;

// Check if is_locked column exists in the database
async function checkIsLockedColumn(): Promise<boolean> {
  if (isLockedColumnExists !== null) return isLockedColumnExists;
  if (!supabase) return true; // Memory mode supports it
  
  try {
    // Try a simple query with is_locked filter
    const { error } = await supabase
      .from('entries')
      .select('id')
      .eq('is_locked', false)
      .limit(1);
    
    isLockedColumnExists = !error || !error.message.includes('is_locked');
    if (!isLockedColumnExists) {
      console.warn('is_locked column not found. Run supabase_custom_prompts.sql to enable private journal.');
    }
    return isLockedColumnExists;
  } catch {
    return false;
  }
}

// SECURITY: All queries now filter by user_id to prevent data leakage
export async function listEntries(
  userId?: string,
  options?: { locked?: boolean; limit?: number; since?: string; cursor?: string }
) {
  const safeLimit = Math.max(1, Math.min(200, options?.limit ?? 100));

  if (supabase) {
    let query = supabase
      .from('entries')
      .select('id,content,source,created_at,updated_at,mood,is_locked,is_private,title,user_id,summary,word_count,tags')
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    // SECURITY: Filter by user_id when provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Filter by locked status when requested
    if (options?.locked !== undefined) {
      query = query.eq('is_locked', options.locked);
    }

    if (options?.since) {
      query = query.or(`updated_at.gte.${options.since},created_at.gte.${options.since}`);
    }

    if (options?.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase listEntries error:', error.message);
      return [];
    }
    return data || [];
  }

  let results = userId
    ? memoryDb.entries.filter((e: any) => e.user_id === userId)
    : memoryDb.entries;

  if (options?.locked !== undefined) {
    results = results.filter((e: any) => e.is_locked === options.locked);
  }

  if (options?.since) {
    const sinceMs = new Date(options.since).getTime();
    results = results.filter((e: any) => {
      const updatedMs = e.updated_at ? new Date(e.updated_at).getTime() : 0;
      const createdMs = e.created_at ? new Date(e.created_at).getTime() : 0;
      return updatedMs >= sinceMs || createdMs >= sinceMs;
    });
  }

  if (options?.cursor) {
    const cursorMs = new Date(options.cursor).getTime();
    results = results.filter((e: any) => new Date(e.created_at).getTime() < cursorMs);
  }

  return [...results]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, safeLimit);
}

// SECURITY: Include user_id in entry creation
export async function createEntry({ content, source = 'text', created_at, user_id, mood, is_locked }: any) {
  const hasLockedColumn = await checkIsLockedColumn();
  
  // Build entry object, only include is_locked if column exists
  const entry: any = {
    id: crypto.randomUUID(),
    content,
    source,
    user_id: user_id || null, // SECURITY: Associate entry with user
    created_at: created_at || new Date().toISOString(),
    mood: mood !== undefined ? mood : null,
    summary: null,
    ai_metadata: null
  };
  
  // Only include is_locked field if database supports it
  if (hasLockedColumn) {
    entry.is_locked = is_locked || false;
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('entries')
      .insert(entry)
      .select()
      .single();
    if (error) {
      console.error('Supabase createEntry error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }
  
  // In memory mode, always support is_locked
  entry.is_locked = is_locked || false;
  memoryDb.entries.unshift(entry);
  return entry;
}
// SECURITY: Verify entry belongs to user before returning
export async function getEntryById(id: string, userId?: string) {
  if (supabase) {
    let query = supabase
      .from('entries')
      .select('*')
      .eq('id', id);
    
    // SECURITY: Verify ownership
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.single();
    if (error) return null;
    return data;
  }
  const entry = memoryDb.entries.find((e: any) => e.id === id);
  // SECURITY: Verify ownership in memory mode
  if (entry && userId && entry.user_id !== userId) return null;
  return entry;
}

// SECURITY: Verify ownership before updating
export async function updateEntrySummary(id: string, summary: string, ai_metadata: any, userId?: string) {
  if (supabase) {
    let query = supabase
      .from('entries')
      .update({ summary, ai_metadata })
      .eq('id', id);
    
    // SECURITY: Verify ownership
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  
  const idx = memoryDb.entries.findIndex((e: any) => e.id === id && (!userId || e.user_id === userId));
  if (idx === -1) throw new Error('entry not found or access denied');
  memoryDb.entries[idx].summary = summary;
  memoryDb.entries[idx].ai_metadata = ai_metadata;
  return memoryDb.entries[idx];
}

// SECURITY: General entry update with ownership verification
export async function updateEntry(id: string, updates: any, userId?: string) {
  if (supabase) {
    let query = supabase
      .from('entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    // SECURITY: Verify ownership
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  
  const idx = memoryDb.entries.findIndex((e: any) => e.id === id && (!userId || e.user_id === userId));
  if (idx === -1) throw new Error('entry not found or access denied');
  memoryDb.entries[idx] = { ...memoryDb.entries[idx], ...updates, updated_at: new Date().toISOString() };
  return memoryDb.entries[idx];
}

// SECURITY: Delete entry with ownership verification
export async function deleteEntry(id: string, userId?: string) {
  if (supabase) {
    // Delete with user_id scope Ã¢â‚¬â€ never rely on a pre-fetch ownership check alone
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId as string);

    if (error) {
      throw new Error(error.message);
    }
    return true;
  }
  
  const idx = memoryDb.entries.findIndex((e: any) => e.id === id && (!userId || e.user_id === userId));
  if (idx === -1) throw new Error('entry not found or access denied');
  memoryDb.entries.splice(idx, 1);
  return true;
}

// SECURITY: Filter tasks by user_id
export async function listTasks(
  userId?: string,
  options?: { limit?: number; since?: string; cursor?: string }
) {
  const safeLimit = Math.max(1, Math.min(200, options?.limit ?? 100));

  if (supabase) {
    let query = supabase
      .from('tasks')
      .select('id,title,description,priority,status,entry_id,user_id,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    // SECURITY: Filter by user_id when provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (options?.since) {
      query = query.or(`updated_at.gte.${options.since},created_at.gte.${options.since}`);
    }

    if (options?.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase listTasks error:', error.message);
      return [];
    }
    return data || [];
  }

  let results = userId
    ? memoryDb.tasks.filter((t: any) => t.user_id === userId)
    : memoryDb.tasks;

  if (options?.since) {
    const sinceMs = new Date(options.since).getTime();
    results = results.filter((t: any) => {
      const updatedMs = t.updated_at ? new Date(t.updated_at).getTime() : 0;
      const createdMs = t.created_at ? new Date(t.created_at).getTime() : 0;
      return updatedMs >= sinceMs || createdMs >= sinceMs;
    });
  }

  if (options?.cursor) {
    const cursorMs = new Date(options.cursor).getTime();
    results = results.filter((t: any) => new Date(t.created_at).getTime() < cursorMs);
  }

  return [...results]
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, safeLimit);
}

export async function getTaskById(id: string, userId?: string) {
  if (supabase) {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();
    if (error) return null;
    return data;
  }

  const task = memoryDb.tasks.find((t: any) => t.id === id);
  if (task && userId && task.user_id !== userId) return null;
  return task || null;
}

// SECURITY: Include user_id in task creation
export async function createTask(task: any) {
  const t = {
    id: crypto.randomUUID(),
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'medium',
    status: task.status || 'todo',
    entry_id: task.entry_id || null,
    user_id: task.user_id || null, // SECURITY: Associate task with user
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(t)
      .select()
      .single();
    if (error) {
      console.error('Supabase createTask error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }
  
  memoryDb.tasks.unshift(t);
  return t;
}

// OPTIMIZED: Bulk insert tasks in single DB call
export async function createTasksBulk(tasks: any[], entryId?: string, userId?: string) {
  if (!tasks.length) return [];
  
  const tasksToInsert = tasks.map(t => ({
    id: crypto.randomUUID(),
    title: t.title || '',
    description: t.description || '',
    priority: t.priority || 'medium',
    status: t.status || 'todo',
    entry_id: entryId || t.entry_id || null,
    user_id: userId || t.user_id || null,
    created_at: new Date().toISOString()
  }));

  if (supabase) {
    // Single bulk insert instead of loop
    const { data, error } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select();
    
    if (error) {
      console.error('Supabase createTasksBulk error:', error.message);
      throw new Error(error.message);
    }
    return data || [];
  }
  
  // Memory fallback
  memoryDb.tasks.unshift(...tasksToInsert);
  return tasksToInsert;
}

// SECURITY: Verify ownership before updating task
export async function updateTask(id: string, patch: any, userId?: string) {
  if (supabase) {
    let query = supabase
      .from('tasks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    // SECURITY: Verify ownership
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  
  const idx = memoryDb.tasks.findIndex((t: any) => t.id === id && (!userId || t.user_id === userId));
  if (idx === -1) throw new Error('task not found or access denied');
  memoryDb.tasks[idx] = { ...memoryDb.tasks[idx], ...patch, updated_at: new Date().toISOString() };
  return memoryDb.tasks[idx];
}

// SECURITY: Verify ownership before deleting task
export async function deleteTask(id: string, userId?: string) {
  if (supabase) {
    let query = supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    // SECURITY: Verify ownership
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { error } = await query;
    if (error) throw new Error(error.message);
    return true;
  }
  
  const idx = memoryDb.tasks.findIndex((t: any) => t.id === id && (!userId || t.user_id === userId));
  if (idx === -1) throw new Error('task not found or access denied');
  memoryDb.tasks.splice(idx, 1);
  return true;
}

// ============= CUSTOM PROMPTS =============

// In-memory store for custom prompts (development fallback)
let memoryPrompts: any[] = [];

// List custom prompts for a user
export async function listCustomPrompts(userId: string) {
  if (supabase) {
    const { data, error } = await supabase
      .from('custom_prompts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase listCustomPrompts error:', error.message);
      return [];
    }
    return data || [];
  }
  
  return memoryPrompts.filter(p => p.user_id === userId);
}

// Create a custom prompt
export async function createCustomPrompt({ text, category, user_id }: { text: string; category: string; user_id: string }) {
  const prompt = {
    id: crypto.randomUUID(),
    text,
    category,
    user_id,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('custom_prompts')
      .insert(prompt)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase createCustomPrompt error:', error.message);
      throw new Error(error.message);
    }
    return data;
  }
  
  memoryPrompts.unshift(prompt);
  return prompt;
}

// Delete a custom prompt
export async function deleteCustomPrompt(id: string, userId: string) {
  if (supabase) {
    const { error } = await supabase
      .from('custom_prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return true;
  }

  const idx = memoryPrompts.findIndex(p => p.id === id && p.user_id === userId);
  if (idx === -1) throw new Error('prompt not found or access denied');
  memoryPrompts.splice(idx, 1);
  return true;
}

// ============= NOTES (Notion-style second brain) =============

let memoryNotes: any[] = [];

function extractMissingColumnFromMessage(message: string): string | null {
  const quoted = message.match(/column\s+"([^"]+)"\s+does not exist/i);
  if (quoted?.[1]) return quoted[1];

  const bare = message.match(/column\s+([a-zA-Z0-9_]+)\s+does not exist/i);
  if (bare?.[1]) return bare[1];

  return null;
}

function isMissingColumnErrorMessage(message: string): boolean {
  return /column\s+.*\s+does not exist/i.test(message);
}

export async function listNotes(userId: string, parentId?: string | null, accessToken?: string) {
  const client = getUserScopedClient(accessToken);
  if (client) {
    let query = client
      .from('notes')
      .select('id, title, icon, cover_url, parent_id, is_locked, is_pinned, created_at, updated_at')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (parentId !== undefined) {
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase listNotes error:', error.message);
      return [];
    }
    return data || [];
  }

  return memoryNotes
    .filter(n => n.user_id === userId && (parentId === undefined || n.parent_id === parentId))
    .map(({ blocks: _b, ...rest }) => rest);
}

export async function getNoteById(id: string, userId: string, accessToken?: string) {
  const client = getUserScopedClient(accessToken);
  if (client) {
    const { data, error } = await client
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data;
  }
  return memoryNotes.find(n => n.id === id && n.user_id === userId) || null;
}

export async function createNote({ user_id, title = 'Untitled', icon, cover_url, blocks = [], parent_id, accessToken }: any) {
  const note = {
    id: crypto.randomUUID(),
    user_id,
    title,
    icon: icon || null,
    cover_url: cover_url || null,
    blocks,
    parent_id: parent_id || null,
    is_locked: false,
    is_pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const client = getUserScopedClient(accessToken);
  if (client) {
    let payload: Record<string, unknown> = { ...note };
    let triedPortableFallback = false;

    for (let i = 0; i < 10; i++) {
      const { data, error } = await client
        .from('notes')
        .insert(payload)
        .select()
        .single();

      if (!error) return data;

      const message = String(error.message || 'Unknown notes insert error');
      const missingColumn = extractMissingColumnFromMessage(message);

      if (missingColumn && missingColumn in payload) {
        const { [missingColumn]: _removed, ...rest } = payload;
        payload = rest;
        continue;
      }

      if (!triedPortableFallback && isMissingColumnErrorMessage(message)) {
        triedPortableFallback = true;
        payload = {
          user_id,
          title,
        };
        continue;
      }

      throw new Error(message);
    }

    throw new Error('Unable to create note with current database schema');
  }

  memoryNotes.unshift(note);
  return note;
}

export async function updateNote(id: string, updates: any, userId: string, accessToken?: string) {
  const allowed = ['title', 'icon', 'cover_url', 'blocks', 'parent_id', 'is_locked', 'is_pinned'];
  const patch: any = {};
  for (const key of allowed) {
    if (key in updates) patch[key] = updates[key];
  }

  const client = getUserScopedClient(accessToken);
  if (client) {
    const { data, error } = await client
      .from('notes')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const idx = memoryNotes.findIndex(n => n.id === id && n.user_id === userId);
  if (idx === -1) throw new Error('note not found or access denied');
  memoryNotes[idx] = { ...memoryNotes[idx], ...patch, updated_at: new Date().toISOString() };
  return memoryNotes[idx];
}

export async function deleteNote(id: string, userId: string, accessToken?: string) {
  const client = getUserScopedClient(accessToken);
  if (client) {
    const { error } = await client
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return true;
  }

  const idx = memoryNotes.findIndex(n => n.id === id && n.user_id === userId);
  if (idx === -1) throw new Error('note not found or access denied');
  memoryNotes.splice(idx, 1);
  return true;
}

// ============= KEYWORDS =============

export async function upsertKeywords(userId: string, words: string[]): Promise<string[]> {
  if (!words.length) return [];
  const normalized = [...new Set(words.map(w => w.toLowerCase().trim()).filter(w => w.length > 2))];

  if (supabase) {
    const rows = normalized.map(word => ({ user_id: userId, word }));
    const { data, error } = await supabase
      .from('keywords')
      .upsert(rows, { onConflict: 'user_id,word', ignoreDuplicates: false })
      .select('id');
    if (error) {
      console.error('upsertKeywords error:', error.message);
      return [];
    }
    return (data || []).map((r: any) => r.id);
  }
  return [];
}

export async function linkEntryKeywords(entryId: string, keywordIds: string[]) {
  if (!supabase || !keywordIds.length) return;
  const rows = keywordIds.map(keyword_id => ({ entry_id: entryId, keyword_id }));
  await supabase.from('entry_keywords').upsert(rows, { ignoreDuplicates: true });
}

export async function linkNoteKeywords(noteId: string, keywordIds: string[]) {
  if (!supabase || !keywordIds.length) return;
  const rows = keywordIds.map(keyword_id => ({ note_id: noteId, keyword_id }));
  await supabase.from('note_keywords').upsert(rows, { ignoreDuplicates: true });
}

// ============= GRAPH DATA =============

// Knowledge graph Ã¢â‚¬â€ Notes-only second brain view.
// Includes: note nodes, shared keyword nodes, wikilink edges, keyword edges.
// Intentionally excludes journal entries, tasks, and voice entries.
export async function getGraphData(userId: string) {
  if (!supabase) return { nodes: [], links: [] };

  const [notesRes, noteKwRes, kwRes, wikilinksRes] = await Promise.all([
    supabase
      .from('notes')
      .select('id, title, icon, created_at, updated_at, blocks')
      .eq('user_id', userId)
      .limit(500),
    supabase
      .from('note_keywords')
      .select('note_id, keyword_id'),
    supabase
      .from('keywords')
      .select('id, word')
      .eq('user_id', userId),
    // Wikilink edges between notes
    supabase
      .from('content_links')
      .select('from_id, to_id')
      .eq('user_id', userId)
      .eq('link_type', 'wikilink'),
  ]);

  const notes    = notesRes.data    || [];
  const noteKws  = noteKwRes.data   || [];
  const keywords = kwRes.data       || [];
  const wikilinks = wikilinksRes.data || [];

  // Only surface keywords shared by 2+ notes
  const kwUsage: Record<string, number> = {};
  for (const nk of noteKws) kwUsage[nk.keyword_id] = (kwUsage[nk.keyword_id] || 0) + 1;
  const sharedKwIds = new Set(
    Object.entries(kwUsage).filter(([, c]) => c >= 2).map(([id]) => id)
  );

  // Build a note id set for link validation
  const noteIds = new Set(notes.map((n: Record<string, any>) => n.id as string));

  type Row = Record<string, any>;

  const nodes: any[] = [
    ...notes.map((n: Row) => ({
      id: `note-${n.id}`,
      rawId: n.id,
      type: 'note',
      label: n.title || 'Untitled',
      icon: n.icon,
      blockCount: Array.isArray(n.blocks) ? (n.blocks as unknown[]).length : 0,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })),
    ...keywords
      .filter((k: Row) => sharedKwIds.has(k.id))
      .map((k: Row) => ({
        id: `kw-${k.id}`,
        rawId: k.id,
        type: 'keyword',
        label: k.word,
        frequency: kwUsage[k.id] || 1,
      })),
  ];

  const links: any[] = [
    // Note Ã¢â€ â€™ Keyword (shared concepts)
    ...noteKws
      .filter((nk: Row) => sharedKwIds.has(nk.keyword_id))
      .map((nk: Row) => ({
        source: `note-${nk.note_id}`,
        target: `kw-${nk.keyword_id}`,
        type: 'keyword',
      })),
    // Note Ã¢â€ â€™ Note (wikilinks: [[title]] references)
    ...wikilinks
      .filter((w: Row) => noteIds.has(w.from_id) && noteIds.has(w.to_id))
      .map((w: Row) => ({
        source: `note-${w.from_id}`,
        target: `note-${w.to_id}`,
        type: 'wikilink',
      })),
  ];

  return { nodes, links };
}

// ============= WIKILINKS / BACKLINKS =============

/** Extract [[title]] patterns from note blocks */
export function extractWikilinksFromBlocks(blocks: any[]): string[] {
  const titles: string[] = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  for (const block of blocks) {
    if (typeof block.content !== 'string') continue;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(block.content)) !== null) {
      titles.push(m[1].trim());
    }
  }
  return [...new Set(titles)];
}

/** Save [[wikilink]] edges from a note into content_links */
export async function saveNoteWikilinks(
  fromNoteId: string,
  userId: string,
  targetTitles: string[]
): Promise<void> {
  if (!supabase || !targetTitles.length) return;

  // Look up target note IDs by title
  const { data: targets } = await supabase
    .from('notes')
    .select('id, title')
    .eq('user_id', userId)
    .in('title', targetTitles);

  if (!targets?.length) return;

  // Delete old wikilinks from this note, then insert fresh
  await supabase
    .from('content_links')
    .delete()
    .eq('from_id', fromNoteId)
    .eq('link_type', 'wikilink');

  const rows = targets.map((t: any) => ({
    user_id: userId,
    from_type: 'note',
    from_id: fromNoteId,
    to_type: 'note',
    to_id: t.id,
    link_type: 'wikilink',
    weight: 1.0,
  }));

  await supabase.from('content_links').insert(rows);
}

/** Get notes that wikilink TO the given noteId */
export async function getBacklinksForNote(
  noteId: string,
  userId: string
): Promise<{ id: string; title: string; icon: string | null }[]> {
  if (!supabase) return [];

  const { data: links } = await supabase
    .from('content_links')
    .select('from_id')
    .eq('to_id', noteId)
    .eq('link_type', 'wikilink')
    .eq('user_id', userId);

  if (!links?.length) return [];

  const fromIds = links.map((l: any) => l.from_id);
  const { data: notes } = await supabase
    .from('notes')
    .select('id, title, icon')
    .in('id', fromIds)
    .eq('user_id', userId);

  return (notes || []).map((n: any) => ({ id: n.id, title: n.title, icon: n.icon }));
}
