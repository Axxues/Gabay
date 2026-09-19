import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  read: boolean;
  createdAt?: string;
}

export interface NotificationContextType {
  unreadNotifications: number;
  unreadInboxCount: number;
  notifications: NotificationItem[];
  setUnreadNotifications: (count: number) => void;
  setUnreadInboxCount: (count: number) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadNotifications(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadNotifications,
        unreadInboxCount,
        notifications,
        setUnreadNotifications,
        setUnreadInboxCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
