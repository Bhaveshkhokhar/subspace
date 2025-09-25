import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, X, Shield, MessageSquare, Calendar, Gift } from 'lucide-react-native';
import { useTranslation } from '@/hooks/useLanguage';

const { width, height } = Dimensions.get('window');

interface NotificationPermissionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAllow: () => Promise<boolean>;
  onDeny: () => void;
}

export default function NotificationPermissionModal({
  isVisible,
  onClose,
  onAllow,
  onDeny
}: NotificationPermissionModalProps) {
  const { t } = useTranslation();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      const success = await onAllow();
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeny = () => {
    onDeny();
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['#0e0e0e', '#0e0e0e']}
          style={styles.modalContainer}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.bellIconContainer}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.bellIcon}
              >
                <Bell size={32} color="white" />
              </LinearGradient>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isRequesting}
            >
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Stay Updated</Text>
            <Text style={styles.modalSubtitle}>
              Get notified about important updates and never miss out on what matters to you
            </Text>

            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MessageSquare size={16} color="#6366F1" />
                </View>
                <Text style={styles.featureText}>New messages in your groups</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Calendar size={16} color="#F59E0B" />
                </View>
                <Text style={styles.featureText}>Subscription expiry reminders</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Gift size={16} color="#10B981" />
                </View>
                <Text style={styles.featureText}>Special offers and discounts</Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Shield size={16} color="#EC4899" />
                </View>
                <Text style={styles.featureText}>Security and account updates</Text>
              </View>
            </View>

            {/* Privacy Notice */}
            <View style={styles.privacyNotice}>
              <Shield size={14} color="#9CA3AF" />
              <Text style={styles.privacyText}>
                You can change notification preferences anytime in settings
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.denyButton}
              onPress={handleDeny}
              disabled={isRequesting}
            >
              <Text style={styles.denyButtonText}>Not Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.allowButton,
                isRequesting && styles.allowButtonDisabled
              ]}
              onPress={handleAllow}
              disabled={isRequesting}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.allowButtonGradient}
              >
                {isRequesting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.allowButtonText}>Allow Notifications</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    position: 'relative',
  },
  bellIconContainer: {
    marginBottom: 20,
  },
  bellIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresList: {
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#E5E7EB',
    flex: 1,
    lineHeight: 22,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#9CA3AF',
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  denyButton: {
    flex: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.5)',
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  allowButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  allowButtonDisabled: {
    opacity: 0.7,
  },
  allowButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});