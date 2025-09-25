import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Users,
  ShoppingCart,
  Gift,
  Share as ShareIcon,
  Sparkles,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface UserProfile {
  dp?: string | null;
  blurhash?: string | null;
  fullname?: string | null;
  whatsub_referral?: {
    refer_link?: string | null;
  } | null;
}

interface SavingsData {
  buy_debit?: number | null;
  group_join_credit?: number | null;
  group_join_debit?: number | null;
  paid_via_subspace?: number | null;
  savings?: number | null;
}

interface TopSaver {
  savings?: number | null;
  auth_fullname?: {
    fullname?: string | null;
    dp?: string | null;
  } | null;
}

interface FriendSavings {
  savings?: number | null;
  auth_fullname?: {
    fullname?: string | null;
    dp?: string | null;
  } | null;
}

interface SavingsResponse {
  auth?: UserProfile[] | null;
  savings?: SavingsData[] | null;
  whatsub_savings_total?: TopSaver[] | null;
  w_getFriendsSavings?: FriendSavings[] | null;
}

export const unstable_settings = {
  href: null,
};

export default function MoneySavedScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [savingsData, setSavingsData] = useState<SavingsData | null>(null);
  const [topSavers, setTopSavers] = useState<TopSaver[]>([]);
  const [friendsSavings, setFriendsSavings] = useState<FriendSavings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken) {
      fetchSavingsData();
    }
  }, [userId, authToken]);

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

  const getInitials = (name?: string | null) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0]?.toUpperCase() || '';
    const last = parts[parts.length - 1]?.[0]?.toUpperCase() || '';
    return first + last;
  };

  const fetchSavingsData = async () => {
    if (!userId || !authToken) return;

    setIsLoading(true);
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            query savings($user_id: uuid!) {
              auth(where: {id: {_eq: $user_id}}) {
                dp
                blurhash
                fullname
                whatsub_referral {
                  refer_link
                }
              }
              savings: whatsub_savings_total(where: {user_id: {_eq: $user_id}}) {
                buy_debit
                group_join_credit
                group_join_debit
                paid_via_subspace
                savings
              }
              whatsub_savings_total(order_by: {savings: desc_nulls_last}, limit: 5) {
                savings
                auth_fullname {
                  fullname
                  dp
                }
              }
              w_getFriendsSavings(request: {user_id: $user_id}) {
                savings
                auth_fullname
              }
            }
          `,
          variables: {
            user_id: userId,
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error fetching savings data:', data.errors);
        showError('Failed to load savings data');
        return;
      }

      const result = data.data as SavingsResponse;

      setUserProfile(result.auth?.[0] || null);
      setSavingsData(result.savings?.[0] || null);
      setTopSavers(result.whatsub_savings_total ?? []);
      setFriendsSavings(result.w_getFriendsSavings ?? []);
    } catch (error) {
      console.error('Error fetching savings data:', error);
      showError('Failed to load savings data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!userProfile?.whatsub_referral?.refer_link) {
      showError('Referral link not available');
      return;
    }

    try {
      const totalSavings = (savingsData?.savings ?? 0) / 100;
      const message = `I've saved ₹${totalSavings} using SubSpace! Join me and start saving on your subscriptions: ${userProfile.whatsub_referral.refer_link}`;

      await Share.share({
        message,
        title: 'Check out my savings on SubSpace!',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      showError('Failed to share');
    }
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return '₹0';
    return `₹${(amount / 100).toFixed(2)}`;
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
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Money Saved</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading your savings...</Text>
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
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Money Saved</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => { }}
          >
            {userProfile?.dp && !useFallback ? (
              <Image
                source={{ uri: userProfile.dp }}
                onError={() => setUseFallback(true)}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitial}>
                  {getInitials(userProfile?.fullname) || 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Savings Card */}
        <View style={styles.mainSavingsContainer}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainSavingsCard}
          >
            {/* Decorative Elements */}
            <View style={styles.decorativeElements}>
              <View style={[styles.decorativeShape, styles.shape1]} />
              <View style={[styles.decorativeShape, styles.shape2]} />
              <View style={[styles.decorativeShape, styles.shape3]} />
              <View style={[styles.decorativeShape, styles.shape4]} />
              <View style={[styles.decorativeShape, styles.shape5]} />
              <View style={[styles.decorativeShape, styles.shape6]} />
            </View>

            <View style={styles.savingsContent}>
              <Text style={styles.youSavedText}>You Saved</Text>
              <Text style={styles.savingsAmount}>
                {formatCurrency(savingsData?.savings)}
              </Text>

              <View style={styles.celebrationIcon}>
                <Sparkles size={24} color="white" />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Savings Breakdown */}
        <View style={styles.breakdownContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.breakdownScrollContent}
            style={styles.breakdownScroll}
          >
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownIcon}>
                <Users size={20} color="#6366F1" />
              </View>
              <Text style={styles.breakdownTitle}>Sharing{'\n'}Savings</Text>
              <Text style={styles.breakdownAmount}>
                Saved{'\n'}{formatCurrency(savingsData?.group_join_credit)}
              </Text>
            </View>

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownIcon}>
                <Users size={20} color="#10B981" />
              </View>
              <Text style={styles.breakdownTitle}>Sharing{'\n'}Earnings</Text>
              <Text style={styles.breakdownAmount}>
                Saved{'\n'}{formatCurrency(savingsData?.group_join_debit)}
              </Text>
            </View>

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownIcon}>
                <ShoppingCart size={20} color="#F59E0B" />
              </View>
              <Text style={styles.breakdownTitle}>Purchase{'\n'}Savings</Text>
              <Text style={styles.breakdownAmount}>
                Saved{'\n'}{formatCurrency(savingsData?.buy_debit)}
              </Text>
            </View>

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownIcon}>
                <Gift size={20} color="#EC4899" />
              </View>
              <Text style={styles.breakdownTitle}>Gift &{'\n'}Subs</Text>
              <Text style={styles.breakdownAmount}>
                Saved{'\n'}{formatCurrency(savingsData?.paid_via_subspace)}
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* Your Friends Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Friends</Text>
          <View style={styles.friendsContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 0 }}
              nestedScrollEnabled={true}
              style={{flex:1}}
            >
              {friendsSavings.length === 0 ? (
                <Text style={styles.noFriendsText}>
                  No Friends data available. Add more friends to see their savings.
                </Text>
              ) : (
                friendsSavings.map((friend, index) => (
                  <View key={index} style={styles.friendCard}>
                    <View style={styles.friendAvatar}>
                      {friend?.auth_fullname?.dp ? (
                        <Image
                          source={{ uri: friend?.auth_fullname?.dp }}
                          style={styles.topSaverImage}
                        />
                      ) : (
                        <Text style={styles.friendInitial}>
                          {friend?.auth_fullname?.fullname?.[0] || 'F'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>
                        {friend?.auth_fullname?.fullname}
                      </Text>
                      <Text style={styles.friendSavings}>
                        Saved {formatCurrency(friend?.savings)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>


        {/* Top Savers Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Savers</Text>
          <View style={styles.topSaversContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topSaversScrollContent}
              style={styles.topSaversScroll}
            >
              {topSavers?.map((saver, index) => (
                <View key={index} style={styles.topSaverCard}>
                  <View style={styles.topSaverAvatar}>
                    {saver?.auth_fullname?.dp ? (
                      <Image
                        source={{ uri: saver.auth_fullname.dp }}
                        style={styles.topSaverImage}
                      />
                    ) : (
                      <Text style={styles.topSaverInitial}>
                        {saver?.auth_fullname?.fullname?.charAt(0) || 'U'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.topSaverInfo}>
                    <Text style={styles.topSaverName} numberOfLines={1}>
                      {saver?.auth_fullname?.fullname || 'Unknown'}
                    </Text>
                    <Text style={styles.topSaverAmount}>
                      {formatCurrency(saver?.savings)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButtonGradient}
          >
            <ShareIcon size={20} color="white" />
            <Text style={styles.shareButtonText}>Share</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    borderRadius: 16,
    fontWeight: '800',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  profileButton: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderRadius: 20,
    borderColor: '#6366F1',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366F140',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 14,
    fontWeight: 'bold',
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
  mainSavingsContainer: {
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  mainSavingsCard: {
    borderRadius: 30,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 100,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeShape: {
    position: 'absolute',
    borderRadius: 50,
    opacity: 0.3,
  },
  shape1: {
    width: 20,
    height: 20,
    backgroundColor: '#F59E0B',
    top: 20,
    left: 30,
  },
  shape2: {
    width: 16,
    height: 16,
    backgroundColor: '#10B981',
    top: 40,
    right: 40,
  },
  shape3: {
    width: 12,
    height: 12,
    backgroundColor: '#EC4899',
    bottom: 60,
    left: 50,
  },
  shape4: {
    width: 18,
    height: 18,
    backgroundColor: '#EF4444',
    bottom: 30,
    right: 60,
  },
  shape5: {
    width: 14,
    height: 14,
    backgroundColor: '#8B5CF6',
    top: 60,
    left: width * 0.6,
  },
  shape6: {
    width: 22,
    height: 22,
    backgroundColor: '#06B6D4',
    bottom: 80,
    right: 30,
  },
  savingsContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 1,
  },
  youSavedText: {
    fontSize: 18,
    color: 'white',
    marginBottom: 8,
    fontWeight: '500',
  },
  savingsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  celebrationIcon: {
    marginTop: 8,
  },
  breakdownContainer: {
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  breakdownScroll: {
    marginHorizontal: 0,
  },
  breakdownScrollContent: {
    paddingHorizontal: 5,
    gap: 6,
  },
  breakdownCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    width: 120,
    minHeight: 120,
  },
  breakdownIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 16,
  },
  breakdownAmount: {
    fontSize: 11,
    color: '#10B981',
    textAlign: 'center',
    lineHeight: 14,
  },
  section: {
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  friendsContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 20,
    height: 300,
  },
  noFriendsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  friendAvatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#6366F1',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
  overflow: 'hidden',
},

  friendInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  friendSavings: {
    fontSize: 12,
    color: '#10B981',
  },
  topSaversContainer: {
    marginHorizontal: 0,
  },
  topSaversScroll: {
    paddingHorizontal: 5,
  },
  topSaversScrollContent: {
    gap: 6,
  },
  topSaverCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
    flexDirection: 'column',
    alignItems: 'center',
    width: 120,
    minHeight: 120,
  },
  topSaverRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  topSaverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  topSaverImage: {
    width: '100%',
    height: '100%',
  },
  topSaverInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  topSaverInfo: {
    alignItems: 'center',
  },
  topSaverName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  topSaverAmount: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
  },
  shareButton: {
    marginHorizontal: 10,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});