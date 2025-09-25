import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Users,
  Globe,
  Info,
  CircleAlert as AlertCircle
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface UserSubscription {
  id: string;
  service_name: string;
  service_image_url: string;
  blurhash: string;
  plan: string;
  is_public: boolean;
  whatsub_service: {
    whatsub_class: {
      name: string;
    };
  };
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function SharedSubscriptionsScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingSubscriptions, setUpdatingSubscriptions] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken) {
      fetchSubscriptions();
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

  const fetchSubscriptions = async () => {
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
            query checkLimit($user_id: uuid, $limit: Int, $offset: Int) {
              __typename
              whatsub_users_subscription(where: {user_id: {_eq: $user_id}, status: {_eq: "active"}}, order_by: {created_at: desc}, limit: $limit, offset: $offset) {
                __typename
                id
                service_name
                service_image_url
                blurhash
                plan
                is_public
                whatsub_service {
                  __typename
                  whatsub_class {
                    __typename
                    name
                  }
                }
              }
            }
          `,
          variables: {
            user_id: userId,
            limit: 20,
            offset: 0
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error fetching subscriptions:', data.errors);
        showError('Failed to load subscriptions');
        return;
      }

      setSubscriptions(data.data?.whatsub_users_subscription || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      showError('Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchSubscriptions();
    setIsRefreshing(false);
  };

  const handleSubscriptionToggle = async (subscriptionId: string, currentValue: boolean) => {
    if (!userId || !authToken) return;

    const newValue = !currentValue;

    // Add to updating set
    setUpdatingSubscriptions(prev => new Set(prev).add(subscriptionId));

    // Optimistically update UI
    setSubscriptions(prev =>
      prev.map(sub =>
        sub.id === subscriptionId
          ? { ...sub, is_public: newValue }
          : sub
      )
    );

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation Mutation($sub_id: uuid, $is_public: Boolean) {
              __typename
              update_whatsub_users_subscription(where: {id: {_eq: $sub_id}}, _set: {is_public: $is_public}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            sub_id: subscriptionId,
            is_public: newValue
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error updating subscription visibility:', data.errors);
        // Revert optimistic update
        setSubscriptions(prev =>
          prev.map(sub =>
            sub.id === subscriptionId
              ? { ...sub, is_public: currentValue }
              : sub
          )
        );
        showError('Failed to update subscription visibility');
        return;
      }

      if (data.data?.update_whatsub_users_subscription?.affected_rows > 0) {
        showSuccess(newValue ? 'Subscription is now public' : 'Subscription is now private');
      } else {
        // Revert optimistic update
        setSubscriptions(prev =>
          prev.map(sub =>
            sub.id === subscriptionId
              ? { ...sub, is_public: currentValue }
              : sub
          )
        );
        showError('Failed to update subscription visibility');
      }
    } catch (error) {
      console.error('Error updating subscription visibility:', error);
      // Revert optimistic update
      setSubscriptions(prev =>
        prev.map(sub =>
          sub.id === subscriptionId
            ? { ...sub, is_public: currentValue }
            : sub
        )
      );
      showError('Failed to update subscription visibility');
    } finally {
      // Remove from updating set
      setUpdatingSubscriptions(prev => {
        const next = new Set(prev);
        next.delete(subscriptionId);
        return next;
      });
    }
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
          <Text style={styles.headerTitle}>Shared Subscriptions</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shared Subscriptions</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >


        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Subscriptions with toggle 'ON' are public, switch toggle to 'OFF' to private. Private subscriptions will not be shown to your friends.
          </Text>
        </View>

        {/* Subscriptions List */}
        <View style={styles.subscriptionsContainer}>
          {subscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users size={48} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
              <Text style={styles.emptySubtitle}>
                Add subscriptions to manage their visibility settings
              </Text>
            </View>
          ) : (
            subscriptions.map((subscription) => (
              <View key={subscription.id} style={styles.subscriptionItem}>
                <View style={styles.subscriptionContent}>
                  <View style={styles.subscriptionLogoContainer}>
                    <Image
                      source={{ uri: subscription.service_image_url }}
                      style={styles.subscriptionLogo}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.subscriptionInfo}>
                    <Text style={styles.subscriptionName} numberOfLines={1}>
                      {subscription.plan}
                    </Text>
                    <Text style={styles.subscriptionService} numberOfLines={1}>
                      {subscription.service_name}
                    </Text>
                  </View>

                  <View style={styles.subscriptionToggle}>
                    {updatingSubscriptions.has(subscription.id) ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <Switch
                        value={subscription.is_public}
                        onValueChange={() => handleSubscriptionToggle(subscription.id, subscription.is_public)}
                        trackColor={{ false: '#374151', true: '#6366F1' }}
                        thumbColor={subscription.is_public ? '#FFFFFF' : '#9CA3AF'}
                        ios_backgroundColor="#374151"
                      />
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
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
    fontWeight: '800',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 32,
    height: 32,
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
  descriptionContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginHorizontal: 10,
    padding: 10,
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: '#93C5FD',
    lineHeight: 20,
  },
  subscriptionsContainer: {
    paddingHorizontal: 10,
    marginBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  subscriptionItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginBottom: 6,
    overflow: 'hidden',
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subscriptionLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  subscriptionLogo: {
    width: 36,
    height: 36,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  subscriptionService: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  subscriptionToggle: {
    marginLeft: 14,
  },
});