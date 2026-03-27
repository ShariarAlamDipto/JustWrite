const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const socketIO = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const socketAllowedOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowDevLocalhost = dev || process.env.NODE_ENV !== 'production';
const defaultOrigins = allowDevLocalhost
  ? ['http://localhost:3000', 'http://127.0.0.1:3000']
  : [];
const allowedOrigins = [...new Set([...defaultOrigins, ...socketAllowedOrigins])];

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

async function authenticateSocket(socket, nextMiddleware) {
  try {
    if (!supabase) {
      return nextMiddleware(new Error('Authentication service unavailable'));
    }

    const tokenFromAuth = socket.handshake.auth && typeof socket.handshake.auth.token === 'string'
      ? socket.handshake.auth.token
      : '';
    const tokenFromHeader = typeof socket.handshake.headers.authorization === 'string'
      ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
      : '';
    const token = tokenFromAuth || tokenFromHeader;

    if (!token) {
      return nextMiddleware(new Error('Unauthorized'));
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return nextMiddleware(new Error('Unauthorized'));
    }

    socket.data.userId = data.user.id;
    return nextMiddleware();
  } catch {
    return nextMiddleware(new Error('Unauthorized'));
  }
}

function isValidEventPayload(payload, userId) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const payloadStr = JSON.stringify(payload);
  if (payloadStr.length > 50000) {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'user_id') && payload.user_id !== userId) {
    return false;
  }

  return true;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = socketIO(server, {
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

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const roomName = `user:${socket.data.userId}`;
    socket.join(roomName);
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });

    socket.on('entry:created', (entry) => {
      if (!isValidEventPayload(entry, socket.data.userId)) {
        return;
      }
      console.log(`[Socket.io] Broadcast entry:created`, entry.id);
      socket.to(roomName).emit('entry:created', entry);
    });

    socket.on('task:updated', (task) => {
      if (!isValidEventPayload(task, socket.data.userId)) {
        return;
      }
      console.log(`[Socket.io] Broadcast task:updated`, task.id);
      socket.to(roomName).emit('task:updated', task);
    });

    socket.on('distill:complete', (data) => {
      if (!isValidEventPayload(data, socket.data.userId)) {
        return;
      }
      console.log(`[Socket.io] Broadcast distill:complete`, data.entryId);
      socket.to(roomName).emit('distill:complete', data);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
