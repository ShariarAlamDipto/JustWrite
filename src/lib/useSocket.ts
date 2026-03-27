import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { supabase } from './supabase';

let socket: Socket | null = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    const connectSocket = async () => {
      if (socket) return;
      if (!supabase) return;

      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token || '';

      socket = io(undefined, {
        path: '/socket.io',
        addTrailingSlash: false,
        auth: {
          token: accessToken,
        },
      });

      socket.on('connect', () => {
        if (!mounted) return;
        console.log('Connected to socket server');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        if (!mounted) return;
        console.log('Disconnected from socket server');
        setIsConnected(false);
      });

      socket.on('connect_error', () => {
        if (!mounted) return;
        setIsConnected(false);
      });
    };

    connectSocket().catch(() => {
      if (!mounted) return;
      setIsConnected(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { socket, isConnected };
}
