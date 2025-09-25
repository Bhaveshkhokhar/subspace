// context/ChatSocketProvider.tsx
import React, { createContext, useContext, useRef, useCallback } from 'react';
import { initSocket, disconnectSocket, getSocket } from '@/services/socket';

type SocketContextType = {
  socket: any | null;
  registerConsumer: () => Promise<void>;
  unregisterConsumer: () => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function ChatSocketProvider({ children }: { children: React.ReactNode }) {
  const consumers = useRef(0);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRerender] = React.useState(0); // to surface socket when it becomes available

  const registerConsumer = useCallback(async () => {
    consumers.current += 1;
    if (disconnectTimer.current) {
      clearTimeout(disconnectTimer.current);
      disconnectTimer.current = null;
    }
    if (!getSocket()) {
      await initSocket();
      // trigger context consumers to see updated socket
      forceRerender((v) => v + 1);
    }
  }, []);

  const unregisterConsumer = useCallback(() => {
    consumers.current = Math.max(0, consumers.current - 1);
    if (consumers.current === 0) {
      // debounce quick navigation flicker
      disconnectTimer.current = setTimeout(() => {
        disconnectSocket();
        forceRerender((v) => v + 1);
      }, 250);
    }
  }, []);

  const contextValue: SocketContextType = {
    socket: getSocket(),
    registerConsumer,
    unregisterConsumer,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useChatSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useChatSocket must be used within ChatSocketProvider');
  }
  return ctx;
}
