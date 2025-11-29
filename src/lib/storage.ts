import { createClient } from '@supabase/supabase-js';

// Use Supabase for persistent storage (works on Vercel serverless)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// SECURITY: Use service role key for server-side operations only (never expose to client)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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
export async function listEntries(userId?: string, options?: { locked?: boolean }) {
  if (supabase) {
    const hasLockedColumn = await checkIsLockedColumn();
    
    let query = supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });
    
    // SECURITY: Filter by user_id when provided
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    // Filter by locked status only if column exists
    if (hasLockedColumn && options?.locked !== undefined) {
      query = query.eq('is_locked', options.locked);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Supabase listEntries error:', error.message);
      return [];
    }
    return data || [];
  }
  // Filter memory DB by userId and locked status if provided
  let results = userId 
    ? memoryDb.entries.filter((e: any) => e.user_id === userId)
    : memoryDb.entries;
  
  if (options?.locked !== undefined) {
    results = results.filter((e: any) => e.is_locked === options.locked);
  }
  
  return results;
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
  console.log(`deleteEntry called: id=${id}, userId=${userId}`);
  
  if (supabase) {
    // First verify the entry exists and belongs to user
    const { data: existingEntry, error: fetchError } = await supabase
      .from('entries')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching entry before delete:', fetchError);
    }
    console.log('Entry to delete:', existingEntry);
    
    // Now delete
    const { error, count } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Supabase deleteEntry error:', error.message, error);
      throw new Error(error.message);
    }
    
    // Verify deletion
    const { data: checkDeleted } = await supabase
      .from('entries')
      .select('id')
      .eq('id', id)
      .single();
    
    console.log(`Delete result - error: ${error}, count: ${count}, still exists: ${!!checkDeleted}`);
    
    if (checkDeleted) {
      console.error('Entry still exists after delete!');
      throw new Error('Delete operation failed - entry still exists');
    }
    
    return true;
  }
  
  const idx = memoryDb.entries.findIndex((e: any) => e.id === id && (!userId || e.user_id === userId));
  if (idx === -1) throw new Error('entry not found or access denied');
  memoryDb.entries.splice(idx, 1);
  return true;
}

// SECURITY: Filter tasks by user_id
export async function listTasks(userId?: string) {
  if (supabase) {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    // SECURITY: Filter by user_id when provided
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Supabase listTasks error:', error.message);
      return [];
    }
    return data || [];
  }
  return userId 
    ? memoryDb.tasks.filter((t: any) => t.user_id === userId)
    : memoryDb.tasks;
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
