import { Server as HTTPServer } from 'http';
import { Socket as ISocket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';
import { createClient } from '@supabase/supabase-js';

let io: SocketIOServer | null = null;

const socketAllowedOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const allowedOrigins = [...new Set([...defaultOrigins, ...socketAllowedOrigins])];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

function isValidEventPayload(payload: unknown, userId: string): payload is Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const payloadStr = JSON.stringify(payload);
  if (payloadStr.length > 50000) {
    return false;
  }

  const maybeUserId = (payload as Record<string, unknown>).user_id;
  if (typeof maybeUserId === 'string' && maybeUserId !== userId) {
    return false;
  }

  return true;
}

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Origin not allowed'));
      },
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      if (!supabase) {
        return next(new Error('Authentication service unavailable'));
      }

      const tokenFromAuth = typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : '';
      const tokenFromHeader = typeof socket.handshake.headers.authorization === 'string'
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : '';
      const token = tokenFromAuth || tokenFromHeader;

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return next(new Error('Unauthorized'));
      }

      socket.data.userId = data.user.id;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: ISocket) => {
    const userId = String(socket.data.userId || '');
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    console.log('Client connected:', socket.id);

    socket.on('entry:created', (entry: unknown) => {
      if (!isValidEventPayload(entry, userId)) return;
      socket.to(userRoom).emit('entry:created', entry);
    });

    socket.on('task:updated', (task: unknown) => {
      if (!isValidEventPayload(task, userId)) return;
      socket.to(userRoom).emit('task:updated', task);
    });

    socket.on('distill:complete', (data: unknown) => {
      if (!isValidEventPayload(data, userId)) return;
      socket.to(userRoom).emit('distill:complete', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getSocket(): SocketIOServer | null {
  return io;
}
