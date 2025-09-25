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
  Shield, 
  Eye, 
  EyeOff, 
  Phone, 
  Mail,
  Info,
  Lock
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface PrivacySettings {
  hide_phone_number: boolean;
  hide_email_id: boolean;
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    hide_phone_number: false,
    hide_email_id: false
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
      fetchPrivacySettings();
    }
  }, [userId, authToken]);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/account');
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

  const fetchPrivacySettings = async () => {
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
            query Query($user_id: uuid) {
              __typename
              whatsub_privacy_settings(where: {user_id: {_eq: $user_id}}) {
                __typename
                hide_phone_number
                hide_email_id
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
        console.error('Error fetching privacy settings:', data.errors);
        showError('Failed to load privacy settings');
        return;
      }
      
      const settings = data.data?.whatsub_privacy_settings?.[0];
      if (settings) {
        setPrivacySettings({
          hide_phone_number: settings.hide_phone_number || false,
          hide_email_id: settings.hide_email_id || false
        });
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      showError('Failed to load privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePhoneNumberPrivacy = async (hidePhoneNumber: boolean) => {
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
            mutation Mutation1($user_id: uuid, $hide_phone_number: Boolean) {
              __typename
              insert_whatsub_privacy_settings(objects: {user_id: $user_id, hide_phone_number: $hide_phone_number}, on_conflict: {constraint: whatsub_privacy_settings_user_id_key, update_columns: [hide_phone_number]}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_id: userId,
            hide_phone_number: hidePhoneNumber
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error updating phone privacy:', data.errors);
        showError('Failed to update phone number privacy');
        return;
      }
      
      if (data.data?.insert_whatsub_privacy_settings?.affected_rows > 0) {
        setPrivacySettings(prev => ({ ...prev, hide_phone_number: hidePhoneNumber }));
      }
    } catch (error) {
      console.error('Error updating phone privacy:', error);
      showError('Failed to update phone number privacy');
    } finally {
      setIsSaving(false);
    }
  };

  const updateEmailPrivacy = async (hideEmailId: boolean) => {
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
            mutation Mutation1($user_id: uuid, $hide_email_id: Boolean) {
              __typename
              insert_whatsub_privacy_settings(objects: {user_id: $user_id, hide_email_id: $hide_email_id}, on_conflict: {constraint: whatsub_privacy_settings_user_id_key, update_columns: [hide_email_id]}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_id: userId,
            hide_email_id: hideEmailId
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error updating email privacy:', data.errors);
        showError('Failed to update email privacy');
        return;
      }
      
      if (data.data?.insert_whatsub_privacy_settings?.affected_rows > 0) {
        setPrivacySettings(prev => ({ ...prev, hide_email_id: hideEmailId }));
      }
    } catch (error) {
      console.error('Error updating email privacy:', error);
      showError('Failed to update email privacy');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneNumberToggle = (value: boolean) => {
    updatePhoneNumberPrivacy(value);
  };

  const handleEmailToggle = (value: boolean) => {
    updateEmailPrivacy(value);
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
            onPress={() => router.back()}
          >
            <ArrowLeft size={18} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('account.privacySecurity')}</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading privacy settings...</Text>
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
          <Text style={styles.headerTitle}>Privacy Settings</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Privacy Settings */}
        <View style={styles.settingsContainer}>
          {/* Phone Number Privacy */}
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconContainer}>
                <Phone size={16} color="#6366F1" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Hide Phone Number</Text>
                <Text style={styles.settingDescription}>
                  When enabled, your phone number is hidden from others.
                </Text>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={privacySettings.hide_phone_number}
                  onValueChange={handlePhoneNumberToggle}
                  trackColor={{ false: '#374151', true: '#6366F1' }}
                  thumbColor={privacySettings.hide_phone_number ? '#FFFFFF' : '#9CA3AF'}
                  ios_backgroundColor="#374151"
                  disabled={isSaving}
                />
              </View>
            </View>
            
            <View style={styles.settingStatus}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: privacySettings.hide_phone_number ? '#EF4444' : '#10B981' }
              ]} />
              <Text style={[
                styles.statusText,
                { color: privacySettings.hide_phone_number ? '#EF4444' : '#10B981' }
              ]}>
                {privacySettings.hide_phone_number ? 'Hidden from others' : 'Visible to others'}
              </Text>
            </View>
          </View>

          {/* Email Privacy */}
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconContainer}>
                <Mail size={16} color="#6366F1" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Hide Email Id</Text>
                <Text style={styles.settingDescription}>
                  When enabled, your email is hidden from others.
                </Text>
              </View>
              <View style={styles.switchContainer}>
                <Switch
                  value={privacySettings.hide_email_id}
                  onValueChange={handleEmailToggle}
                  trackColor={{ false: '#374151', true: '#6366F1' }}
                  thumbColor={privacySettings.hide_email_id ? '#FFFFFF' : '#9CA3AF'}
                  ios_backgroundColor="#374151"
                  disabled={isSaving}
                />
              </View>
            </View>
            
            <View style={styles.settingStatus}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: privacySettings.hide_email_id ? '#EF4444' : '#10B981' }
              ]} />
              <Text style={[
                styles.statusText,
                { color: privacySettings.hide_email_id ? '#EF4444' : '#10B981' }
              ]}>
                {privacySettings.hide_email_id ? 'Hidden from others' : 'Visible to others'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isSaving && (
        <View style={styles.loadingOverlay}>
          <View style={styles.savingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.savingText}>Updating privacy settings...</Text>
          </View>
        </View>
      )}
      
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
    paddingBottom: 20,
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
    backgroundColor: 'transparent',
    fontWeight: '800',
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
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 32,
  },
  settingCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 14,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 14,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  settingDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  switchContainer: {
    justifyContent: 'center',
  },
  settingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  savingText: {
    fontSize: 14,
    color: 'white',
    marginTop: 16,
    fontWeight: '500',
  },
});