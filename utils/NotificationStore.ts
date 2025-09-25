// utils/notificationStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationData {
  route?: string;
  chatId?: string;
  userId?: string;
  type?: string;
  timestamp?: number;
}

class NotificationStore {
  private static instance: NotificationStore;
  private pendingNavigation: NotificationData | null = null;

  static getInstance(): NotificationStore {
    if (!NotificationStore.instance) {
      NotificationStore.instance = new NotificationStore();
    }
    return NotificationStore.instance;
  }

  async setPendingNavigation(data: NotificationData) {
    this.pendingNavigation = { ...data, timestamp: Date.now() };
    try {
      await AsyncStorage.setItem('pendingNotificationNav', JSON.stringify(this.pendingNavigation));
      console.log('Saved pending navigation:', this.pendingNavigation);
    } catch (error) {
      console.error('Error saving pending navigation:', error);
    }
  }

  async getPendingNavigation(): Promise<NotificationData | null> {
    try {
      if (this.pendingNavigation) {
        return this.pendingNavigation;
      }
      
      const stored = await AsyncStorage.getItem('pendingNotificationNav');
      if (stored) {
        const data = JSON.parse(stored);
        // Only return if timestamp is recent (within 5 minutes)
        if (data.timestamp && (Date.now() - data.timestamp) < 5 * 60 * 1000) {
          this.pendingNavigation = data;
          return data;
        }
      }
    } catch (error) {
      console.error('Error getting pending navigation:', error);
    }
    return null;
  }

  async clearPendingNavigation() {
    this.pendingNavigation = null;
    try {
      await AsyncStorage.removeItem('pendingNotificationNav');
      console.log('Cleared pending navigation');
    } catch (error) {
      console.error('Error clearing pending navigation:', error);
    }
  }

  async handlePendingNavigation() {
    const pending = await this.getPendingNavigation();
    if (!pending) return false;

    console.log('Processing pending navigation:', pending);
    
    // Clear the pending navigation first
    await this.clearPendingNavigation();

    // Import router dynamically to avoid circular dependencies
    const { router } = await import('expo-router');
    
    try {
      switch (pending.route || pending.type) {
        case 'chat':
          if (pending.chatId) {
            // Store chatId in AsyncStorage for the chat screen to pick up
            await AsyncStorage.setItem('targetChatId', pending.chatId);
            router.replace('/(tabs)/chat');
          } else {
            router.replace('/(tabs)/chat');
          }
          break;
        case 'profile':
          if (pending.userId) {
            await AsyncStorage.setItem('targetUserId', pending.userId);
          }
          router.replace('/(tabs)/account');
          break;
        case 'wallet':
          router.replace('/(tabs)/wallet');
          break;
        case 'explore':
          router.replace('/(tabs)/explore');
          break;
        default:
          router.replace('/(tabs)/home');
          break;
      }
      return true;
    } catch (error) {
      console.error('Error handling pending navigation:', error);
      router.replace('/(tabs)/home');
      return false;
    }
  }
}

export const notificationStore = NotificationStore.getInstance();

// Helper hook for React components
export const useNotificationNavigation = () => {
  return {
    handlePendingNavigation: () => notificationStore.handlePendingNavigation(),
    clearPendingNavigation: () => notificationStore.clearPendingNavigation(),
  };
};