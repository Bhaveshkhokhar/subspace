import React, { useState, useEffect, useRef } from 'react';
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
import { 
  ArrowLeft, 
  TrendingUp, 
  Star, 
  Search, 
  Flame as Fire, 
  Users, 
  Zap, 
  ChevronRight, 
  Award, 
  Crown, 
  Sparkles, 
  X 
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import SubscriptionManagementModal from '@/components/SubscriptionManagementModal';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface SearchHint {
  hint: string;
}

interface TrendingService {
  whatsub_services: {
    id: string;
    image_url: string;
    blurhash: string;
    service_name: string;
    playstore_rating: number;
  };
}

interface TrendingData {
  whatsub_search_hint_text: SearchHint[];
  whatsub_subscriptions_trending: TrendingService[];
}

interface SearchSuggestion {
  id: string;
  image_url: string;
  index: string;
  playstore_rating: number;
  title: string;
  type: string;
  whatsub_class: string;
}

interface SearchResult {
  shows_and_movies: any[];
  services: any[];
  shared_subscriptions: any[];
  shop_products: any[];
}

export default function TrendingSubscriptionsPage() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [trendingData, setTrendingData] = useState<TrendingData>({
    whatsub_search_hint_text: [],
    whatsub_subscriptions_trending: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  
  // Animated placeholder state
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderSuggestions, setPlaceholderSuggestions] = useState<string[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const animationTimeoutRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    fetchTrendingData();
  }, []);

  // Update placeholder suggestions when trending data is loaded
  useEffect(() => {
    if (trendingData.whatsub_search_hint_text.length > 0) {
      const hints = trendingData.whatsub_search_hint_text.map(hint => `${hint.hint}`);
      setPlaceholderSuggestions(hints);
    } else {
      setPlaceholderSuggestions([
        "YouTube Premium",
        "Spotify music",
        "Netflix shows",
        "Amazon Prime",
        "Google services",
        "Disney+ content",
        "Adobe Creative",
        "Microsoft Office"
      ]);
    }
  }, [trendingData.whatsub_search_hint_text]);

  // Animated placeholder effect
  useEffect(() => {
    if (searchQuery || isFocused || placeholderSuggestions.length === 0) {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      return;
    }

    const animatePlaceholder = () => {
      const targetText = placeholderSuggestions[placeholderIndex];
      
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
          setPlaceholderIndex((prev) => (prev + 1) % placeholderSuggestions.length);
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
  }, [currentPlaceholder, placeholderIndex, isTyping, searchQuery, isFocused, placeholderSuggestions]);

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

  // Debounced search and suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length > 0) {
      // Fetch suggestions for autocomplete
      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchSuggestions(searchQuery);
      }, 300);
    } else {
      setSearchResults(null);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Update suggestions visibility based on focus and suggestions
  useEffect(() => {
    setShowSuggestions(isFocused && searchSuggestions.length > 0 && searchQuery.trim().length > 0);
  }, [isFocused, searchSuggestions, searchQuery]);

  const fetchTrendingData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) {
        showError('Please login to view trending subscriptions');
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
            query GetTrending {
              __typename
              whatsub_search_hint_text(where: {type: {_eq: "track"}}) {
                __typename
                hint
              }
              whatsub_subscriptions_trending(limit: 10) {
                __typename
                whatsub_services {
                  __typename
                  id
                  image_url
                  blurhash
                  service_name
                  playstore_rating
                }
              }
            }
          `
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        setError('Failed to fetch trending subscriptions');
        return;
      }

      setTrendingData(data.data || {
        whatsub_search_hint_text: [],
        whatsub_subscriptions_trending: []
      });
    } catch (error) {
      console.error('Error fetching trending data:', error);
      setError('Failed to fetch trending subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSearchSuggestions = async (query: string) => {
    const authToken = await storage.getAuthToken();
    if (!authToken || !query.trim()) return;
    
    setIsLoadingSuggestions(true);
    try {
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
                __typename
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
        setSearchSuggestions(data.data.w_getAutoComplete.suggestions);
      } else {
        setSearchSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      setSearchSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const fetchSearchResults = async (query: string, id: string | null = null, index: string | null = null) => {
    const authToken = await storage.getAuthToken();
    const userId = await storage.getUserId();
    if (!authToken || !userId || !query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query MyQuery($searchString: String = "", $user_id: uuid = "", $uuid: uuid = null, $index: String) {
              __typename
              w_getSearchResultV4(request: {query: $searchString, user_id: $user_id, uuid: $uuid, index: $index}) {
                __typename
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
            uuid: id,
            index: index
          }
        })
      });

      const data = await response.json();
      
      if (data.data?.w_getSearchResultV4) {
        setSearchResults(data.data.w_getSearchResultV4);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      fetchSearchResults(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.title);
    setShowSuggestions(false);
    fetchSearchResults(suggestion.title, suggestion.id, suggestion.index);
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow for suggestion tap
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
  };

  const handleServiceClick = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setShowSubscriptionModal(true);
  };

  const handleModalClose = () => {
    setShowSubscriptionModal(false);
    setSelectedServiceId(null);
  };

  const handleModalSuccess = () => {
    setShowSubscriptionModal(false);
    setSelectedServiceId(null);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchTrendingData();
    setIsRefreshing(false);
  };

  const displayData = searchResults ? 
    [...(searchResults.services || []), ...(searchResults.shows_and_movies || [])] : 
    trendingData.whatsub_subscriptions_trending;

  if(isLoading){ 
    return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}></Text>
          </View>
    )
  }
    
  return (
    <View style={styles.container}>
      {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.replace('/(tabs)/home')}
            >
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{t('trending.title')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search Section */}
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
                placeholder={ searchQuery || isFocused ? t('trending.search.placeholder') : `${t('common.search')} ${currentPlaceholder}`}
                placeholderTextColor="#4B5563"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsFocused(true)}
                onBlur={handleSearchBlur}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={clearSearch}>
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
              
              {isLoadingSuggestions ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : null}
            </View>

            {/* Search Suggestions */}
            {showSuggestions ? (
              <View style={styles.suggestionsContainer}>
                <ScrollView
                  style={styles.suggestionsScrollView}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {searchSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={`suggestion-${suggestion.id}-${index}`}
                      style={[
                        styles.suggestionItem,
                        index === searchSuggestions.length - 1 && styles.lastSuggestionItem
                      ]}
                      onPress={() => handleSuggestionSelect(suggestion)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.suggestionContent}>
                        <View style={styles.suggestionIcon}>
                          <Image
                            source={{ uri: suggestion.image_url }}
                            style={styles.suggestionImage}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.suggestionInfo}>
                          <Text style={styles.suggestionName}>
                            {suggestion.title}
                          </Text>
                          <View style={styles.suggestionMeta}>
                            <Text style={styles.suggestionCategory}>
                              {suggestion.whatsub_class}
                            </Text>
                            {suggestion.playstore_rating > 0 ? (
                              <View style={styles.suggestionRating}>
                                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                                <Text style={styles.suggestionRatingText}>
                                  {suggestion.playstore_rating.toFixed(1)}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <Search size={16} color="#6B7280" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
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
        {(isSearching) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6066F1" />
          </View>
        ) : null}

        {/* Error State */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchTrendingData}
            >
              <Text style={styles.retryButtonText}>{t('error.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Results */}
        {!isLoading && !isSearching && !error ? (
          <>
            {displayData.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Search size={32} color="#6366F1" />
                </View>
                <Text style={styles.emptyTitle}>{t('trending.noResults')}</Text>
              </View>
            ) : (
              <>
                {/* Search Results Header */}
                {searchResults ? (
                  <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>{t('trending.searchResults')} "{searchQuery}"</Text>
                    <Text style={styles.resultsCount}>
                      {displayData.length} {t('trending.results')}
                    </Text>
                  </View>
                ) : null}

                {/* Services List */}
                <View style={styles.servicesList}>
                  {displayData.map((item, index) => {
                    const service = item.whatsub_services || item;
                    
                    return (
                      <TouchableOpacity
                        key={`${service.id}-${index}`}
                        style={styles.serviceCard}
                        onPress={() => handleServiceClick(service.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.serviceContent}>
                          <View style={styles.serviceHeader}>
                            {/* Service Logo */}
                            <View style={styles.serviceLogo}>
                              <Image
                                source={{ uri: service.image_url }}
                                style={styles.serviceImage}
                                resizeMode="contain"
                              />
                            </View>

                            {/* Service Info */}
                            <View style={styles.serviceInfo}>
                              <Text style={styles.serviceName}>
                                {service.service_name || service.title}
                              </Text>
                              
                              <View style={styles.serviceMetaContainer}>
                                {service.playstore_rating > 0 ? (
                                  <View style={styles.ratingContainer}>
                                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                                    <Text style={styles.ratingValue}>
                                      {service.playstore_rating.toFixed(1)}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            <ChevronRight size={20} color="#6366F1" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
        ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center', 
    marginTop: 4,
  },
  headerContent: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  searchSection: {
    paddingHorizontal: 10,
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
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
    overflow: 'hidden',
  },
  suggestionsScrollView: {
    maxHeight: 250,
  },
  suggestionItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 55, 55, 0.3)',
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 4,
    overflow: 'hidden',
  },
  suggestionImage: {
    width: '100%',
    height: '100%',
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionCategory: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  suggestionRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  suggestionRatingText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
  },
  loadingContainer: {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
},
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 18,
  },
  emptySubtitle: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
  },
  resultsHeader: {
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  servicesList: {
    paddingHorizontal: 10,
    gap: 6,
  },
  serviceCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceContent: {
    position: 'relative',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  serviceLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  serviceMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F59E0B',
  },
});