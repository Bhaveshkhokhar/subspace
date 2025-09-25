import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  Package, 
  Bell, 
  MessageSquare, 
  Globe,
  ChevronRight
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/account');
    }
  };

  const handlePrivacySettingsPress = () => {
    router.push('/(tabs)/account/privacy');
  };

  const handleSharedSubscriptionsSettingsPress = () => {
    router.push('/(tabs)/account/shared-subscription-settings');
  };

  const handleSharedSubscriptionsPress = () => {
    router.push('/(tabs)/account/shared-subscriptions');
  };

  const handleNotificationScreenPress = () => {
    router.push('/(tabs)/account/notifications');
  };

  const handleQuickReplyPress = () => {
    router.push('/(tabs)/account/quick-reply');
  };

  const handleLanguagePress = () => {
    router.push('/(tabs)/account/language');
  };

  const settingsItems = [
    {
      icon: Shield,
      title: 'Privacy Settings',
      color: '#EF4444',
      onPress: handlePrivacySettingsPress,
    },
    {
      icon: Users,
      title: 'Shared Subscriptions Settings',
      color: '#10B981',
      onPress: handleSharedSubscriptionsSettingsPress,
    },
    {
      icon: Package,
      title: 'Shared Subscriptions',
      color: '#6366F1',
      onPress: handleSharedSubscriptionsPress,
    },
    {
      icon: Bell,
      title: 'Notification Screen',
      color: '#F59E0B',
      onPress: handleNotificationScreenPress,
    },
    {
      icon: MessageSquare,
      title: 'Quick Reply',
      color: '#8B5CF6',
      onPress: handleQuickReplyPress,
    },
    {
      icon: Globe,
      title: 'Language',
      color: '#06B6D4',
      onPress: handleLanguagePress,
    },
  ];

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
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Settings List */}
        <View style={styles.settingsContainer}>
          {settingsItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.settingItem} 
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[
                styles.settingIcon,
                { backgroundColor: `${item.color}20` }
              ]}>
                <item.icon size={20} color={item.color} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{item.title}</Text>
              </View>
              <ChevronRight size={20} color="#6B7280" />
            </TouchableOpacity>
          ))}
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
    paddingBottom: 40,
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
    width: 32,
    height: 32,
  },
  settingsContainer: {
    paddingHorizontal: 10,
    gap: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  }
});