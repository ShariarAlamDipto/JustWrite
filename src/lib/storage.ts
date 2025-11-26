import { createClient } from '@supabase/supabase-js';

// Use Supabase for persistent storage (works on Vercel serverless)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// In-memory fallback for development without Supabase
let memoryDb: { entries: any[]; tasks: any[] } = { entries: [], tasks: [] };

export async function listEntries() {
  if (supabase) {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase listEntries error:', error);
      return [];
    }
    return data || [];
  }
  return memoryDb.entries;
}

export async function createEntry({ content, source = 'text', created_at }: any) {
  const entry = {
    id: crypto.randomUUID(),
    content,
    source,
    created_at: created_at || new Date().toISOString(),
    summary: null,
    ai_metadata: null
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('entries')
      .insert(entry)
      .select()
      .single();
    if (error) {
      console.error('Supabase createEntry error:', error);
      throw new Error(error.message);
    }
    return data;
  }
  
  memoryDb.entries.unshift(entry);
  return entry;
}

export async function getEntryById(id: string) {
  if (supabase) {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  }
  return memoryDb.entries.find((e: any) => e.id === id);
}

export async function updateEntrySummary(id: string, summary: string, ai_metadata: any) {
  if (supabase) {
    const { data, error } = await supabase
      .from('entries')
      .update({ summary, ai_metadata })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  
  const idx = memoryDb.entries.findIndex((e: any) => e.id === id);
  if (idx === -1) throw new Error('entry not found');
  memoryDb.entries[idx].summary = summary;
  memoryDb.entries[idx].ai_metadata = ai_metadata;
  return memoryDb.entries[idx];
}

export async function listTasks() {
  if (supabase) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase listTasks error:', error);
      return [];
    }
    return data || [];
  }
  return memoryDb.tasks;
}

export async function createTask(task: any) {
  const t = {
    id: crypto.randomUUID(),
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'medium',
    status: task.status || 'todo',
    entry_id: task.entry_id || null,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(t)
      .select()
      .single();
    if (error) {
      console.error('Supabase createTask error:', error);
      throw new Error(error.message);
    }
    return data;
  }
  
  memoryDb.tasks.unshift(t);
  return t;
}

export async function createTasksBulk(tasks: any[], entryId?: string) {
  const created: any[] = [];
  for (const t of tasks) {
    const taskObj = { ...t, entry_id: entryId || t.entry_id };
    const createdT = await createTask(taskObj);
    created.push(createdT);
  }
  return created;
}

export async function updateTask(id: string, patch: any) {
  if (supabase) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  
  const idx = memoryDb.tasks.findIndex((t: any) => t.id === id);
  if (idx === -1) throw new Error('task not found');
  memoryDb.tasks[idx] = { ...memoryDb.tasks[idx], ...patch, updated_at: new Date().toISOString() };
  return memoryDb.tasks[idx];
}

export async function deleteTask(id: string) {
  if (supabase) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  
  const idx = memoryDb.tasks.findIndex((t: any) => t.id === id);
  if (idx === -1) throw new Error('task not found');
  memoryDb.tasks.splice(idx, 1);
  return true;
}
