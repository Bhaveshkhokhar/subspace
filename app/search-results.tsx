import React, { useState, useEffect } from 'react';
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
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  Star, 
  Clock, 
  ShoppingCart,
  Play,
  Tv,
  Package,
  TrendingUp,
  Clock as ClockFading,
  X
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import SubscriptionManagementModal from '@/components/SubscriptionManagementModal';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface SearchResult {
  shows_and_movies: any[];
  services: Service[];
  shared_subscriptions: SharedSubscription[];
  shop_products: any[];
}

interface SearchHint {
  hint: string;
  type: string;
}

interface SearchLog {
  query: string;
  created_at?: string;
  index: string;
  uuid: string;
  count?: number;
}

interface OTTContent {
  title: string;
  blurhash_poster: string;
  id: string;
  imdb_rating: number;
  imdb_votes: number;
  original_release_year: number;
  poster_url: string;
}

interface OTTTrending {
  whatsub_ott_movies: OTTContent | null;
  whatsub_ott_shows: OTTContent | null;
}

interface SearchData {
  searchHints: SearchHint[];
  trendingSearches: SearchLog[];
  recentSearches: SearchLog[];
  ottTrending: OTTTrending[];
}

interface AutoCompleteSuggestion {
  id: string;
  image_url: string;
  index: string;
  playstore_rating: number;
  title: string;
  type: string;
  whatsub_class: string;
}

interface Service {
  id: string;
  blurhash: string;
  image_url: string;
  playstore_rating: number;
  score: any;
  service_name: string;
  whatsub_class: string;
  whatsub_class_id: string;
}

interface SharedSubscription {
  id: string;
  auth_fullname2: {
    dp: string;
    fullname: string;
  };
  blurhash: string;
  count: number;
  group_limit: number;
  hide_limit: number;
  name: string;
  number_of_users: number;
  room_dp: string;
  share_limit: number;
  price: number;
  whatsub_plans: {
    id: string;
    duration: number;
    duration_type: string;
    service_id: string;
    price: number;
  };
}

interface ShopProduct {
  id: string;
  poster_url: string;
  image_url: string;
  service_name: string;
  price: number;
  discounted_price: number;
  whatsub_plans: {
    discounted_price: number;
  }[];
}

export default function SearchResultsScreen() {
  const params = useLocalSearchParams();
  const { query: initialQuery } = params;
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState((initialQuery as string) || '');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  // Search functionality state
  const [searchHints, setSearchHints] = useState<SearchHint[]>([]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [searchData, setSearchData] = useState<SearchData>({
    searchHints: [],
    trendingSearches: [],
    recentSearches: [],
    ottTrending: []
  });
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isLoadingSearchData, setIsLoadingSearchData] = useState(false);
  const [autoCompleteSuggestions, setAutoCompleteSuggestions] = useState<AutoCompleteSuggestion[]>([]);
  const [isLoadingAutoComplete, setIsLoadingAutoComplete] = useState(false);
  const searchTimeoutRef = React.useRef<number | null>(null);
  const animationTimeoutRef = React.useRef<number | null>(null);
  const pauseTimeoutRef = React.useRef<number | null>(null);

  // Clear search results when search query is cleared
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      setSearchResults(null);
      setAutoCompleteSuggestions([]);
    }
  }, [searchQuery]);

  // Initialize search data and hints
  useEffect(() => {
    fetchSearchData();
    fetchSearchHints();
  }, []);

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
          }, 1000);
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

    if (searchQuery.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchAutoCompleteSuggestions(searchQuery);
      }, 300);
    } else {
      setAutoCompleteSuggestions([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Update suggestions visibility based on focus and suggestions
  useEffect(() => {
    setShowSearchSuggestions(isFocused && (
      autoCompleteSuggestions.length > 0 || 
      searchData.recentSearches.length > 0 || 
      searchData.trendingSearches.length > 0 ||
      searchData.ottTrending.length > 0
    ));
  }, [isFocused, autoCompleteSuggestions, searchData]);

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
                hint
                type
              }
            }
          `,
        })
      });

      const data = await response.json();
      setSearchHints(data.data?.whatsub_search_hint_text || []);
    } catch (error) {
      console.error('Error fetching search hints:', error);
    }
  };

  const fetchSearchData = async () => {
    const userId = await storage.getUserId();
    if (!userId) return;
    
    setIsLoadingSearchData(true);
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
            query GetSearchData($user_id: uuid!) {
              __typename
              whatsub_search_hint_text(where: {type: {_eq: "search"}}) {
                hint
              }
              whatsub_search_logs_trending(limit: 5) {
                query
                count
                index
                uuid
              }
              whatsub_search_logs(where: {user_id: {_eq: $user_id}}, limit: 5, order_by: {created_at: desc}) {
                query
                created_at
                index
                uuid
              }
              whatsub_ott_trending(order_by: {rank: asc}, limit: 40) {
                whatsub_ott_movies {
                  title
                  blurhash_poster
                  id
                  imdb_rating
                  imdb_votes
                  original_release_year
                  poster_url
                }
                whatsub_ott_shows {
                  title
                  blurhash_poster
                  id
                  imdb_rating
                  imdb_votes
                  original_release_year
                  poster_url
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
      
      if (data.data) {
        setSearchData({
          searchHints: data.data.whatsub_search_hint_text || [],
          trendingSearches: data.data.whatsub_search_logs_trending || [],
          recentSearches: data.data.whatsub_search_logs || [],
          ottTrending: data.data.whatsub_ott_trending || []
        });
      }
    } catch (error) {
      console.error('Error fetching search data:', error);
    } finally {
      setIsLoadingSearchData(false);
    }
  };

  const fetchAutoCompleteSuggestions = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoadingAutoComplete(true);
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
            query MyQuery($searchString: String!) {
              __typename
              w_getAutoComplete(request: {query: $searchString}) {
                suggestions
              }
            }
          `,
          variables: {
            searchString: query
          }
        })
      });

      const data = await response.json();
      
      if (data.data?.w_getAutoComplete?.suggestions) {
        setAutoCompleteSuggestions(data.data.w_getAutoComplete.suggestions);
      } else {
        setAutoCompleteSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching auto-complete suggestions:', error);
      setAutoCompleteSuggestions([]);
    } finally {
      setIsLoadingAutoComplete(false);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();
      
      if (!userId || !authToken) {
        showError('Please login to search');
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
            query MyQuery($searchString: String = "", $user_id: uuid = "", $uuid: uuid, $index: String) {
              __typename
              w_getSearchResultV4(request: {query: $searchString, user_id: $user_id, uuid: $uuid, index: $index}) {
                shows_and_movies
                services
                shared_subscriptions
                shop_products
              }
            }
          `,
          variables: {
            searchString: query,
            user_id: userId,
            uuid: null,
            index: null
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        showError('Search failed. Please try again.');
        return;
      }

      setSearchResults(data.data?.w_getSearchResultV4 || {
        shows_and_movies: [],
        services: [],
        shared_subscriptions: [],
        shop_products: []
      });
    } catch (error) {
      console.error('Error performing search:', error);
      showError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
      setShowSearchSuggestions(false);
      setIsFocused(false);
    }
  };

  const handleSearchFocus = async () => {
    setIsFocused(true);
    const userId = await storage.getUserId();
    if (userId && searchData.searchHints.length === 0) {
      await fetchSearchData();
    }
    setShowSearchSuggestions(true);
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow for suggestion tap
    setTimeout(() => {
      setIsFocused(false);
      setShowSearchSuggestions(false);
    }, 200);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSearchSuggestions(false);
    setIsFocused(false);
    performSearch(suggestion);
  };

  const handleOTTContentSelect = (content: OTTContent) => {
    setSearchQuery(content.title);
    setShowSearchSuggestions(false);
    setIsFocused(false);
    performSearch(content.title);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setAutoCompleteSuggestions([]);
    setShowSearchSuggestions(false);
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore');
    }
  };

  const onRefresh = async () => {
    if (searchQuery.trim()) {
      setIsRefreshing(true);
      await performSearch(searchQuery);
      setIsRefreshing(false);
    }
  };

  const handleServicePress = (service: Service) => {
    setSelectedServiceId(service.id);
    setShowSubscriptionModal(true);
  };

  const handleGroupPress = (group: SharedSubscription) => {
    router.push(`/groups/${group.whatsub_plans.id}`);
  };

  const handleBrandPress = (brand: ShopProduct) => {
    router.push({
      pathname: '/product-details',
      params: { id: brand.id }
    });
  };

  const handleProductPress = (product: ShopProduct) => {
    router.push({
      pathname: '/product-details',
      params: { id: product.id }
    });
  };

  const handleModalClose = () => {
    setShowSubscriptionModal(false);
    setSelectedServiceId(null);
  };

  const handleModalSuccess = () => {
    setShowSubscriptionModal(false);
    setSelectedServiceId(null);
    showSuccess('Subscription added successfully!');
  };

  const renderBrandCard = (product: ShopProduct, index: number) => (
    <TouchableOpacity
      key={`brand-${product.id}-${index}`}
      style={styles.brandCard}
      onPress={() => handleProductPress(product)}
      activeOpacity={0.8}
    >
      <View style={styles.brandImageContainer}>
        <Image
          source={{ uri: product.poster_url }}
          style={styles.brandImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.brandGradient}
        />
        
        {/* Discount Badge */}
        {product.discounted_price < product.price && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {Math.round(((product.price - product.discounted_price) / product.price) * 100)}% OFF
            </Text>
          </View>
        )}
        
        {/* Brand Logo */}
        <View style={styles.brandLogoContainer}>
          <Image
            source={{ uri: product.image_url }}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>
        
        {/* Brand Info */}
        <View style={styles.brandInfo}>
          <Text style={styles.brandName} numberOfLines={2}>
            {product.service_name}
          </Text>
          <Text style={styles.brandPrice}>
            Starting at ₹{product.whatsub_plans[0].discounted_price}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGroupCard = (group: SharedSubscription, index: number) => (
    <TouchableOpacity
      key={`group-${group.id}-${index}`}
      style={styles.groupCard}
      onPress={() => handleGroupPress(group)}
      activeOpacity={0.8}
    >
      <View style={styles.groupHeader}>
        <View style={styles.groupLogoContainer}>
          <Image
            source={{ uri: group.room_dp }}
            style={styles.groupLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName} numberOfLines={1}>
            {group.name}
          </Text>
          <Text style={styles.groupPrice}>
            ₹{Math.ceil(group.whatsub_plans.price / group.share_limit)} / User / {group.whatsub_plans.duration_type === 'months' ? 'Month' : 'Year'}
          </Text>
          <Text style={styles.groupSubtitle}>
            bought by {group.auth_fullname2.fullname}
          </Text>
          <Text style={styles.groupMembers}>
            {group.number_of_users} / {group.share_limit} friends sharing
          </Text>
        </View>
        <TouchableOpacity style={styles.joinButton}>
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderServiceCard = (service: Service, index: number) => (
    <TouchableOpacity
      key={`service-${service.id}-${index}`}
      style={styles.serviceCard}
      onPress={() => handleServicePress(service)}
      activeOpacity={0.8}
    >
      <View style={styles.serviceHeader}>
        <View style={styles.serviceLogoContainer}>
          <Image
            source={{ uri: service.image_url }}
            style={styles.serviceLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {service.service_name}
          </Text>
          <Text style={styles.serviceCategory}>
            {service.whatsub_class || 'Service'}
          </Text>
          {service.playstore_rating > 0 && (
            <View style={styles.ratingContainer}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>
                {service.playstore_rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.title}>Search Results</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <View style={[
              styles.searchInputContainer,
              isFocused && styles.searchInputContainerFocused
            ]}>
              <Search size={18} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                underlineColorAndroid="transparent"
                selectionColor="#6366F1"
                placeholder={searchQuery || isFocused ? "Search services, content, groups..." : `Search ${currentPlaceholder}`}
                placeholderTextColor="#4B5563"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoFocus={true}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={clearSearch}>
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
              
              {isLoadingAutoComplete ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : null}
            </View>

            {/* Search Suggestions */}
            {showSearchSuggestions ? (
              <View style={styles.suggestionsContainer}>
                <ScrollView
                  style={styles.suggestionsScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {isLoadingSearchData ? (
                    <View style={styles.suggestionLoadingContainer}>
                      <ActivityIndicator size="small" color="#6366F1" />
                      <Text style={styles.suggestionLoadingText}>Loading suggestions...</Text>
                    </View>
                  ) : (
                    <>
                      {/* Auto-complete Suggestions */}
                      {autoCompleteSuggestions.length > 0 && (
                        <View style={styles.suggestionSection}>
                          {autoCompleteSuggestions.slice(0, 6).map((suggestion, index) => (
                            <TouchableOpacity
                              key={`autocomplete-${index}`}
                              style={styles.autoCompleteSuggestionItem}
                              onPress={() => handleSuggestionSelect(suggestion.title)}
                            >
                              <Image
                                source={{ uri: suggestion.image_url }}
                                style={styles.autoCompletePoster}
                                resizeMode="cover"
                              />
                              <View style={styles.autoCompleteInfo}>
                                <Text style={styles.autoCompleteTitle} numberOfLines={1}>
                                  {suggestion.title}
                                </Text>
                                <View style={styles.autoCompleteMeta}>
                                  <Text style={styles.autoCompleteClass}>{suggestion.whatsub_class}</Text>
                                  {suggestion.playstore_rating > 0 && (
                                    <View style={styles.autoCompleteRating}>
                                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                                      <Text style={styles.autoCompleteRatingText}>
                                        {suggestion.playstore_rating.toFixed(1)}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Recent Searches */}
                      {searchQuery.trim().length === 0 && searchData.recentSearches.length > 0 && (
                        <View style={styles.suggestionSection}>
                          <Text style={styles.suggestionSectionTitle}>Recent Searches</Text>
                          <View style={styles.suggestionTilesContainer}>
                            {searchData.recentSearches.map((search, index) => (
                              <TouchableOpacity
                                key={`recent-${index}`}
                                style={styles.suggestionTile}
                                onPress={() => handleSuggestionSelect(search.query)}
                              >
                                <ClockFading size={14} color="#9CA3AF" />
                                <Text style={styles.suggestionTileText} numberOfLines={1}>
                                  {search.query}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )} 

                      {/* Trending Searches */}
                      {searchQuery.trim().length === 0 && searchData.trendingSearches.length > 0 && (
                        <View style={styles.suggestionSection}>
                          <Text style={styles.suggestionSectionTitle}>Trending Searches</Text>
                          <View style={styles.suggestionTilesContainer}>
                            {searchData.trendingSearches.map((search, index) => (
                              <TouchableOpacity
                                key={`trending-${index}`}
                                style={styles.suggestionTile}
                                onPress={() => handleSuggestionSelect(search.query)}
                              >
                                <TrendingUp size={14} color="#9CA3AF" />
                                <Text style={styles.suggestionTileText} numberOfLines={1}>
                                  {search.query}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* OTT Trending Content */}
                      {searchData.ottTrending.length > 0 && (
                        <View style={styles.suggestionSection}>
                          <Text style={styles.suggestionSectionTitle}>Trending Content</Text>
                          {searchData.ottTrending.slice(0, 8).map((item, index) => {
                            const content = item.whatsub_ott_movies || item.whatsub_ott_shows;
                            if (!content) return null;
                            
                            return (
                              <TouchableOpacity
                                key={`ott-${index}`}
                                style={styles.ottSuggestionItem}
                                onPress={() => handleOTTContentSelect(content)}
                              >
                                <Image
                                  source={{ uri: content.poster_url }}
                                  style={styles.ottPoster}
                                  resizeMode="cover"
                                />
                                <View style={styles.ottInfo}>
                                  <Text style={styles.ottTitle} numberOfLines={1}>
                                    {content.title}
                                  </Text>
                                  <View style={styles.ottMeta}>
                                    <Text style={styles.ottYear}>{content.original_release_year}</Text>
                                    {content.imdb_rating > 0 && (
                                      <View style={styles.ottRating}>
                                        <Star size={12} color="#F59E0B" fill="#F59E0B" />
                                        <Text style={styles.ottRatingText}>
                                          {content.imdb_rating.toFixed(1)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : !showSearchSuggestions && searchResults && searchQuery.trim() ? (
          <>
            {/* Brands Section */}
            {searchResults.shop_products.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Brands</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.brandsScrollContent}
                  style={styles.brandsScroll}
                >
                  {searchResults.shop_products.map((product, index) => 
                    renderBrandCard(product, index)
                  )}
                </ScrollView>
              </View>
            )}

            {/* Groups Section */}
            {searchResults.shared_subscriptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Groups</Text>
                <View style={styles.groupsList}>
                  {searchResults.shared_subscriptions.slice(0, 6).map((group, index) => 
                    renderGroupCard(group, index)
                  )}
                </View>
              </View>
            )}

            {/* Trending Subscriptions Section */}
            {searchResults.services.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending Subscriptions</Text>
                <View style={styles.servicesList}>
                  {searchResults.services.slice(0, 10).map((service, index) => 
                    renderServiceCard(service, index)
                  )}
                </View>
              </View>
            )}

            {/* No Results */}
            {searchResults.shop_products.length === 0 && 
             searchResults.shared_subscriptions.length === 0 && 
             searchResults.services.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Search size={48} color="#6366F1" />
                </View>
                <Text style={styles.emptyTitle}>No Results Found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search terms or browse our categories
                </Text>
              </View>
            )}
          </>
        ) : !showSearchSuggestions && searchQuery.trim() && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Search size={48} color="#6366F1" />
            </View>
            <Text style={styles.emptyTitle}>Start Searching</Text>
            <Text style={styles.emptySubtitle}>
              Enter a search term to find services, groups, and content
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Subscription Management Modal */}
      <SubscriptionManagementModal
        isVisible={showSubscriptionModal}
        onClose={handleModalClose}
        serviceId={selectedServiceId || undefined}
        onSuccess={handleModalSuccess}
        mode="add"
      />
      
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
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    fontWeight: '700',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6366F1',
    gap: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInputContainerFocused: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 2,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(31, 31, 31, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
    overflow: 'hidden',
  },
  suggestionsScrollView: {
    maxHeight: 400,
  },
  suggestionLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  suggestionLoadingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  suggestionSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 55, 55, 0.3)',
  },
  suggestionSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionTilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionTile: {
    backgroundColor: 'transparent',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  suggestionTileText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  autoCompleteSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  autoCompletePoster: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  autoCompleteInfo: {
    flex: 1,
  },
  autoCompleteTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  autoCompleteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoCompleteClass: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  autoCompleteRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoCompleteRatingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  ottSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  ottPoster: {
    width: 32,
    height: 48,
    borderRadius: 4,
  },
  ottInfo: {
    flex: 1,
  },
  ottTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  ottMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ottYear: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ottRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ottRatingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  
  // Brands Section
  brandsScroll: {
    marginHorizontal: 10,
  },
  brandsScrollContent: {
    paddingHorizontal: 10,
    gap: 16,
  },
  brandCard: {
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  brandImageContainer: {
    flex: 1,
    position: 'relative',
  },
  brandImage: {
    width: '100%',
    height: '100%',
  },
  brandGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  brandLogoContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  brandInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  brandName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  brandPrice: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Groups Section
  groupsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  groupCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  groupLogo: {
    width: 32,
    height: 32,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  groupPrice: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  groupSubtitle: {
    color: '#9CA3AF',
    fontSize: 10,
    marginBottom: 2,
  },
  groupMembers: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  joinButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Services Section
  servicesList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  serviceCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  serviceLogo: {
    width: 24,
    height: 24,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceCategory: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
  },
});