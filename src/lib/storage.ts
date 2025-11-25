import { readDb, writeDb } from './db';

let usingPrisma = false;
let prisma: any = null;
if (process.env.DATABASE_URL) {
  try {
    // lazy import to avoid errors when prisma not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const p = require('./prisma');
    prisma = p.prisma;
    usingPrisma = true;
  } catch (e) {
    console.warn('Prisma not available; falling back to file DB');
  }
}

export async function listEntries() {
  if (usingPrisma) return prisma.entry.findMany({ orderBy: { createdAt: 'desc' } });
  const db = await readDb();
  return db.entries || [];
}

export async function createEntry({ content, source = 'text', created_at }: any) {
  if (usingPrisma) return prisma.entry.create({ data: { content, source, createdAt: created_at ? new Date(created_at) : new Date() } });
  const db = await readDb();
  const entry = { id: Date.now().toString(), content, source, created_at: created_at || new Date().toISOString(), summary: null, ai_metadata: null };
  db.entries = db.entries || [];
  db.entries.unshift(entry);
  await writeDb(db);
  return entry;
}

export async function getEntryById(id: string) {
  if (usingPrisma) return prisma.entry.findUnique({ where: { id } });
  const db = await readDb();
  return (db.entries || []).find((e: any) => e.id === id);
}

export async function updateEntrySummary(id: string, summary: string, ai_metadata: any) {
  if (usingPrisma) return prisma.entry.update({ where: { id }, data: { summary, aiMetadata: ai_metadata } });
  const db = await readDb();
  const idx = (db.entries || []).findIndex((e: any) => e.id === id);
  if (idx === -1) throw new Error('entry not found');
  db.entries[idx].summary = summary;
  db.entries[idx].ai_metadata = ai_metadata;
  await writeDb(db);
  return db.entries[idx];
}

export async function listTasks() {
  if (usingPrisma) return prisma.task.findMany({ orderBy: { createdAt: 'desc' } });
  const db = await readDb();
  return db.tasks || [];
}

export async function createTask(task: any) {
  if (usingPrisma) return prisma.task.create({ data: { title: task.title, description: task.description || null, priority: task.priority || 'medium', status: task.status || 'todo', entryId: task.entry_id || null } });
  const db = await readDb();
  const t = { id: Date.now().toString(), title: task.title, description: task.description || '', priority: task.priority || 'medium', status: task.status || 'todo', entry_id: task.entry_id || null, created_at: new Date().toISOString() };
  db.tasks = db.tasks || [];
  db.tasks.unshift(t);
  await writeDb(db);
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
  if (usingPrisma) return prisma.task.update({ where: { id }, data: patch });
  const db = await readDb();
  const idx = (db.tasks || []).findIndex((t: any) => t.id === id);
  if (idx === -1) throw new Error('task not found');
  db.tasks[idx] = { ...db.tasks[idx], ...patch, updated_at: new Date().toISOString() };
  await writeDb(db);
  return db.tasks[idx];
}
