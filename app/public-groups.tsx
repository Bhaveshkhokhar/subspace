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
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Search,
  Users,
  Clock,
  Filter,
  Shield,
  Star,
  TrendingUp
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SearchBar } from '@/components/SearchBar';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import {PublicGroupsShimmer} from '@/components/shimmer';

const { width } = Dimensions.get('window');

interface PublicGroup {
  whatsub_plans: {
    duration: number;
    duration_type: string;
    id: string;
    price: number;
    service_id: string;
  };
  group_limit: number;
  hide_limit: number;
  share_limit: number;
  number_of_users: number;
  name: string;
  room_dp: string;
  blurhash: string;
  count: number;
}

export default function PublicGroupsPage() {
  const { t } = useTranslation();
  const { search } = useLocalSearchParams();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [groups, setGroups] = useState<PublicGroup[] | null>(null);
  const [filteredGroups, setFilteredGroups] = useState<PublicGroup[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'Least Popular' | 'Most Popular'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchPublicGroups();
    setSearchQuery(typeof search === 'string' ? search : '');
  }, []);


  useEffect(() => {
    filterGroups();
  }, [groups, searchQuery, selectedFilter]);

  const fetchPublicGroups = async () => {
    setIsLoading(true);
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) {
        showError('Please login to view public groups');
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
            query getPublicGroups {
              __typename
              w_getPublicGroups {
                __typename
                whatsub_plans
                group_limit
                hide_limit
                share_limit
                number_of_users
                name
                room_dp
                blurhash
                count
              }
            }
          `
        })
      });

      const data = await response.json();

      if (data.errors) {
        showError('Failed to load public groups');
        return;
      }

      setGroups(data.data?.w_getPublicGroups);
    } catch (error) {
      console.error('Error fetching public groups:', error);
      showError('Failed to load public groups');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchPublicGroups();
    setIsRefreshing(false);
  };

  const filterGroups = () => {
    let filtered = groups ? groups : null;
    // Apply search filter
    if (searchQuery) {
      filtered = filtered?.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) || null;
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'Most Popular':
        filtered = filtered?.sort((a, b) => b.count - a.count) || null;
        break;
      case 'Least Popular':
        filtered = filtered?.sort((a, b) => a.count - b.count) || null;
        break;
      default:
        break;
    }

    setFilteredGroups(filtered);
  };

  // Show shimmer while loading initial data
  if (isLoading || groups === null) {
    return <PublicGroupsShimmer />;
  }

  if (groups?.length === 0){
    return (
      <View>
        <Text>No Groups Available</Text>
      </View>
    )
  }

  const calculatePricePerUser = (group: PublicGroup) => {
    return Math.ceil(group.whatsub_plans.price / group.share_limit);
  };

  const getPopularityBadge = (count: number) => {
    if (count >= 50) return { text: t('group.veryPopular'), color: '#EF4444', icon: Star };
    if (count >= 20) return { text: t('group.popular'), color: '#F59E0B', icon: TrendingUp };
    if (count >= 10) return { text: t('group.trending'), color: '#EAB308', icon: TrendingUp };
    return null;
  };

  const handleJoinGroup = (group: PublicGroup) => {
    // Navigate to the groups page for this specific plan
    router.push(`/groups/${group.whatsub_plans.id}`);
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore');
    }
  };

  const renderGroupCard = (group: PublicGroup, index: number) => {
    const pricePerUser = calculatePricePerUser(group);
    const popularityBadge = getPopularityBadge(group.count);

    return (
      <TouchableOpacity
        key={`${group.whatsub_plans.id}-${index}`}
        style={styles.groupCard}
        onPress={() => handleJoinGroup(group)}
        activeOpacity={0.8}
      >
        {/* Header with Service Image */}
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.2)']}
          style={styles.groupHeader}
        >
          <View style={styles.groupHeaderContent}>
            <View style={styles.serviceInfo}>
              <View style={styles.serviceImageContainer}>
                <Image
                  source={{ uri: group.room_dp }}
                  style={styles.serviceImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.serviceDetails}>
                <Text style={styles.serviceName} numberOfLines={2}>
                  {group.name}
                </Text>
                <View style={styles.durationContainer}>
                  <Clock size={14} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.durationText}>
                    {group.whatsub_plans.duration} {group.whatsub_plans.duration_type}
                  </Text>
                </View>
              </View>
            </View>

            {popularityBadge && (
              <View style={[styles.popularityBadge, { backgroundColor: popularityBadge.color }]}>
                <popularityBadge.icon size={12} color="white" />
                <Text style={styles.popularityText}>
                  {popularityBadge.text}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.groupContent}>
          {/* Pricing */}
          <View style={styles.pricingSection}>
            <View style={styles.priceContainer}>
              <View style={styles.userPrice}>
                <Text style={styles.priceAmount}>₹{pricePerUser}</Text>
                <Text style={styles.priceLabel}>{t('explore.perUser')}</Text>
              </View>
            </View>

            <View style={styles.groupCount}>
              <Text style={styles.groupCountLabel}>{t('group.groups')}: </Text>
              <Text style={styles.groupCountValue}>{group.count}+</Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => handleJoinGroup(group)}
          >
            <Text style={styles.joinButtonText}>{t('group.seeGroups')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('group.title')}</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <SearchBar
        placeholder={t('group.searchPlaceHolder')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
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
        {/* Groups Grid */}
        {filteredGroups === null || groups === null ? (
          <PublicGroupsShimmer/>
        ) : filteredGroups.length > 0 ? (
          <View style={styles.groupsGrid}>
            {filteredGroups.map(renderGroupCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Users size={48} color="#6366F1" />
            </View>
            <Text style={styles.emptyTitle}>{t('group.noGroupsFound')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('group.adjustFilters')}
            </Text>
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
    paddingBottom: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 10,
    paddingTop: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    fontWeight: '800',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  // groupsCounter: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   backgroundColor: 'rgba(31, 41, 55, 0.8)',
  //   borderRadius: 12,
  //   paddingHorizontal: 12,
  //   paddingVertical: 8,
  //   marginBottom: 8,
  //   marginLeft: 10,
  //   alignSelf: 'flex-start',
  //   gap: 8,
  // },
  // groupsCounterText: {
  //   fontSize: 14,
  //   fontWeight: '500',
  //   color: 'white',
  // },
  searchSection: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    gap: 12,
  },
  searchInput: {
    color: 'white',
    fontSize: 16,
  },
  filtersSection: {
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  filterButtons: {
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  activeFilterButton: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    flex: 1,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
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
  },
  groupsGrid: {
    paddingHorizontal: 10,
    gap: 5,
  },
  groupCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgb(55, 65, 81)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  groupHeader: {
    height: 90,
    justifyContent: 'center',
    padding: 8,
  },
  groupHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  serviceImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'transparent',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  popularityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 18,
  },
  popularityText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  groupContent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pricingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  priceContainer: {
    flex: 1,
  },
  userPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ee00',
  },
  priceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  groupCount: {
    flexDirection: 'row',
  },
  groupCountLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    marginRight: 4,
  },
  groupCountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#40e0d0',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  availabilityText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 4,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  infoSection: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 20,
    marginTop: 32,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  infoGrid: {
    gap: 20,
  },
  infoCard: {
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  infoCardText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
});