import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  Bell, 
  MessageSquare, 
  Calendar, 
  Tag, 
  Megaphone,
  Info
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface NotificationSettings {
  message: boolean;
  coupon_expiry: boolean;
  subscription_expiry: boolean;
  promotional: boolean;
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    message: false,
    coupon_expiry: false,
    subscription_expiry: false,
    promotional: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken) {
      fetchNotificationSettings();
    }
  }, [userId, authToken]);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      return router.back();
    } else {
      return router.replace('/(tabs)/account');
    }
  };

  const initializeUser = async () => {
    try {
      const id = await storage.getUserId();
      const token = await storage.getAuthToken();
      
      setUserId(id);
      setAuthToken(token);
    } catch (error) {
      console.error('Error initializing user:', error);
      showError('Failed to initialize user data');
    }
  };

  const fetchNotificationSettings = async () => {
    if (!userId || !authToken) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query Query2($user_id: uuid) {
              __typename
              whatsub_notification_settings(where: {user_id: {_eq: $user_id}}) {
                __typename
                message
                coupon_expiry
                subscription_expiry
                promotional
              }
            }
          `,
          variables: {
            user_id: userId
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error fetching notification settings:', data.errors);
        showError('Failed to load notification settings');
        return;
      }
      
      const settings = data.data?.whatsub_notification_settings?.[0];
      if (settings) {
        setNotificationSettings({
          message: settings.message || false,
          coupon_expiry: settings.coupon_expiry || false,
          subscription_expiry: settings.subscription_expiry || false,
          promotional: settings.promotional || false
        });
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      showError('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateNotificationSettings = async (updatedSettings: NotificationSettings) => {
    if (!userId || !authToken) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation Mutation1($user_id: uuid, $message: Boolean, $coupon_expiry: Boolean, $promotional: Boolean, $subscription_expiry: Boolean) {
              __typename
              insert_whatsub_notification_settings(objects: {user_id: $user_id, message: $message, coupon_expiry: $coupon_expiry, promotional: $promotional, subscription_expiry: $subscription_expiry}, on_conflict: {constraint: whatsub_notification_settings_user_id_key, update_columns: [message, coupon_expiry, promotional, subscription_expiry]}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_id: userId,
            message: updatedSettings.message,
            coupon_expiry: updatedSettings.coupon_expiry,
            promotional: updatedSettings.promotional,
            subscription_expiry: updatedSettings.subscription_expiry
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error updating notification settings:', data.errors);
        showError('Failed to update notification settings');
        return;
      }
      
      if (data.data?.insert_whatsub_notification_settings?.affected_rows > 0) {
        setNotificationSettings(updatedSettings);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      showError('Failed to update notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (setting: keyof NotificationSettings, value: boolean) => {
    const updatedSettings = { ...notificationSettings, [setting]: value };
    updateNotificationSettings(updatedSettings);
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Screen</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading notification settings...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Screen</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsContainer}>
          {/* Message Notification */}
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconContainer}>
                <MessageSquare size={20} color="#6366F1" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Message Notification</Text>
                <Text style={styles.settingDescription}>
                  When turned off, you won't receive any message notification
                </Text>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={notificationSettings.message}
                  onValueChange={(value) => handleToggle('message', value)}
                  trackColor={{ false: '#374151', true: '#6366F1' }}
                  thumbColor={notificationSettings.message ? '#FFFFFF' : '#9CA3AF'}
                  ios_backgroundColor="#374151"
                  disabled={isSaving}
                />
              </View>
            </View>
          </View>

          {/* Subscription Expiry Notification */}
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconContainer}>
                <Calendar size={20} color="#F59E0B" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Subscription Expiry Notification</Text>
                <Text style={styles.settingDescription}>
                  When turned off, you won't receive any subscription expiry notification
                </Text>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={notificationSettings.subscription_expiry}
                  onValueChange={(value) => handleToggle('subscription_expiry', value)}
                  trackColor={{ false: '#374151', true: '#6366F1' }}
                  thumbColor={notificationSettings.subscription_expiry ? '#FFFFFF' : '#9CA3AF'}
                  ios_backgroundColor="#374151"
                  disabled={isSaving}
                />
              </View>
            </View>
          </View>

          {/* Coupon Expiry Notification */}
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconContainer}>
                <Tag size={20} color="#10B981" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Coupon Expiry Notification</Text>
                <Text style={styles.settingDescription}>
                  When turned off, you won't receive any coupon expiry notification
                </Text>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={notificationSettings.coupon_expiry}
                  onValueChange={(value) => handleToggle('coupon_expiry', value)}
                  trackColor={{ false: '#374151', true: '#6366F1' }}
                  thumbColor={notificationSettings.coupon_expiry ? '#FFFFFF' : '#9CA3AF'}
                  ios_backgroundColor="#374151"
                  disabled={isSaving}
                />
              </View>
            </View>
          </View>

          {/* Promotional Notification */}
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconContainer}>
                <Megaphone size={20} color="#EC4899" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Promotional Notification</Text>
                <Text style={styles.settingDescription}>
                  When turned off, you won't receive any promotional notification
                </Text>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={notificationSettings.promotional}
                  onValueChange={(value) => handleToggle('promotional', value)}
                  trackColor={{ false: '#374151', true: '#6366F1' }}
                  thumbColor={notificationSettings.promotional ? '#FFFFFF' : '#9CA3AF'}
                  ios_backgroundColor="#374151"
                  disabled={isSaving}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    fontWeight: '800',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  permissionSection: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  permissionCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  permissionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  permissionActions: {
    alignItems: 'flex-end',
  },
  enableButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 16,
  },
  settingsContainer: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 32,
  },
  settingCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  switchContainer: {
    justifyContent: 'center',
  },
});