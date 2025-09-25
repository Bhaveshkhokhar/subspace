import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';

const { width, height } = Dimensions.get('window');

interface LeaveRequestModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  roomId: string;
  groupName?: string;
}

export default function LeaveRequestModal({
  isVisible,
  onClose,
  onSuccess,
  onError,
  roomId,
  groupName
}: LeaveRequestModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setReason('');
      setIsSubmitting(false);
      setIsFocused(false);
    }
  }, [isVisible]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      onError?.('Please provide a reason for leaving');
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        onError?.('Authentication required');
        return;
      }

      // First mutation: Update subscription status to "stop"
      const subscriptionResponse = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($user_id: uuid = "", $room_id: uuid = "") {
              __typename
              update_whatsub_users_subscription(_set: {status: "stop"}, where: {user_id: {_eq: $user_id}, room_id: {_eq: $room_id}}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_id: userId,
            room_id: roomId
          }
        })
      });

      const subscriptionData = await subscriptionResponse.json();

      if (subscriptionData.errors) {
        onError?.(subscriptionData.errors[0]?.message || 'Failed to update subscription status');
        return;
      }

      // Second mutation: Update room user mapping with leave request
      const mappingResponse = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($user_id: uuid, $room_id: uuid, $leave_request_reason: String) {
              __typename
              update_whatsub_room_user_mapping(where: {user_id: {_eq: $user_id}, room_id: {_eq: $room_id}}, _set: {leave_request: true, leave_request_reason: $leave_request_reason}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_id: userId,
            room_id: roomId,
            leave_request_reason: reason.trim()
          }
        })
      });

      const mappingData = await mappingResponse.json();

      if (mappingData.errors) {
        onError?.(mappingData.errors[0]?.message || 'Failed to submit leave request');
        return;
      }

      if (mappingData.data?.update_whatsub_room_user_mapping?.affected_rows > 0) {
        onSuccess?.();
        onClose();
      } else {
        onError?.('Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      onError?.('Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <LinearGradient
            colors={['#1F2937', '#374151']}
            style={styles.modalContainer}
          >
            {/* Header Indicator */}
            <View style={styles.headerIndicator} />

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.modalTitle}>Reason for leaving the group?</Text>
              </View>

              {/* Reason Input */}
              <View style={styles.reasonSection}>
                <View style={[
                  styles.reasonInputContainer,
                  isFocused && styles.reasonInputContainerFocused
                ]}>
                  <TextInput
                    style={styles.reasonInput}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Write Reason"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={500}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    editable={!isSubmitting}
                  />
                  
                  {/* Character count */}
                  <View style={styles.characterCount}>
                    <Text style={styles.characterCountText}>
                      {reason.length}/500
                    </Text>
                  </View>
                </View>
              </View>

              {/* Warning Notice */}
              <View style={styles.warningContainer}>
                <Text style={styles.warningIcon}>📝</Text>
                <Text style={styles.warningText}>
                  Please take note that your request will only be considered if you are having trouble accessing the subscription.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!reason.trim() || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!reason.trim() || isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    !reason.trim() || isSubmitting
                      ? ['#6B7280', '#6B7280']
                      : ['#6366F1', '#8B5CF6']
                  }
                  style={styles.submitButtonGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Request</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    minHeight: height * 0.6,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    position: 'relative',
  },
  headerIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#6366F1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 32,
  },
  reasonSection: {
    marginBottom: 24,
  },
  reasonInputContainer: {
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(75, 85, 99, 0.5)',
    padding: 16,
    minHeight: 150,
    position: 'relative',
  },
  reasonInputContainerFocused: {
    borderColor: '#6366F1',
  },
  reasonInput: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
    minHeight: 100,
    paddingBottom: 24,
  },
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  characterCountText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    padding: 16,
    marginBottom: 32,
    gap: 12,
  },
  warningIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  warningText: {
    fontSize: 14,
    color: '#F59E0B',
    lineHeight: 20,
    flex: 1,
  },
  submitButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
});