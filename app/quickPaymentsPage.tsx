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
  CreditCard,
  Filter,
  Star,
  Percent,
  Zap
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { SearchBar } from '@/components/SearchBar';
import { SvgUri } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface BBPSOption {
  id: string;
  name: string;
  icon: string;
  blurhash: string;
  data: {
    args?: {
      brand_id?: string;
    };
    route: string;
  };
  type: string;
  discount_text: string | null;
}

interface BBPSClass {
  id: string;
  name: string;
  bbps_options: BBPSOption[];
}

interface BBPSData {
  bbps_class: BBPSClass[];
}

export default function QuickPaymentsPage() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [bbpsData, setBbpsData] = useState<BBPSData>({ bbps_class: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchBBPSOptions();
  }, []);

  const fetchBBPSOptions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        setError('Please login to view payment options');
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
            query whatsubGetBBPSOptions($user_id: uuid!) {
              __typename
              whatsubGetBBPSOptions(request: {user_id: $user_id}) {
                __typename
                bbps_class {
                  __typename
                  id
                  name
                  bbps_options {
                    __typename
                    blurhash
                    icon
                    data
                    type
                    name
                    id
                    discount_text
                  }
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

      if (data.errors) {
        setError('Failed to fetch payment options');
        return;
      }

      setBbpsData(data.data?.whatsubGetBBPSOptions || { bbps_class: [] });
    } catch (error) {
      console.error('Error fetching BBPS options:', error);
      setError('Failed to fetch payment options');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchBBPSOptions();
    setIsRefreshing(false);
  };

  const handleOptionClick = (option: BBPSOption) => {
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

  const getAllOptions = () => {
    return bbpsData.bbps_class.flatMap(category =>
      category.bbps_options.map(option => ({
        ...option,
        categoryName: category.name
      }))
    );
  };

  const getFilteredOptions = () => {
    const allOptions = getAllOptions();

    let filtered = allOptions;

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(option => option.categoryName === selectedCategory);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(option =>
        option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getCategories = () => {
    return ['All', ...bbpsData.bbps_class.map(category => category.name)];
  };

  const renderPaymentOption = (option: BBPSOption & { categoryName: string }) => (
    <TouchableOpacity
      key={option.id}
      style={styles.paymentOption}
      onPress={() => handleOptionClick(option)}
      activeOpacity={0.8}
    >
      <View style={styles.optionContent}>
        <View style={styles.optionIconContainer}>
          {/* <Image
            source={{ uri: option.icon }}
            style={styles.optionIcon}
            resizeMode="contain"
          /> */}
          <SvgUri
            uri={option.icon} // https://cdn.subspace.money/bbps_icons/playstore2.svg
            width={32}
            height={32}
          />
        </View>

        <View style={styles.optionInfo}>
          <Text style={styles.optionName} numberOfLines={2}>
            {option.name}
          </Text>
          <Text style={styles.optionCategory}>
            {option.categoryName}
          </Text>
        </View>

        {option.discount_text && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {option.discount_text}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCategorySection = (category: BBPSClass) => {
    const filteredOptions = category.bbps_options.filter(option =>
      !searchQuery || option.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredOptions.length === 0) return null;

    return (
      <View key={category.id} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryIconContainer}>
            <CreditCard size={20} color="#6366F1" />
          </View>
          <Text style={styles.categoryTitle}>{category.name}</Text>
          <View style={styles.categoryCount}>
            <Text style={styles.categoryCountText}>
              {filteredOptions.length}
            </Text>
          </View>
        </View>

        <View style={styles.optionsGrid}>
          {filteredOptions.map((option) =>
            renderPaymentOption({ ...option, categoryName: category.name })
          )}
        </View>
      </View>
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
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('quickPayments.title')}</Text>
            </View>
            <Text style={styles.subtitle}>
              {t('quickPayments.subtitle')}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Section */}
      <SearchBar
        placeholder={t('quickPayments.searchPlaceholder')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Category Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Filter size={16} color="#9CA3AF" />
          <Text style={styles.filterLabel}>{t('quickPayments.category')}:</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesScroll}
        >
          {getCategories().map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.selectedCategoryButton
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.selectedCategoryButtonText
                ]}
              >
                {category}
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
        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchBBPSOptions}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {selectedCategory === 'All' ? (
              /* Category-wise Display */
              <View style={styles.contentContainer}>
                {bbpsData.bbps_class.map(renderCategorySection)}
              </View>
            ) : (
              /* Filtered Display */
              <View style={styles.contentContainer}>
                <View style={styles.filteredHeader}>
                  <Text style={styles.filteredTitle}>
                    {selectedCategory}
                  </Text>
                  <View style={styles.resultCount}>
                    <Text style={styles.resultCountText}>
                      {getFilteredOptions().length} {t('quickPayments.options')}
                    </Text>
                  </View>
                </View>

                {getFilteredOptions().length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <CreditCard size={48} color="#6366F1" />
                    </View>
                    <Text style={styles.emptyTitle}>{t('quickPayments.noOptionsFound')}</Text>
                    <Text style={styles.emptySubtitle}>
                      {searchQuery
                        ? `${t('quickPayments.noPaymentOptions')} "${searchQuery}" ${t('quickPayments.in')} ${selectedCategory}`
                        : `${t('quickPayments.noPaymentOptions')} ${t('quickPayments.in')} ${selectedCategory}`
                      }
                    </Text>
                  </View>
                ) : (
                  <View style={styles.optionsGrid}>
                    {getFilteredOptions().map(renderPaymentOption)}
                  </View>
                )}
              </View>
            )}
          </>
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
    backgroundColor: '#0E0E0E',
    marginTop: 20,
    marginBottom: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    fontWeight: '800',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  headerContent: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  searchSection: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  filterSection: {
    paddingHorizontal: 10,
    marginBottom: 14,
    marginTop: 10,
    flexDirection: 'row',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 4,
  },
  categoriesScroll: {
    paddingRight: 10,
    marginHorizontal: 5,
  },
  categoriesContainer: {
    marginHorizontal: 10,
    gap: 5,

  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
  },
  selectedCategoryButton: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginHorizontal: 20,
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  contentContainer: {
    paddingHorizontal: 10,
  },
  categorySection: {
    marginBottom: 10,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  categoryCount: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryCountText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  filteredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filteredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  resultCount: {
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
  },
  resultCountText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  optionsGrid: {
    gap: 8,
  },
  paymentOption: {
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionIcon: {
    width: 32,
    height: 32,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    // marginBottom: 4,
  },
  optionCategory: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  discountText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
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