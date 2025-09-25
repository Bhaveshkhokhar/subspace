import { io } from 'socket.io-client';
import { storage } from '@/utils/storage';
import { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export async function initSocket() {
  if (!socket) {
    const userId = await storage.getUserId();
    const token = await storage.getAuthToken();
    if (!userId || !token) return null;

    socket = io('https://socket.subspace.money', {
      transports: ['websocket'],
      query: { id: userId, token: `Bearer ${token}` },
    });

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('error', (err:any) => console.error('Socket error', err));
  }
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    console.log('disconnecting socket');
    socket.disconnect();
    socket = null;
  }
}