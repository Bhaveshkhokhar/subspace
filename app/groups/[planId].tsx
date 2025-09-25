import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Search,
  Users,
  Star,
  Clock,
  MessageSquare,
  Shield,
  Crown,
  Calendar,
  Award
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import { SearchBar } from '@/components/SearchBar';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';

const { width } = Dimensions.get('window');

interface GroupMember {
  share_limit: number;
  number_of_users: number;
  room_id: string;
  room_created_at: string;
  room_dp: string;
  blurhash: string;
  user_id: string;
  fullname: string;
  dp: string;
  last_active: string;
  user_blurhash: string;
  average_rating: number;
  number_of_ratings: number;
  group_limit: number;
  hide_limit: number;
  price: number;
  expiring_at: string;
  premium: boolean;
}

interface PlanDetails {
  plan_name: string;
  service_name: string;
  service_image_url: string;
}

export default function GroupsPage() {
  const { planId } = useLocalSearchParams();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<GroupMember[]>([]);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'expiry'>('newest');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { toast, showSuccess, showError, hideToast } = useToast();
  const getRating = (rating: number): string => {
  const result = rating / 1000; // convert to thousands
  return `${result.toFixed(3)}k`; // format to 3 decimals and add 'k'
};

  useEffect(() => {
    if (planId) {
      fetchGroups();
      fetchPlanDetails();
    }
  }, [planId]);

  const fetchPlanDetails = async () => {
    if (!planId) return;

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
            query GetPlanDetails($plan_id: uuid) {
              __typename
              whatsub_plans(where: {id: {_eq: $plan_id}}) {
                __typename
                plan_name
                whatsub_service {
                  __typename
                  service_name
                  image_url
                }
              }
            }
          `,
          variables: {
            plan_id: planId
          }
        })
      });

      const data = await response.json();
      const plan = data.data?.whatsub_plans?.[0];

      if (plan) {
        setPlanDetails({
          plan_name: plan.plan_name,
          service_name: plan.whatsub_service.service_name,
          service_image_url: plan.whatsub_service.image_url
        });
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
    }
  };

  const fetchGroups = async () => {
    if (!planId) return;

    setIsLoading(true);
    setError(null);

    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) {
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
            query Query($plan_id: uuid) {
              __typename
              whatsub_distinct_user_subscription_mv(where: {plan_id: {_eq: $plan_id}}, distinct_on: user_id, order_by: {user_id: asc, room_created_at: asc}) {
                __typename
                share_limit
                number_of_users
                room_id
                room_created_at
                room_dp
                blurhash
                user_id
                fullname
                dp
                last_active
                user_blurhash
                average_rating
                number_of_ratings
                group_limit
                hide_limit
                price
                expiring_at
                premium
              }
            }
          `,
          variables: {
            plan_id: planId
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        setError('Failed to fetch groups');
        return;
      }

      setGroups(data.data?.whatsub_distinct_user_subscription_mv || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to fetch groups');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchGroups();
    setIsRefreshing(false);
  };

  const filteredAndSortedGroups = groups
    .filter(group =>
      group.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchQuery === ''
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.room_created_at).getTime() - new Date(a.room_created_at).getTime();
        case 'rating':
          return (b.average_rating - a.average_rating) || (b.number_of_ratings - a.number_of_ratings);
        case 'expiry':
          return new Date(a.expiring_at).getTime() - new Date(b.expiring_at).getTime();
        default:
          return 0;
      }
    });

  const formatDate = (dateString: string, type: string = "") => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.abs(Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${Math.abs(diffDays)} ${type === 'created' ? 'days ago' : 'days'}`;
    } else {
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());

    const diffSeconds = Math.floor(diffTime / 1000);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 1) {
      return `${t('chat.activeNow')}`;
    } else if (diffMinutes < 1) {
      return `${t('common.active')} ${diffSeconds} ${diffSeconds === 1 ? t('common.second') : t('common.seconds')} ${t('common.ago')}`;
    } else if (diffHours < 1) {
      return `${t('common.active')} ${diffMinutes} ${diffMinutes === 1 ? t('common.minute') : t('common.minutes')} ${t('common.ago')}`;
    } else if (diffDays < 1) {
      return `${t('common.active')} ${diffHours} ${diffHours === 1 ? t('common.hour') : t('common.hours')} ${t('common.ago')}`;
    } else {
      return `${t('common.active')} ${diffDays} ${diffDays === 1 ? t('common.day') : t('common.days')} ${t('common.ago')}`;
    }
  };

  const getAvailableSlots = (group: GroupMember) => {
    return group.group_limit - group.number_of_users;
  };

  const isGroupAvailable = (group: GroupMember) => {
    return getAvailableSlots(group) > 0;
  };

  const handleJoinGroup = (group: GroupMember) => {
    if (group.room_id) {
      router.push({
        pathname: '/checkout',
        params: {
          planDetail: JSON.stringify(planDetails),
          group: JSON.stringify(group),
          roomId: group.room_id
        }
      });
    }
  };

  const handleChatWithUser = async (group: GroupMember) => {
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        showError('Please login to start a chat');
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
            mutation createPrivateRoom($user_id: uuid!, $other_id: uuid!) {
              __typename
              createAnonymousRoom(request: {other_id: $other_id, user_id: $user_id}) {
                __typename
                id
              }
            }
          `,
          variables: {
            user_id: userId,
            other_id: group.user_id
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        showError('Failed to create chat room');
        return;
      }

      const roomId = data.data?.createAnonymousRoom?.id;
      if (roomId) {
        // Navigate to the conversation
        router.push({
          pathname: '/(tabs)/chat/conversation',
          params: {
            roomId: roomId,
            friendId: group.user_id,
            friendName: group.fullname,
            roomDp: group.dp || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
            roomType: 'anonymous'
          }
        });
      } else {
        showError('Failed to create chat room');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      showError('Failed to create chat room');
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/public-groups');
    }
  };

  if (isLoading && groups.length === 0) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}></Text>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Users size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>{t('group.failedToLoadGroups')}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchGroups}>
            <Text style={styles.retryButtonText}>{t('error.tryAgain')}</Text>
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 5 }}>
          <SearchBar
            placeholder={t('group.searchPlaceHolder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Sort Options */}
      <View style={styles.sortSection}>
        <Text style={styles.sortLabel}>{t('group.sortBy')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortButtons}
        >
          {(['newest', 'rating', 'expiry'] as const).map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[
                styles.sortButton,
                sortBy === sort && styles.activeSortButton
              ]}
              onPress={() => setSortBy(sort)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === sort && styles.activeSortButtonText
                ]}
              >
                {sort === 'newest' ? t('group.newest') :
                  sort === 'rating' ? t('group.rating') :
                    sort === 'expiry' ? t('group.expiry') : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView
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
        {/* Groups List */}
        {filteredAndSortedGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Users size={48} color="#1F1F1F" />
            </View>
            <Text style={styles.emptyTitle}>{t('group.noGroupsFound')}</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `${t('group.noGroupsForSearch')} "${searchQuery}"`
                : t('group.noGroupsForPlan')
              }
            </Text>
            <View style={styles.emptyActions}>
              {searchQuery && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchButtonText}>{t('group.showAllGroups')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.goBackButton}
                onPress={handleBackPress}
              >
                <Text style={styles.goBackButtonText}>{t('group.goBack')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.groupsList}>
            {filteredAndSortedGroups.map((group) => {
              const availableSlots = getAvailableSlots(group);
              const isAvailable = isGroupAvailable(group);
              const pricePerUser = Math.ceil(group.price / group.share_limit);

              return (
                <View
                  key={`${group.room_id}-${group.user_id}`}
                  style={[
                    styles.groupCard,
                    !isAvailable && styles.groupCardDisabled
                  ]}
                >
                  {/* Header with Group Owner */}
                  <LinearGradient
                    colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
                    style={styles.groupHeader}
                  >
                    <View style={styles.ownerSection}>
                      <View style={styles.ownerAvatar}>
                        <View style={styles.avatarGradient}>
                          <Image
                            source={{
                              uri: group.dp || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2'
                            }}
                            style={styles.avatarImage}
                            resizeMode="cover"
                          />
                        </View>
                        {group.premium && (
                          <View style={styles.premiumBadge}>
                            <Crown size={12} color="white" />
                          </View>
                        )}
                      </View>

                      <View style={styles.ownerInfo}>
                        <Text style={styles.ownerName}>{group.fullname}</Text>
                        <Text style={styles.lastActive}>
                          {formatLastActive(group.last_active)}
                        </Text>
                      </View>
                      {group.average_rating > 0 && (
                        <TouchableOpacity
                          style={styles.ratingContainer}
                          onPress={() => router.push({
                            pathname: '/groups/user-rating',
                            params: {
                              userId: group.user_id,
                              userName: group.fullname,
                              planId: planId,
                            }
                          })}
                          activeOpacity={0.7}
                        >
                          <Star size={14} color="#F59E0B" fill="#F59E0B" />
                          <Text style={styles.ratingText}>
                            {getRating(group?.average_rating || 0)}
                          </Text>
                          <Text style={styles.ratingCount}>
                            ({group.number_of_ratings})
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </LinearGradient>

                  {/* Group Details */}
                  <View style={styles.groupContent}>
                    {/* Pricing */}
                    <View style={styles.pricingSection}>
                      <View style={styles.priceInfo}>
                        <Text style={styles.priceAmount}>₹{pricePerUser}</Text>
                        <Text style={styles.priceLabel}>{t('explore.perUser')}</Text>
                      </View>
                      {/* Availability Status */}
                      <View style={[
                        styles.availabilityStatus,
                        isAvailable ? styles.availableStatus : styles.fullStatus
                      ]}>
                        <View style={[
                          styles.statusIndicator,
                          { backgroundColor: isAvailable ? '#10B981' : '#EF4444' }
                        ]} />
                        <Text style={[
                          styles.statusText,
                          { color: isAvailable ? '#10B981' : '#EF4444' }
                        ]}>
                          {isAvailable
                            ? `${availableSlots} ${availableSlots > 1 ? t('group.slotsAvailable') : t('group.slotAvailable')}`
                            : t('group.full')
                          }
                        </Text>
                      </View>
                    </View>
                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.joinButton,
                          !isAvailable && styles.joinButtonDisabled
                        ]}
                        onPress={() => handleJoinGroup(group)}
                        disabled={!isAvailable}
                      >
                        <Text style={[
                          styles.joinButtonText,
                          !isAvailable && styles.joinButtonTextDisabled
                        ]}>
                          {isAvailable ? t('group.join') : t('group.full')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => handleChatWithUser(group)}
                      >
                        <MessageSquare size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
    flexGrow: 1,
    paddingVertical: 20,
  },
  scrollView: {
    flex: 1,
    marginBottom: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 10,
    paddingTop: 30,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    fontWeight: '800',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sortSection: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 4,
    marginRight: 6,
  },
  sortButtons: {
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  activeSortButton: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeSortButtonText: {
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearSearchButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  clearSearchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  goBackButton: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  goBackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  groupsList: {
    paddingHorizontal: 10,
    gap: 5,
  },
  groupCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  groupCardDisabled: {
    opacity: 0.75,
  },
  groupHeader: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  ownerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  ownerAvatar: {
    position: 'relative',
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366F1',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  premiumBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    textDecorationLine: 'underline',
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  ratingCount: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
  lastActive: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  groupContent: {
    paddingVertical: 10,
    paddingHorizontal: 14,

  },
  pricingSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E400',
  },
  priceLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  totalInfo: {
    marginTop: 4,
  },
  totalText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  availabilityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },
  availableStatus: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  fullStatus: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  joinButtonTextDisabled: {
    color: '#9CA3AF',
  },
  chatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

});