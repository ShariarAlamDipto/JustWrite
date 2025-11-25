import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(undefined, {
        path: '/socket.io',
        addTrailingSlash: false,
      });

      socket.on('connect', () => {
        console.log('Connected to socket server');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from socket server');
        setIsConnected(false);
      });
    }

    return () => {
      // Cleanup on unmount if needed
    };
  }, []);

  return { socket, isConnected };
}
