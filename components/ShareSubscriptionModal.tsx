import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  X, 
  Users, 
  Minus, 
  Plus, 
  Share2,
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';

const { width, height } = Dimensions.get('window');

interface ShareSubscriptionModalProps {
  isVisible: boolean;
  onClose: () => void;
  subscription: {
    id: string;
    service_image_url: string;
    expiring_at: string;
    status: string;
    type: string;
    room_id: string | null;
    price: number;
    share_limit: number;
    service_name: string;
    plan: string;
    service_id: string;
    plan_id: string;
    is_public: boolean;
    whatsub_plan: {
      duration: number;
      duration_type: string;
      accounts: number;
    };
  } | null;
  onSuccess?: () => void;
}

interface CreateGroupResponse {
  user_map_id: string;
  room_id: string;
  group_name: string;
  admin_id: string;
}

export default function ShareSubscriptionModal({
  isVisible,
  onClose,
  subscription,
  onSuccess
}: ShareSubscriptionModalProps) {
  const { t } = useTranslation();
  const [shareLimit, setShareLimit] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isVisible && subscription) {
      setShareLimit(subscription.share_limit-1);
      setError(null);
      setSuccess(false);
    }
  }, [isVisible, subscription]);

  const calculateEarnings = () => {
    if (!subscription) return 0;
    const userPrice = subscription.price / subscription.share_limit;
    const otherUsersPrice = (shareLimit) * userPrice;
    return otherUsersPrice;
  };

  const handleShareLimitChange = (increment: boolean) => {
    if (increment && subscription?.share_limit && shareLimit < subscription?.share_limit-1) {
      setShareLimit(prev => prev + 1);
    } else if (!increment && shareLimit > 1) {
      setShareLimit(prev => prev - 1);
    }
  };

  const handleCreateGroup = async () => {
    if (!subscription) return;

    setIsCreating(true);
    setError(null);

    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($user_id: uuid = "", $user_subscription_id: uuid = "", $limit: Int) {
              __typename
              createSubscriptionGroup(request: {user_id: $user_id, user_subscription_id: $user_subscription_id, limit: $limit}) {
                __typename
                user_map_id
                room_id
                group_name
                admin_id
              }
            }
          `,
          variables: {
            user_id: userId,
            user_subscription_id: subscription.id,
            limit: shareLimit
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0]?.message || 'Failed to create group');
        return;
      }

      const result = data.data?.createSubscriptionGroup as CreateGroupResponse;
      
      if (result?.room_id) {
        setSuccess(true);
        
        // Navigate to the chat room after a brief success display
        setTimeout(() => {
          router.push({
            pathname: '/(tabs)/chat/conversation',
            params: {
              roomId: result.room_id,
              friendId: '',
              subscriptionId: subscription.id,
              friendName: result.group_name,
              roomDp: subscription.service_image_url,
              roomType: 'group'
            }
          });
          
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError('Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  if (!subscription) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
          style={styles.modalContainer}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isCreating}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          {success ? (
            /* Success State */
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <CheckCircle size={48} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Group Created!</Text>
              <Text style={styles.successMessage}>
                Redirecting to your new group chat...
              </Text>
              <ActivityIndicator size="small" color="#10B981" style={styles.successSpinner} />
            </View>
          ) : (
            /* Main Content */
            <View style={styles.modalContent}>
              {/* Service Logo */}
              <View style={styles.serviceLogoContainer}>
                <Image
                  source={{ uri: subscription.service_image_url }}
                  style={styles.serviceLogo}
                  resizeMode="contain"
                />
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>
                We will create group of paying users for you
              </Text>

              {/* Earnings Card */}
              <View style={styles.earningsCard}>
                <Text style={styles.earningsText}>
                  You will earn Rs. {calculateEarnings()} by sharing this subscription
                </Text>
              </View>

              {/* Share Limit Selector */}
              <View style={styles.shareLimitRow}>
  <Text style={styles.shareLimitLabel}>
    Sharing {subscription.service_name} with
  </Text>

  <View style={styles.shareLimitSelector}>
    <TouchableOpacity
      style={styles.limitButton}
      onPress={() => handleShareLimitChange(false)}
      disabled={shareLimit <= 1 || isCreating}
    >
      <Minus size={20} color={shareLimit <= 1 ? "#6B7280" : "white"} />
    </TouchableOpacity>

    <View style={styles.limitDisplay}>
      <Text style={styles.limitNumber}>{shareLimit}</Text>
    </View>

    <TouchableOpacity
      style={styles.limitButton}
      onPress={() => handleShareLimitChange(true)}
      disabled={shareLimit >= subscription.share_limit - 1 || isCreating}
    >
      <Plus size={20} color={shareLimit >= subscription.share_limit - 1 ? "#6B7280" : "white"} />
    </TouchableOpacity>
  </View>

  <Text style={styles.usersText}>users</Text>
</View>


              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Share Button */}
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  isCreating && styles.shareButtonDisabled
                ]}
                onPress={handleCreateGroup}
                disabled={isCreating}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.shareButtonGradient}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Share2 size={20} color="white" />
                      <Text style={styles.shareButtonText}>Share</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
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
    padding: 12,
  },
  modalContainer: {
    width: width*0.98,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    fontWeight: '600',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  serviceLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: '#323232',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    marginBottom: 12,
  },
  serviceLogo: {
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  earningsCard: {
    backgroundColor: '#042f1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#042f1a',
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 24,
    width: '100%',
  }, 
  earningsText: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
    fontWeight: '500',
  }, 
  shareLimitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24, 
  },
  shareLimitLabel: {
    fontSize: 13,
    color: 'white',
  },
  shareLimitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  limitButton: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(75, 85, 99, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitDisplay: {
    width: 28,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  limitNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  usersText: {
    fontSize: 13,
    color: '#fff', 
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  shareButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  successSpinner: {
    marginTop: 16,
  },
});