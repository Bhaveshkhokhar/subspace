import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SvgUri } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  TrendingUp,
  Package,
  Calendar,
  CreditCard,
  Plus,
  Share2,
  Clock,
  Users,
  Zap,
  ChevronRight,
  Wallet,
  Bell,
  Settings,
  Gift,
  MessageSquare,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import { useFocusEffect } from 'expo-router';
import SubscriptionManagementModal from '@/components/SubscriptionManagementModal';
import ShareSubscriptionModal from '@/components/ShareSubscriptionModal';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import {HomeShimmer}  from '@/components/shimmer';

const { width, height } = Dimensions.get('window');

interface UserProfile {
  dp: string;
  fullname: string;
}

interface UserSubscription {
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
}

interface BBPSOption {
  id: string;
  icon: string;
  data: {
    args?: {
      brand_id?: string;
    };
    route: string;
  };
  type: string;
  name: string;
  discount_text: string;
  created_at: string;
}

interface PaymentData {
  due_amount: number;
  bbps_options: BBPSOption[];
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    due_amount: 0,
    bbps_options: []
  });
  const [userProfile, setUserProfile] = useState<UserProfile>({
    dp: '',
    fullname: '',
  });
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedSubscriptionForShare, setSelectedSubscriptionForShare] = useState<UserSubscription | null>(null);
  const [subscriptionSectionRef, setSubscriptionSectionRef] = useState<View | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  // Refetch subscriptions when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        const userId = await storage.getUserId();
        if (userId) {
          fetchUserSubscriptions(userId);
          loadUserProfileFromStorage();
        }
      };
      fetchData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const authToken = await storage.getAuthToken();
      const userId = await storage.getUserId();

      if (authToken && userId) {
        await Promise.all([
          loadUserProfileFromStorage(),
          fetchUserSubscriptions(userId),
          fetchPaymentOptions(userId)
        ]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadUserProfileFromStorage = async () => {
    try {
      // Get user profile data from AsyncStorage
      const dp = await AsyncStorage.getItem('dp');
      const fullname = await AsyncStorage.getItem('fullname');

      setUserProfile({
        dp: dp || '',
        fullname: fullname || ''
      });
    } catch (error) {
      console.error('Error loading user profile from storage:', error);
      // Fallback to empty values if storage read fails
      setUserProfile({
        dp: '',
        fullname: ''
      });
    }
  };

  const fetchUserSubscriptions = async (userId: string) => {
    setIsLoadingSubscriptions(true);
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query GetUserSubs($user_id: uuid = "", $limit: Int, $offset: Int) {
              __typename
              whatsub_users_subscription(where: {user_id: {_eq: $user_id}, whatsub_service: {status: {_eq: "active"}}, status: {_neq: "inactive"}}, order_by: [{expiring_at: asc_nulls_last}, {created_at: asc}], limit: $limit, offset: $offset) {
                __typename
                service_image_url
                id
                expiring_at
                status
                type
                room_id
                price
                share_limit
                service_name
                plan
                service_id
                plan_id
                is_public
                whatsub_plan {
                  __typename
                  duration
                  duration_type
                  accounts
                }
              }
            }
          `,
          variables: {
            user_id: userId,
            limit: 10,
            offset: 0
          }
        })
      });

      const data = await response.json();
      setSubscriptions(data.data?.whatsub_users_subscription || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  const fetchPaymentOptions = async (userId: string) => {
    setIsLoadingPayments(true);
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query GetBBPSOptionsAndDue($user_id: uuid!) {
              __typename
              w_getDue(request: {user_id: $user_id}) {
                __typename
                due_amount
              }
              whatsubGetBBPSOptionsHome(request: {user_id: $user_id}) {
                __typename
                bbps_options {
                  __typename
                  icon
                  data
                  type
                  name
                  id
                  discount_text
                  created_at
                }
              }
            }
          `,
          variables: {
            user_id: userId
          }
        })
      });

      const data = await response.json();
      setPaymentData({
        due_amount: data.data?.w_getDue?.due_amount || 0,
        bbps_options: data.data?.whatsubGetBBPSOptionsHome?.bbps_options || []
      });
    } catch (error) {
      console.error('Error fetching payment options:', error);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadUserData();
    setIsRefreshing(false);
  };

  const handleManageSubscription = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setShowSubscriptionModal(true);
  };

  const handleModalClose = () => {
    setShowSubscriptionModal(false);
    setSelectedSubscription(null);
  };

  const handleModalSuccess = () => {
    setShowSubscriptionModal(false);
    setSelectedSubscription(null);
    // Refresh just the subscriptions list
    const refreshSubscriptions = async () => {
      const userId = await storage.getUserId();
      if (userId) {
        fetchUserSubscriptions(userId);
      }
    };
    refreshSubscriptions();

    // Scroll to the subscriptions section
    setTimeout(() => {
      if (subscriptionSectionRef) {
        subscriptionSectionRef.measureInWindow((x, y) => {
          if (y < 0) {
            scrollViewRef.current?.scrollTo({ y: y, animated: true });
          }
        });
      }
    }, 500);
  };

  const handleShareSubscription = (subscription: UserSubscription) => {
    setSelectedSubscriptionForShare(subscription);
    setShowShareModal(true);
  };

  const handleShareModalClose = () => {
    setShowShareModal(false);
    setSelectedSubscriptionForShare(null);
  };

  const handleShareModalSuccess = () => {
    setShowShareModal(false);

    // Fetch updated subscription data for the shared subscription
    const refreshSharedSubscription = async () => {
      if (!selectedSubscriptionForShare) return;

      try {
        const authToken = await storage.getAuthToken();
        if (!authToken) return;

        const response = await fetch('https://db.subspace.money/v1/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            query: `
             query Query($id: uuid!) {
               __typename
               whatsub_users_subscription(where: {id: {_eq: $id}}) {
                 __typename
                 service_image_url
                 id
                 expiring_at
                 status
                 type
                 room_id
                 price
                 service_name
                 plan
                 whatsub_plan {
                   __typename
                   duration
                   duration_type
                   accounts
                 }
               }
             }
           `,
            variables: {
              id: selectedSubscriptionForShare.id
            }
          })
        });

        const data = await response.json();
        const updatedSubscription = data.data?.whatsub_users_subscription?.[0];

        if (updatedSubscription) {
          // Update the specific subscription in the list
          setSubscriptions(prevSubscriptions =>
            prevSubscriptions.map(sub =>
              sub.id === selectedSubscriptionForShare.id
                ? { ...sub, ...updatedSubscription }
                : sub
            )
          );
        }
      } catch (error) {
        console.error('Error refreshing subscription:', error);
      }
    };

    refreshSharedSubscription();
    setSelectedSubscriptionForShare(null);
    showSuccess('Group created successfully!');
  };

  const handleAddSubscriptions = () => {
    router.push('/trending');
  };

  const navigateToRoom = (subscription: UserSubscription) => {
    router.push({
      pathname: '/(tabs)/chat/conversation',
      params: {
        roomId: subscription.room_id,
        friendId: '',
        friendName: subscription.service_name,
        roomDp: subscription.service_image_url,
        roomType: subscription.type,
      },
    });
  };

  const handleViewAllPayments = () => {
    router.push('/quickPaymentsPage');
  };

  const handleBBPSOptionPress = (option: BBPSOption) => {
    try {
      let data;
      if (typeof option.data === 'string') {
        try {
          data = JSON.parse(option.data);
        } catch (parseError) {
          console.error('Error parsing option data:', parseError);
          return;
        }
      } else {
        data = option.data;
      }
      if (data?.args?.brand_id) {
        router.push({
          pathname: '/product-details',
          params: { id: data.args.brand_id }
        });
      }

      // Handle electricity bill navigation
      if (data?.route?.toLowerCase().includes('electricity')) {
        router.push('/electricity-recharge');
        return;
      }

      // Handle mobile recharge navigation
      if (data?.route?.toLowerCase().includes('mobile')) {
        router.push('/mobile-recharge');
        return;
      }

      // Handle DTH recharge navigation
      if (data?.route?.toLowerCase().includes('dth')) {
        router.push('/dth-recharge');
        return;
      }

      // Handle FASTag recharge navigation
      if (data?.route?.toLowerCase().includes('fastag')) {
        router.push('/fastag-recharge');
        return;
      }

    } catch (error) {
      console.error('Error handling option click:', error);
      showError('Failed to process payment option');
    }
  };

  const handleExplorePress = () => {
    router.push('/(tabs)/explore');
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Expired', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days left`, color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' };
    } else if (diffDays <= 30) {
      return { text: `${diffDays} days left`, color: '#EAB308', bgColor: 'rgba(234, 179, 8, 0.1)' };
    } else {
      return { text: `${diffDays} days left`, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' };
    }
  };

  // Show shimmer while loading initial data
  if (isLoadingSubscriptions && subscriptions.length === 0) {
    return <HomeShimmer />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.1)', 'rgba(168, 85, 247, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.userSection}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                {userProfile?.dp ? (
                  <Image
                    source={{ uri: userProfile.dp }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {(userProfile?.fullname || 'User').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeText}>{t('home.welcomeBack')},</Text>
                <Text style={styles.userName}>
                  {userProfile?.fullname || t('common.welcome')}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.title}>{t('home.title')}</Text>
          <Text style={styles.subtitle}>
            {t('home.subtitle')}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleExplorePress}
            >
              <Zap size={18} color="white" />
              <Text style={styles.primaryButtonText}>{t('home.explore')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(tabs)/wallet')}
            >
              <Wallet size={18} color="#6366F1" />
              <Text style={styles.secondaryButtonText}>{t('home.wallet')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Due Amount Alert */}
        {paymentData.due_amount > 0 && (
          <View style={styles.dueAmountAlert}>
            <View style={styles.alertContent}>
              <View style={styles.alertIcon}>
                <Bell size={20} color="#F59E0B" />
              </View>
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>{t('home.paymentDue')}</Text>
                <Text style={styles.alertSubtitle}>
                  {t('home.pendingPayments')}: ₹{paymentData.due_amount.toFixed(2)}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.payNowButton}>
              <Text style={styles.payNowText}>{t('home.payNow')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/trending')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                <Plus size={20} color="#6366F1" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{t('home.addSubscriptions')}</Text>
                <Text style={styles.actionSubtitle}>{t('home.addSubscriptionsSubtitle')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/quickPaymentsPage')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <CreditCard size={20} color="#F59E0B" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{t('home.billPayments')}</Text>
                <Text style={styles.actionSubtitle}>{t('home.billPaymentsSubtitle')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{t('home.quickPayments')}</Text>
              <Text style={styles.sectionSubtitle}>{t('home.quickPaymentsSubtitle')}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleViewAllPayments}
            >
              <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
              <ChevronRight size={16} color="#6366F1" />
            </TouchableOpacity>
          </View>

          {isLoadingPayments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}></Text>
            </View>
          ) : paymentData.bbps_options.length === 0 ? (
            <View style={styles.emptyPayments}>
              <CreditCard size={24} color="#4B5563" />
              <Text style={styles.emptyPaymentsText}>{t('quickPayments.noOptions')}</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paymentsScroll}
            >
              {paymentData.bbps_options.slice(0, 12).map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.paymentOption}
                  onPress={() => handleBBPSOptionPress(option)}
                >
                  <View style={styles.paymentIcon}>
                    {/* <Image
                      source={{ uri: option.icon }}
                      style={styles.paymentImage}
                      resizeMode="contain"
                    /> */}
                    <SvgUri
                      uri={option.icon} // https://cdn.subspace.money/bbps_icons/playstore2.svg
                      width={32}
                      height={32}
                    />
                  </View>
                  <View>
                    <Text style={styles.paymentName}>{option.name}</Text>
                  </View>
                  {option.discount_text && option.discount_text !== "0" && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>
                        {option.discount_text}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recurring Expenses */}
        <View
          style={styles.section}
          ref={ref => setSubscriptionSectionRef(ref)}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{t('home.recurringExpenses')}</Text>
              <Text style={styles.sectionSubtitle}>{t('home.recurringExpensesSubtitle')}</Text>
            </View>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
              <ChevronRight size={16} color="#6366F1" />
            </TouchableOpacity>
          </View>

          {isLoadingSubscriptions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}></Text>
            </View>
          ) : subscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Package size={32} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>{t('home.noSubscriptions')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('home.noSubscriptionsSubtitle')}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleAddSubscriptions}
              >
                <Plus size={20} color="white" />
                <Text style={styles.emptyButtonText}>{t('nav.explore')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subscriptionsScroll}
            >
              {subscriptions.slice(0, 6).map((subscription) => {
                const expiryInfo = formatExpiryDate(subscription.expiring_at);
                const userPrice = ((subscription.share_limit - 1) * (subscription.price / subscription.share_limit))

                return (
                  <View
                    key={subscription.id}
                    style={styles.subscriptionCard}
                  >
                    <View style={styles.subscriptionHeader}>
                      <View style={styles.subscriptionLogo}>
                        <Image
                          source={{ uri: subscription.service_image_url }}
                          style={styles.logoImage}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.subscriptionInfo}>
                        <Text style={styles.subscriptionName}>
                          {subscription.service_name}
                        </Text>
                        <Text style={styles.subscriptionPlan}>
                          {subscription.plan}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.subscriptionDetails}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>{t('subscription.yourShare')}:</Text>
                        <Text style={styles.priceValue}>
                          ₹{subscription.price}/{subscription.whatsub_plan.duration > 1 ? subscription.whatsub_plan.duration : ''}{subscription.whatsub_plan.duration_type === 'years' ? 'yr' : 'mo'}
                        </Text>
                      </View>

                      <View style={[styles.expiryRow, { backgroundColor: expiryInfo.bgColor }]}>
                        <Clock size={16} color={expiryInfo.color} />
                        <Text style={[styles.expiryText, { color: expiryInfo.color }]}>
                          {expiryInfo.text}
                        </Text>
                      </View>

                      <View style={styles.subscriptionFooter}>
                        <Text style={styles.subscriptionStatus}>
                          {subscription.type} • {subscription.status}
                        </Text>
                        <TouchableOpacity onPress={() => handleManageSubscription(subscription)}>
                          <Text style={styles.manageText}>{t('subscription.manage')}</Text>
                        </TouchableOpacity>
                      </View>
                      {subscription.room_id ? (
                        <TouchableOpacity
                          style={styles.shareIconButton}
                          onPress={() => navigateToRoom(subscription)}
                        >
                          <View style={styles.sharingRow}>
                            <Text style={styles.sharingText}>{t('subscription.navigate')}</Text>
                          </View>
                        </TouchableOpacity>
                      ) : subscription.share_limit > 1 ? (
                        <TouchableOpacity
                          style={styles.shareIconButton}
                          onPress={() => handleShareSubscription(subscription)}
                        >
                          <View style={styles.sharingRow}>
                            <Text style={styles.sharingText}>
                              {t('subscription.shareSubscription', { userPrice })}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <View style={[styles.gridIcon, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                <TrendingUp size={20} color="#6366F1" />
              </View>
              <View style={styles.gridContent}>
                <Text style={styles.gridTitle}>{t('home.exploreServices')}</Text>
                <Text style={styles.gridSubtitle}>{t('home.discoverSubscriptions')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => router.push('/public-groups')}
            >
              <View style={[styles.gridIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Users size={20} color="#10B981" />
              </View>
              <View style={styles.gridContent}>
                <Text style={styles.gridTitle}>{t('home.joinGroups')}</Text>
                <Text style={styles.gridSubtitle}>{t('home.shareCosts')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gridCard}
              onPress={() => router.push('/(tabs)/account')}
            >
              <View style={[styles.gridIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Settings size={20} color="#F59E0B" />
              </View>
              <View style={styles.gridContent}>
                <Text style={styles.gridTitle}>{t('home.manageAccount')}</Text>
                <Text style={styles.gridSubtitle}>{t('home.updateProfile')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Subscription Management Modal */}
      <SubscriptionManagementModal
        isVisible={showSubscriptionModal}
        onClose={handleModalClose}
        subscription={selectedSubscription}
        onSuccess={handleModalSuccess}
        mode="manage"
      />

      {/* Share Subscription Modal */}
      <ShareSubscriptionModal
        isVisible={showShareModal}
        onClose={handleShareModalClose}
        subscription={selectedSubscriptionForShare}
        onSuccess={handleShareModalSuccess}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  scrollView: {
    marginTop: 30,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#9aa0abff',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  // giftButton: {
  //   width: 40,
  //   height: 40,
  //   borderRadius: 20,
  //   backgroundColor: 'rgba(245, 158, 11, 0.2)',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   borderWidth: 1,
  //   borderColor: 'rgba(245, 158, 11, 0.3)',
  // },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
    lineHeight: 30,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  dueAmountAlert: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  payNowButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  payNowText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  section: {
    marginVertical: 12, 
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  quickActions: {
    flexDirection: 'column',
    paddingHorizontal: 10,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 1,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyState: {
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    marginHorizontal: 20,
    padding: 30,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  subscriptionsScroll: {
    paddingHorizontal: 10,
    gap: 8,
  },
  subscriptionCard: {
    width: width * 0.88,
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.9)',
    paddingTop: 16,
    paddingBottom: 0,
    paddingHorizontal: 8,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 8,
  },
  logoImage: {
    width: 38,
    height: 38,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  subscriptionPlan: {
    fontSize: 14,
    color: '#6B7290',
  },
  subscriptionDetails: {
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366F1',
  },
  sharingRow: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#042F1A',
    backgroundColor: '#042F1A',
  },
  sharingText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '800',
    color: '#fff',
  },
  shareIconButton: {
    padding: 4,
    borderRadius: 8,
    fontWeight: '500',
    backgroundColor: '#042F1A10',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  expiryText: {
    fontSize: 16,
    fontWeight: '500',
  },
  subscriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 55, 55, 0.5)',
    paddingTop: 12,
  },
  subscriptionStatus: {
    fontSize: 14,
    color: '#4B5566',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manageText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  emptyPayments: {
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    marginHorizontal: 20,
    padding: 24,
  },
  emptyPaymentsText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  paymentsScroll: {
    paddingHorizontal: 10,
    gap: 8,
  },
  paymentOption: {
    width: 96,
    alignItems: 'center',
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    padding: 8,
    overflow: 'hidden',
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  paymentImage: {
    width: 32,
    height: 32,
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  discountBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  discountText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  quickActionsGrid: {
    paddingHorizontal: 10,
    gap: 4,
    paddingBottom: 0,
  },
  gridCard: {
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  gridIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gridContent: {
    flex: 1,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 1,
  },
  gridSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
});