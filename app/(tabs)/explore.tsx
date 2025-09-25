import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Animated,
  RefreshControl,
  Linking,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Users, Clock, ShoppingCart, Send } from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';

import { SearchBar } from '@/components/SearchBar';
import { useFocusEffect } from '@react-navigation/native';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { ExploreShimmer } from '@/components/shimmer';

const { width } = Dimensions.get('window');

// Mobile-optimized carousel dimensions with 2:1 aspect ratio
const CARD_WIDTH = width;
const CARD_HEIGHT = CARD_WIDTH * 0.5; // Better aspect ratio for mobile

interface Carousel {
  type: string;
  image_url: string;
  blurhash: string;
  data: {
    args?: {
      brand_id?: string;
    };
    url?: string;
    route: string;
  };
}

interface Category {
  name: string;
  poster: string;
  service_count: number;
  service_images: string[];
}

interface FavouriteBrand {
  brand_id: string;
  whatsub_service: {
    image_url: string;
    discount_text: string;
  };
}

interface PublicGroup {
  name: string;
  room_dp: string;
  group_limit: number;
  share_limit: number;
  count: number;
  whatsub_plans: {
    id: string;
    price: number;
    duration: number;
    duration_type: string;
  };
}

interface SearchHint {
  hint: string;
  type: string;
}

export default function ExploreScreen() {
  const { t } = useTranslation();
  const userId = storage.getUserId();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [brandCategories, setBrandCategories] = useState<Category[]>([]);
  const [favouriteBrands, setFavouriteBrands] = useState<FavouriteBrand[]>([]);
  const [publicGroups, setPublicGroups] = useState<PublicGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [suggestionText, setSuggestionText] = useState('');
  const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);

  const scrollX = new Animated.Value(0);
  const flatListRef = React.useRef<FlatList>(null);

  // Animated search state
  const [searchHints, setSearchHints] = useState<SearchHint[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const animationTimeoutRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    if (carousels.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % carousels.length;
        flatListRef.current?.scrollToIndex({
          index: nextSlide,
          animated: true
        });
        return nextSlide;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [carousels.length]);


  // Animated placeholder effect
  useEffect(() => {
    if (searchQuery || isFocused || searchHints.length === 0) {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      return;
    }

    const animatePlaceholder = () => {
      const targetText = searchHints[placeholderIndex]?.hint || '';

      if (isTyping) {
        if (currentPlaceholder.length < targetText.length) {
          setCurrentPlaceholder(targetText.slice(0, currentPlaceholder.length + 1));
          animationTimeoutRef.current = setTimeout(animatePlaceholder, 100);
        } else {
          pauseTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            animatePlaceholder();
          }, 500);
        }
      } else {
        if (currentPlaceholder.length > 0) {
          setCurrentPlaceholder(currentPlaceholder.slice(0, -1));
          animationTimeoutRef.current = setTimeout(animatePlaceholder, 50);
        } else {
          setPlaceholderIndex((prev) => (prev + 1) % searchHints.length);
          setIsTyping(true);
          pauseTimeoutRef.current = setTimeout(animatePlaceholder, 300);
        }
      }
    };

    pauseTimeoutRef.current = setTimeout(animatePlaceholder, 500);

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [currentPlaceholder, placeholderIndex, isTyping, searchQuery, isFocused, searchHints]);

  // Debounced auto-complete search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Reset animation when search is cleared
  useEffect(() => {
    if (!searchQuery && !isFocused) {
      const restartTimeout = setTimeout(() => {
        setCurrentPlaceholder('');
        setPlaceholderIndex(0);
        setIsTyping(true);
      }, 1000);

      return () => clearTimeout(restartTimeout);
    }
  }, [searchQuery, isFocused]);

  // Fetch cart count when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchCartCount();
      // Clear search when returning to explore page
      setSearchQuery('');
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  // Auto-scroll carousel
  useEffect(() => {
    if (carousels.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carousels.length);
    }, 5000); // Increased interval to 5 seconds for better UX

    return () => clearInterval(interval);
  }, [carousels.length]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchCarousels(),
        fetchCategories(),
        fetchFavouriteBrands(),
        fetchPublicGroups(),
        fetchSearchHints()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCartCount = async () => {
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query GetCartCount($user_id: uuid = "") {
              __typename
              whatsub_orders(where: {status: {_eq: "cart"}, user_id: {_eq: $user_id}}) {
                __typename
                whatsub_order_items_aggregate {
                  __typename
                  aggregate {
                    __typename
                    sum {
                      __typename
                      quantity
                    }
                  }
                }
              }
            }
          `,
          variables: { user_id: userId }
        })
      });

      const data = await response.json();
      const totalItems = data.data?.whatsub_orders?.[0]?.whatsub_order_items_aggregate?.aggregate?.sum?.quantity || 0;
      setCartCount(totalItems);
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

  const handleSearchFocus = async () => {
    // Route to search results page when search is focused
    router.push('/search-results');
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow for suggestion tap
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  };

  const handleSearchSubmit = () => {
    router.push('/search-results');
  };

  const fetchSearchHints = async () => {
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
            query MyQuery {
              __typename
              whatsub_search_hint_text {
                __typename
                hint
                type
              }
            }
          `
        })
      });

      const data = await response.json();
      setSearchHints(data.data?.whatsub_search_hint_text || []);
    } catch (error) {
      console.error('Error fetching search hints:', error);
    }
  };

  const fetchCarousels = async () => {
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query MyQuery($user_id: uuid = "") {
              __typename
              whatsubGetCarousals(request: {user_id: $user_id}) {
                __typename
                type
                blurhash
                image_url
                data
              }
            }
          `,
          variables: { user_id: userId }
        })
      });

      const data = await response.json();
      setCarousels(data.data?.whatsubGetCarousals || []);
    } catch (error) {
      console.error('Error fetching carousels:', error);
    }
  };

  const fetchCategories = async () => {
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
            query getBrandCategories {
              __typename
              whatsub_class(where: {service_count: {_neq: 0}}, order_by: {rank: asc}) {
                __typename
                name
                poster
                service_count
                service_images
              }
            }
          `
        })
      });

      const data = await response.json();
      setBrandCategories(data.data?.whatsub_class || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchFavouriteBrands = async () => {
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query getFavouriteBrands($user_id: uuid!) {
              __typename
              w_getFavouriteBrands(request: {user_id: $user_id}) {
                __typename
                whatsub_favourite_brands
              }
            }
          `,
          variables: { user_id: userId }
        })
      });

      const data = await response.json();
      const favouriteBrands = data.data?.w_getFavouriteBrands?.whatsub_favourite_brands || [];
      setFavouriteBrands(favouriteBrands);
    } catch (error) {
      console.error('Error fetching favourite brands:', error);
    }
  };

  const fetchPublicGroups = async () => {
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
            query getPublicGroupsShort {
              __typename
              w_getPublicGroupsShort {
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
                auth_fullname2
              }
            }
          `
        })
      });

      const data = await response.json();
      setPublicGroups(data.data?.w_getPublicGroupsShort || []);
    } catch (error) {
      console.error('Error fetching public groups:', error);
    }
  };

  const handleCartClick = () => {
    router.push('/cart');
  };

  const handleCarouselPress = (carousel: Carousel) => {
    try {
      let data;

      // 🧠 Parse if string
      if (typeof carousel.data === 'string') {
        try {
          data = JSON.parse(carousel.data);
        } catch (parseError) {
          console.error('Error parsing carousel data:', parseError);
          return;
        }
      } else {
        data = carousel.data;
      }

      // 🎯 Navigate based on priority
      if (data?.args?.brand_id) {
        router.push(`/product-details/${data.args.brand_id}`);
      } else if (data?.url) {
        Linking.openURL(data.url).catch((err) =>
          console.error('Failed to open URL:', err)
        );
      } else {
        console.log('No navigation action available - no brand_id or url found');
      }
    } catch (error) {
      console.error('Error handling carousel click:', error);
    }
  };

  const handleViewAllBrands = () => {
    router.push('/brands');
  };

  const handleViewAllSharedSubscriptions = () => {
    router.push('/public-groups');
  };

  const handleSharedSubscriptionPress = (group: PublicGroup) => {
    router.push({
      pathname: '/public-groups',
      params: { search: group.name.split(' ')[0] }
    });
  };

  const handleCategoryPress = (categoryName: string) => {
    router.push({
      pathname: '/brands',
      params: { category: categoryName }
    });
  };

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) return;

    setIsSendingSuggestion(true);
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        showError('Please login to send suggestions');
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
            mutation MyMutation($user_id: uuid = "", $suggestion: String = "") {
              __typename
              insert_whatsub_suggestion(objects: {user_id: $user_id, suggestion: $suggestion}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_id: userId,
            suggestion: suggestionText.trim()
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        showError('Failed to send suggestion');
        return;
      }

      if (data.data?.insert_whatsub_suggestion?.affected_rows > 0) {
        showSuccess('Suggestion sent');
        setSuggestionText('');
      } else {
        showError('Failed to send suggestion');
      }
    } catch (error) {
      console.error('Error sending suggestion:', error);
      showError('Failed to send suggestion');
    } finally {
      setIsSendingSuggestion(false);
    }
  };

  const renderCarouselItem = ({ item, index }: { item: Carousel; index: number }) => (
    <TouchableOpacity
      style={styles.carouselItem}
      onPress={() => handleCarouselPress(item)}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.image_url }}
        style={styles.carouselImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={styles.carouselGradient}
      />
    </TouchableOpacity>
  );

  const renderFavoriteBrand = ({ item }: { item: FavouriteBrand }) => (
    <TouchableOpacity
      style={styles.brandItem}
      onPress={() => router.push(`/product-details/${item.brand_id}`)}
    >
      <View style={styles.brandImageContainer}>
        <Image
          source={{ uri: item.whatsub_service.image_url }}
          style={styles.brandImage}
          resizeMode="cover"
        />
      </View>
      {item.whatsub_service.discount_text !== "0" && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            {item.whatsub_service.discount_text}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPublicGroup = ({ item }: { item: PublicGroup }) => (
    <TouchableOpacity
      style={styles.groupCardVertical}
      onPress={() => handleSharedSubscriptionPress(item)}
    >
      <View style={styles.groupHeader}>
        <View style={styles.groupImageContainer}>
          <Image
            source={{ uri: item.room_dp }}
            style={styles.groupImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.groupMeta}>
            <Users size={12} color="#9CA3AF" />
            <Text style={styles.groupMetaText}>
              {item.group_limit} {t('explore.peopleSharing')}
            </Text>
          </View>
        </View>
        <View style={styles.groupPricingVertical}>
          <Text style={styles.groupPrice}>
            ₹{Math.ceil(item.whatsub_plans.price / item.share_limit)}
          </Text>
          <Text style={styles.groupPriceLabel}>
            {t('explore.perUser')}
          </Text>
        </View>
      </View>

      <View style={styles.groupFooter}>
        <View style={styles.groupDuration}>
          <Clock size={12} color="#9CA3AF" />
          <Text style={styles.groupDurationText}>
            Duration : {item.whatsub_plans.duration} {item.whatsub_plans.duration_type}
          </Text>
        </View>
        <View style={styles.groupCountBadge}>
          <Text style={styles.groupCountText}>
            {item.count}+ {t('explore.groups')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Helper function to chunk array into pairs for 2-row layout
  const chunkArray = (array: Category[], size: number) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const renderCategoryColumn = ({ item }: { item: Category[] }) => (
    <View style={styles.categoryColumn}>
      {item.map((category, index) => (
        <TouchableOpacity
          key={category.name}
          style={[styles.categoryCard, { marginBottom: index === 0 ? 10 : 0 }]}
          onPress={() => handleCategoryPress(category.name)}
        >
          <Image
            source={{ uri: category.poster }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)']}
            style={styles.categoryGradient}
          />
          <View style={styles.categoryContent}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {category.service_count}+ {t('explore.brands')}
                </Text>
              </View>
            </View>
            <View style={styles.categoryFooter}>
              <Text style={styles.categoryName}>
                {category.name}
              </Text>
              <View style={styles.categoryIcons}>
                {category.service_images.slice(0, 3).map((image, index) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    style={[
                      styles.categoryIcon,
                      { marginLeft: index > 0 ? -12 : 0 }
                    ]}
                  />
                ))}
                {category.service_count > 3 && (
                  <View style={[
                    styles.categoryIcon,
                    styles.categoryIconMore,
                    { marginLeft: -12 }
                  ]}>
                    <Text style={styles.categoryIconMoreText}>
                      +{category.service_count - 3}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <ExploreShimmer />
    );
  }

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />}
      >
        {/* Header */}
        <View style={styles.searchHeader}>
          <Text style={styles.title}>{t('nav.explore')}</Text>
          <View style={styles.cart}>
            <TouchableOpacity style={styles.cartButton}
              onPress={handleCartClick}
            >
              <ShoppingCart size={20} color="#40e0d0" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder={searchQuery || isFocused ? t('explore.searchPlaceHolder') : `${t('common.search')} ${currentPlaceholder}`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onSubmit={handleSearchSubmit}
          />
        </View>

        {/* Mobile-Optimized Carousel with Gesture Handling */}
        {carousels.length > 0 && (
          <View style={styles.carouselSection}>
            {/* Carousel Section */}
            {carousels.length > 0 && (
              <View style={styles.carouselSection}>
                <FlatList
                  ref={flatListRef}
                  data={carousels}
                  renderItem={renderCarouselItem}
                  keyExtractor={(item, index) => `carousel-${index}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH + 20}
                  decelerationRate="fast"
                  contentContainerStyle={styles.carouselContainer}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    {
                      useNativeDriver: false,
                      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                        const slideIndex = Math.round(
                          event.nativeEvent.contentOffset.x / (CARD_WIDTH + 40)
                        );
                        setCurrentSlide(slideIndex);
                      }
                    }
                  )}
                  scrollEventThrottle={16}
                  onScrollToIndexFailed={(info) => {
                    // Handle scroll to index failure
                    setTimeout(() => {
                      flatListRef.current?.scrollToIndex({
                        index: info.index,
                        animated: true
                      });
                    }, 100);
                  }}
                />
              </View>
            )}

            {/* Pagination Dots */}
            {carousels.length > 1 && (
              <View style={styles.paginationContainer}>
                {carousels.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentSlide && styles.paginationDotActive
                    ]}
                    onPress={() => setCurrentSlide(index)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Favorite Brands */}
        {favouriteBrands.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('explore.favouriteBrands')}</Text>
            </View>
            <FlatList
              data={favouriteBrands}
              renderItem={renderFavoriteBrand}
              keyExtractor={(item) => item.brand_id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Categories - 2 rows horizontal scrollable */}
        {brandCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('explore.categories')}</Text>
              <TouchableOpacity style={styles.viewAllButton}
                onPress={handleViewAllBrands}
              >
                <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
                <ChevronRight size={16} color="#6366F1" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={chunkArray(brandCategories, 2)}
              renderItem={renderCategoryColumn}
              keyExtractor={(item, index) => `category-column-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Shared Subscriptions - Vertical Scrollable */}
        {publicGroups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('explore.sharedSubscriptions')}</Text>
              <TouchableOpacity style={styles.viewAllButton}
                onPress={handleViewAllSharedSubscriptions}
              >
                <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
                <ChevronRight size={16} color="#6366F1" />
              </TouchableOpacity>
            </View>
            <View>
              <FlatList
                data={publicGroups}
                renderItem={renderPublicGroup}
                keyExtractor={(item) => item.name}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.verticalList}
              />
            </View>
          </View>
        )}

        {/* Suggest a Subscription Section */}
        <View style={styles.suggestSection}>
          <ImageBackground
            source={require('@/assets/images/suggest_sub.png')}
            style={styles.suggestCard}
          // imageStyle={styles.suggestBackground} // optional for rounded corners, opacity, etc.
          >
            <View style={styles.suggestHeader}>
              <Text style={styles.suggestTitle}>Suggest a Subscription!</Text>
              {/* <Text style={styles.suggestSubtitle}>
        Can't find what you're looking for? Let us know!
      </Text> */}
            </View>

            <View style={styles.suggestInputContainer}>
              <TextInput
                style={styles.suggestInput}
                placeholder="Submit Subscription"
                placeholderTextColor="#6B7280"
                value={suggestionText}
                onChangeText={setSuggestionText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={100}
              />
              <TouchableOpacity
                style={[
                  styles.suggestSendButton,
                  (!suggestionText.trim() || isSendingSuggestion) &&
                  styles.suggestSendButtonDisabled,
                ]}
                onPress={handleSendSuggestion}
                disabled={!suggestionText.trim() || isSendingSuggestion}
              >
                {isSendingSuggestion ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </ImageBackground>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E0E0E',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    marginLeft: 6,
  },
  cart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#0E0E0E',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchHeader: {
    paddingHorizontal: 10,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1000,
    marginBottom: 10,
  },
  carouselSection: {
    // marginHorizontal: 6,
    marginBottom: 24,
    marginRight: -5,
  },
  carouselContainer: {
    gap: 8,
  },
  carouselItem: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  carouselContent: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  carouselIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  paginationDotActive: {
    width: 24,
    height: 8,
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  section: {
    marginBottom: 20,
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
    fontWeight: 'bold',
    color: 'white',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  horizontalList: {
    paddingHorizontal: 10,
    gap: 6,
  },
  verticalList: {
    paddingHorizontal: 10,
    gap: 10,
  },
  brandItem: {
    width: 80,
    paddingBottom: 8,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  brandImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 8,
  },
  brandImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    color: '#40e0d0',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryColumn: {
    width: 180,
  },
  categoryCard: {
    width: 180,
    height: 105,
    borderWidth: 1,
    borderColor: '#00000030',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    transform: [{ scaleX: -1 }],
  },
  categoryGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 12,
  },
  categoryHeader: {
    alignItems: 'flex-end',
  },
  categoryBadge: {
    backgroundColor: '#ffffff33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00000030',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  categoryFooter: {
    gap: 6,
  },
  categoryName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryIcons: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  categoryIconMore: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconMoreText: {
    color: 'black',
    fontSize: 12,
    fontWeight: '700',
  },
  groupCard: {
    width: 240,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
  },
  groupCardVertical: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  groupImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 6,
  },
  groupImage: {
    width: '100%',
    height: '100%',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupMetaText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  groupDetails: {
    gap: 16,
  },
  groupPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  groupPricingVertical: {
    alignItems: 'flex-end',
  },
  groupPrice: {
    color: '#00ee00',
    fontSize: 20,
    fontWeight: 'bold',
  },
  groupPriceLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupDurationText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  groupCountBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  groupCountText: {
    color: '#40e0d0',
    fontSize: 12,
    fontWeight: '600',
  },

  suggestSection: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  suggestCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 20,
    height: 300,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
    overflow: 'hidden',
  },
  suggestHeader: {
    marginBottom: 10,
  },
  suggestTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  suggestInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(166, 170, 176, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(48, 49, 50, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 20,
    gap: 12,
  },
  suggestInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    minHeight: 10,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  suggestSendButton: {
    width: 36,
    height: 36,
    borderRadius: 20,
    backgroundColor: '#949494ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestSendButtonDisabled: {
    backgroundColor: 'rgba(150, 150, 150, 0.5)',
  },
  suggestIllustration: {
    alignItems: 'center',
    marginTop: 10,
  },
  suggestImage: {
    width: width * 0.6,
    height: 120,
  },
});