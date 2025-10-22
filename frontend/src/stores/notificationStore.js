import { create } from 'zustand'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }))
  },
  
  markAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }))
  },
  
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(notif => ({ ...notif, read: true })),
      unreadCount: 0
    }))
  },
  
  clearNotifications: () => set({
    notifications: [],
    unreadCount: 0
  }),
  
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.read).length
  })
}))

export { useNotificationStore }
