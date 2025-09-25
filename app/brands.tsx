import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Search, 
  ArrowLeft,
  Filter,
  Star,
  TrendingUp
} from 'lucide-react-native';
import { SearchBar } from '@/components/SearchBar';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import {BrandsShimmer} from '@/components/shimmer';

const { width, height } = Dimensions.get('window');

// Mobile-first responsive design system
const DESIGN_SYSTEM = {
  // Spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  // Typography scale
  typography: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
  },
  // Border radius scale
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  // Container padding based on screen width
  containerPadding: Math.max(16, Math.min(24, width * 0.05)),
  // Card dimensions
  cardWidth: Math.min(width - 32, 400),
  cardHeight: Math.max(140, Math.min(180, width * 0.4)),
};

interface Brand {
  id: string;
  service_name: string;
  whatsub_class: {
    name: string;
    icon: string;
    rank: number;
  };
  image_url: string;
  poster2_url: string | null;
  poster2_blurhash: string;
  backdrop_url: string;
  backdrop_blurhash: string;
  blurhash: string;
  flexipay: boolean;
  flexipay_discount: number;
  flexipay_min: number;
  whatsub_plans: Array<{
    price: number;
    discounted_price: number;
  }>;
}

export default function BrandsScreen() {
  const params = useLocalSearchParams();
  const { category } = params;
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category as string || 'All');
  const [categories, setCategories] = useState<Set<string>>(new Set(['All']));
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (category && typeof category === 'string') {
      setSelectedCategory(category);
    }
  }, [category]);

  useEffect(() => {
    filterBrands();
  }, [brands, searchQuery, selectedCategory]);

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) {
        showError('Please login to view brands');
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
            query GetProducts {
              __typename
              getProducts: whatsub_services(
                where: {
                  _or: [
                    {flexipay: {_eq: true}},
                    {whatsub_plans: {whatsub_coupon_availability: {count: {_gt: "0"}}}}
                  ]
                },
                order_by: {playstore_number_of_ratings: desc_nulls_last}
              ) {
                __typename
                id
                service_name
                whatsub_class {
                  __typename
                  name
                  icon
                  rank
                }
                image_url
                poster2_url
                poster2_blurhash
                backdrop_url
                backdrop_blurhash
                blurhash
                flexipay
                flexipay_discount
                flexipay_min
                whatsub_plans(
                  where: {whatsub_coupon_availability: {count: {_gt: "0"}}},
                  order_by: {discounted_price: asc},
                  limit: 1
                ) {
                  __typename
                  price
                  discounted_price
                }
              }
            }
          `
        })
      });

      const data = await response.json();
      const fetchedBrands = data.data?.getProducts || [];
      setBrands(fetchedBrands);

      const uniqueCategories = new Set(['All']);
      fetchedBrands.forEach((brand: Brand) => {
        if (brand.whatsub_class?.name) {
          uniqueCategories.add(brand.whatsub_class.name);
        }
      });
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching brands:', error);
      showError('Failed to load brands. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterBrands = () => {
    let filtered = brands;

    if (searchQuery.trim()) {
      filtered = filtered.filter(brand =>
        brand.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.whatsub_class?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(brand => brand.whatsub_class?.name === selectedCategory);
    }

    setFilteredBrands(filtered);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchBrands();
    setIsRefreshing(false);
  };

  const handleBrandPress = (brandId: string) => {
    router.push({
      pathname: '/product-details',
      params: { id: brandId }
    });
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore');
    }
  };

  const renderBrandCard = ({ item }: { item: Brand }) => {
    const isDiscounted = item.whatsub_plans?.[0] && 
      item.whatsub_plans[0].price > item.whatsub_plans[0].discounted_price;

    return (
      <TouchableOpacity
        style={styles.brandCard}
        onPress={() => handleBrandPress(item.id)}
        activeOpacity={0.8}
      >
        {/* Upper Section - Background Image */}
        <View style={styles.brandImageContainer}>
          <Image
            source={{ uri: item.backdrop_url || item.image_url }}
            style={styles.brandBackgroundImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
            style={styles.brandImageGradient}
          />
          
          {/* Discount Badge */}
          {item.flexipay && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{item.flexipay_discount}% {t('common.off')}</Text>
            </View>
          )}
          
          {/* Brand Logo in upper section */}
          <View style={styles.brandLogoContainer}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Lower Section - Content */}
        <View style={styles.brandContent}>
          <View style={styles.brandInfo}>
            <Text style={styles.brandName} numberOfLines={1}>
              {item.service_name}
            </Text>
            <Text style={styles.brandCategory} numberOfLines={1}>
              {item.whatsub_class?.name }
            </Text>
          </View>

          {/* Pricing */}
          {item.whatsub_plans?.[0] && (
            <View style={styles.pricingContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.currentPrice}>
                  ₹{item.whatsub_plans[0].discounted_price}
                </Text>
                {isDiscounted && (
                  <Text style={styles.originalPrice}>
                    ₹{item.whatsub_plans[0].price}
                  </Text>
                )}
              {isDiscounted && (
                <View style={styles.savingsContainer}>
                  <TrendingUp size={12} color="#10B981" />
                  <Text style={styles.savingsText}>
                    Save ₹{item.whatsub_plans[0].price - item.whatsub_plans[0].discounted_price}
                  </Text>
                </View>
              )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = () => (
    <View style={styles.categoriesSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        style={styles.categoriesScroll}
      >
        {Array.from(categories).map((categoryItem) => {
          const isActive = selectedCategory === categoryItem;
          const isHovered = hoveredCategory === categoryItem;
          
          return (
            <Pressable
              key={categoryItem}
              style={({ pressed }) => [
                styles.categoryButton,
                isActive && styles.categoryButtonActive,
                isHovered && !isActive && styles.categoryButtonHovered,
                pressed && styles.categoryButtonPressed
              ]}
              onPress={() => setSelectedCategory(categoryItem)}
              onHoverIn={() => setHoveredCategory(categoryItem)}
              onHoverOut={() => setHoveredCategory(null)}
            >
              <LinearGradient
                colors={
                  isActive 
                    ? ['#6366F1', '#8B5CF6']
                    : isHovered
                    ? ['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.3)']
                    : ['rgba(31, 41, 55, 0.8)', 'rgba(31, 41, 55, 0.8)']
                }
                style={styles.categoryButtonGradient}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    isActive && styles.categoryButtonTextActive,
                    isHovered && !isActive && styles.categoryButtonTextHovered
                  ]}
                >
                  {categoryItem === 'All' ? t('common.all') : t(`brands.${categoryItem.replace(/\s+/g, "").replace(/^./, c => c.toLowerCase())}`)}
                </Text>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Search size={48} color="#6366F1" />
      </View>
      <Text style={styles.emptyTitle}>{t('brands.noBrands')}</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search or filter criteria
      </Text>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => {
          setSearchQuery('');
          setSelectedCategory('All');
        }}
      >
        <Text style={styles.resetButtonText}>Reset Filters</Text>
      </TouchableOpacity>
    </View>
  );

  // Show shimmer while loading initial data
  if (isLoading) {
    return <BrandsShimmer />;
  }

  if (brands.length === 0) {
    return (
      <>
        <LinearGradient
          colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
          style={styles.loadingContainer}
        >
          <Text style={styles.loadingText}> NO Brands Available</Text>
        </LinearGradient>
        
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      </>
    );
  }

  return (
    <>
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
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('brands.title')}</Text>
        </View>

        {/* Search Bar */}
        
      </View>
      <SearchBar
        placeholder={t('brands.searchPlaceHolder')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Brands List */}
      <FlatList
        data={filteredBrands}
        renderItem={renderBrandCard}
        keyExtractor={(item) => item.id}
        numColumns={1}
        contentContainerStyle={styles.brandsContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </LinearGradient>

    <Toast
      visible={toast.visible}
      message={toast.message}
      type={toast.type}
      onHide={hideToast}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: DESIGN_SYSTEM.typography.md,
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    fontWeight: '600',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  categoriesSection: {
    marginVertical: 10,
  },
  categoriesScroll: {
    marginBottom: 8,
  },
  categoriesContainer: {
    marginHorizontal: 16,
  },
  categoryButton: {
    marginRight: 12,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryButtonActive: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryButtonHovered: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    transform: [{ scale: 1.02 }],
  },
  categoryButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  categoryButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 24,
  },
  categoryButtonText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  categoryButtonTextHovered: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  brandsContainer: {
    paddingHorizontal: DESIGN_SYSTEM.containerPadding,
    paddingBottom: 20,
  },
  brandCard: {
    width: DESIGN_SYSTEM.cardWidth,
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: DESIGN_SYSTEM.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    alignSelf: 'center',
  },
  brandImageContainer: {
    height: 120,
    position: 'relative',
  },
  brandBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  brandImageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  discountBadge: {
    position: 'absolute',
    top: DESIGN_SYSTEM.spacing.md,
    right: DESIGN_SYSTEM.spacing.md,
    backgroundColor: '#6366F1',
    paddingHorizontal: DESIGN_SYSTEM.spacing.md,
    paddingVertical: DESIGN_SYSTEM.spacing.sm,
    borderRadius: DESIGN_SYSTEM.radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  discountText: {
    color: 'white',
    fontSize: DESIGN_SYSTEM.typography.sm,
    fontWeight: 'bold',
  },
  brandLogoContainer: {
    position: 'absolute',
    bottom: DESIGN_SYSTEM.spacing.md,
    right: DESIGN_SYSTEM.spacing.md,
    width: 44,
    height: 44,
    borderRadius: DESIGN_SYSTEM.radius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    padding: 4,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  brandContent: {
    padding: DESIGN_SYSTEM.spacing.lg,
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
  },
  brandInfo: {
    marginBottom: 4,
  },
  brandName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: DESIGN_SYSTEM.spacing.xs,
  },
  brandCategory: {
    color: '#9CA3AF',
    fontSize: DESIGN_SYSTEM.typography.sm,
  },
  pricingContainer: {
    marginTop: DESIGN_SYSTEM.spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  currentPrice: {
    color: '#00E400',
    fontSize: DESIGN_SYSTEM.typography.xl,
    fontWeight: 'bold',
    marginRight: DESIGN_SYSTEM.spacing.sm,
  },
  originalPrice: {
    color: '#6B7280',
    fontSize: DESIGN_SYSTEM.typography.md,
    textDecorationLine: 'line-through',
    marginRight: DESIGN_SYSTEM.spacing.sm,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DESIGN_SYSTEM.spacing.xs,
  },
  savingsText: {
    color: '#10B981',
    fontSize: DESIGN_SYSTEM.typography.sm,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: DESIGN_SYSTEM.spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: DESIGN_SYSTEM.spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  emptyTitle: {
    color: 'white',
    fontSize: DESIGN_SYSTEM.typography.xl,
    fontWeight: 'bold',
    marginBottom: DESIGN_SYSTEM.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: DESIGN_SYSTEM.typography.md,
    textAlign: 'center',
    marginBottom: DESIGN_SYSTEM.spacing.xxl,
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: DESIGN_SYSTEM.spacing.xxl,
    paddingVertical: DESIGN_SYSTEM.spacing.md,
    borderRadius: DESIGN_SYSTEM.radius.md,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resetButtonText: {
    color: 'white',
    fontSize: DESIGN_SYSTEM.typography.md,
    fontWeight: '600',
  },
});