import { Server as HTTPServer } from 'http';
import { Socket as ISocket } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket: ISocket) => {
    console.log('Client connected:', socket.id);

    // Listen for entry creation
    socket.on('entry:created', (entry: any) => {
      // Broadcast to all connected clients
      io!.emit('entry:created', entry);
    });

    // Listen for task updates
    socket.on('task:updated', (task: any) => {
      io!.emit('task:updated', task);
    });

    // Listen for distill results
    socket.on('distill:complete', (data: any) => {
      io!.emit('distill:complete', data);
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
