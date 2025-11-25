const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const socketIO = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });

    socket.on('entry:created', (entry) => {
      console.log(`[Socket.io] Broadcast entry:created`, entry.id);
      socket.broadcast.emit('entry:created', entry);
    });

    socket.on('task:updated', (task) => {
      console.log(`[Socket.io] Broadcast task:updated`, task.id);
      socket.broadcast.emit('task:updated', task);
    });

    socket.on('distill:complete', (data) => {
      console.log(`[Socket.io] Broadcast distill:complete`, data.entryId);
      socket.broadcast.emit('distill:complete', data);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
