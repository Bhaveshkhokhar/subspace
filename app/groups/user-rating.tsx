import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  Star, 
  MessageSquare,
  Calendar,
  User,
  Award,
  TrendingUp
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import {UserRatingsShimmer} from '@/components/shimmer';

const { width } = Dimensions.get('window');

interface Rating {
  rating: number;
  review: string;
  created_at: string;
  authFullnameByUserId: {
    fullname: string;
    dp: string;
  };
}

interface RatingStats {
  totalRatings: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
}

export default function UserRatingsScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const params = useLocalSearchParams();
  const { userId: targetUserId, userName, planId } = params;
  
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats>({
    totalRatings: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const LIMIT = 10;

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (authToken && targetUserId) {
      fetchRatings(0, true);
    }
  }, [authToken, targetUserId]);

  const initializeAuth = async () => {
    try {
      const token = await storage.getAuthToken();
      setAuthToken(token);
    } catch (error) {
      console.error('Error getting auth token:', error);
      showError('Authentication required');
    }
  };

  const fetchRatings = async (newOffset: number = 0, isInitial: boolean = false) => {
    if (!authToken || !targetUserId) return;
    
    // Prevent duplicate requests - this is crucial
    if (!isInitial && isLoadingMore) {
      return;
    }
    
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query getUserRatings($user_id: uuid!, $limit: Int!, $offset: Int!) {
              __typename
              whatsub_admin_ratings(where: {user_id: {_eq: $user_id}}, limit: $limit, offset: $offset, order_by: {created_at: desc}) {
                __typename
                rating
                review
                created_at
                authFullnameByUserId {
                  __typename
                  fullname
                  dp
                }
              }
            }
          `,
          variables: {
            user_id: targetUserId,
            limit: LIMIT,
            offset: newOffset
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error fetching ratings:', data.errors);
        showError('Failed to load ratings');
        return;
      }
      
      const fetchedRatings = data.data?.whatsub_admin_ratings || [];
      
      if (isInitial) {
        setRatings(fetchedRatings);
        calculateStats(fetchedRatings);
        // Reset offset to the number of items we just loaded
        setOffset(fetchedRatings.length);
      } else {
        // Append new ratings to existing ones
        setRatings(prev => [...prev, ...fetchedRatings]);
        // Update offset to total number of loaded items
        setOffset(prev => prev + fetchedRatings.length);
      }
      
      // Set hasMore based on whether we got a full page
      // If we got fewer than LIMIT items, there are no more items
      const hasMoreData = fetchedRatings.length === LIMIT;
      setHasMore(hasMoreData);
      
    } catch (error) {
      console.error('Error fetching ratings:', error);
      showError('Failed to load ratings');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const calculateStats = (ratingsData: Rating[]) => {
    if (ratingsData.length === 0) {
      setRatingStats({
        totalRatings: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
      return;
    }

    const totalRatings = ratingsData.length;
    const totalScore = ratingsData.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = totalScore / totalRatings;
    
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingsData.forEach(rating => {
      distribution[rating.rating as keyof typeof distribution]++;
    });

    setRatingStats({
      totalRatings,
      averageRating,
      ratingDistribution: distribution
    });
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    setOffset(0);
    setHasMore(true);
    setRatings([]); // Clear existing ratings first
    await fetchRatings(0, true);
    setIsRefreshing(false);
  };

  const loadMore = useCallback(() => {    
    if (!isLoadingMore && hasMore && !isLoading) {
      fetchRatings(offset, false);
    }
  }, [isLoadingMore, hasMore, offset, ratings.length, isLoading]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0]?.toUpperCase() || '';
    const last = parts[parts.length - 1]?.[0]?.toUpperCase() || '';
    return first + last;
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/groups/${planId}`);
    }
  };

  const renderStarsOverview = () => (
    <View style={styles.starsOverviewContainer}>
      {[5, 4, 3, 2, 1].map((star) => {
        const count = ratingStats.ratingDistribution[star] || 0;
        const percentage = ratingStats.totalRatings > 0 ? (count / ratingStats.totalRatings) * 100 : 0;
        
        return (
          <View key={star} style={styles.starRow}>
            <Text style={styles.starNumber}>{star}</Text>
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { width: `${percentage}%` }
                  ]} 
                />
              </View>
            </View>
            <Text style={styles.starCount}>{count}</Text>
          </View>
        );
      })}
    </View>
  );

  const renderRatingItem = ({ item, index }: { item: Rating; index: number }) => (
    <View style={styles.ratingCard}>
      <View style={styles.ratingHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {item.authFullnameByUserId?.dp ? (
              <Image
                source={{ uri: item.authFullnameByUserId.dp }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(item.authFullnameByUserId?.fullname || 'Unknown')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {item.authFullnameByUserId?.fullname || 'Anonymous User'}
            </Text>
            <Text style={styles.reviewDate}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
        
        <View style={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={16}
              color={star <= item.rating ? "#F59E0B" : "#374151"}
              fill={star <= item.rating ? "#F59E0B" : "transparent"}
            />
          ))}
        </View>
      </View>
      
      {item.review.length > 0 && <View style={styles.reviewContent}>
        <Text style={styles.reviewText}>
          {item.review}
        </Text>
      </View>}
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#6366F1" />
        <Text style={styles.loadingFooterText}>Loading more reviews...</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MessageSquare size={48} color="#6366F1" />
      </View>
      <Text style={styles.emptyTitle}>No Reviews Yet</Text>
      <Text style={styles.emptySubtitle}>
        Reviews from other users will appear here
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <UserRatingsShimmer />
    );
  }

  // if (isLoading) {
  //   return (
  //     <LinearGradient
  //       colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
  //       style={styles.container}
  //     >
  //       <View style={styles.header}>
  //         <TouchableOpacity
  //           style={styles.backButton}
  //           onPress={handleBackPress}
  //         >
  //           <ArrowLeft size={20} color="white" />
  //         </TouchableOpacity>
  //         <Text style={styles.headerTitle}>Ratings & Reviews</Text>
  //         <View style={styles.headerRight} />
  //       </View>
        
  //       <View style={styles.loadingContainer}>
  //         <ActivityIndicator size="large" color="#6366F1" />
  //         <Text style={styles.loadingText}>Loading reviews...</Text>
  //       </View>
  //     </LinearGradient>
  //   );
  // }

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
        <Text style={styles.headerTitle}>
          {userName ? `${userName}'s Reviews` : 'User Reviews'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Reviews List */}
      <View style={styles.reviewsContainer}>
        <View style={styles.reviewsHeader}>
          <MessageSquare size={20} color="#6366F1" />
          <Text style={styles.reviewsTitle}>All Reviews</Text>
        </View>

        <FlatList
          data={ratings}
          renderItem={renderRatingItem}
          keyExtractor={(item, index) => `rating-${index}-${item.created_at}`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.reviewsList,
            ratings.length === 0 && styles.emptyListContainer
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          removeClippedSubviews={false}
          initialNumToRender={LIMIT}
          maxToRenderPerBatch={5}
          windowSize={5}
          scrollEventThrottle={16}
        />
        
      </View>
      
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
    borderRadius: 16,
    fontWeight:'800',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
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
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  summaryStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  totalRatings: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  summaryRight: {
    flex: 1,
  },
  starsOverviewContainer: {
    gap: 8,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    width: 12,
    textAlign: 'center',
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  starCount: {
    fontSize: 12,
    color: '#9CA3AF',
    width: 20,
    textAlign: 'right',
  },
  reviewsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  reviewsList: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 6,
  },
  ratingCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewContent: {
    marginHorizontal: 4,
    marginTop: 2,
  },
  reviewText: {
    fontSize: 15,
    color: '#E5E7EB',
    lineHeight: 18,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingFooterText: {
    fontSize: 14,
    color: '#9CA3AF',
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
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
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
});