import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Animated, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, CreditCard, Info, CircleHelp as HelpCircle, LogOut, ChevronRight,  Gift, Settings as SettingsIcon, ShoppingBag, Users, BookOpen, Mail, Star, ExternalLink } from 'lucide-react-native';
import { storage } from '@/utils/storage';
import { useAuthStore } from '@/stores/authStore';
import { router } from 'expo-router';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

const { width } = Dimensions.get('window');

// Carousel configuration
const CAROUSEL_ITEM_WIDTH = width-20;
const CAROUSEL_ITEM_HEIGHT = (CAROUSEL_ITEM_WIDTH)/3;

interface CarouselItem {
  type: string;
  blurhash: string;
  image_url: string;
  data: {
    args?: {
      brand_id?: string;
    };
    url?: string;
    route?: string;
  };
}

interface User {
  dp: string;
  fullname: string;
  phoneNumber: string;
}

export default function AccountScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [user, setUser] = useState<User>({
    dp: '',
    fullname: '',
    phoneNumber: '',
  })
  const { t } = useTranslation();
  const [useFallBack, setUseFallBack] = useState(false);
  const { toast, showSuccess, showError, hideToast } = useToast();

  // Carousel state
  const [carouselData, setCarouselData] = useState<CarouselItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(false);
  const scrollX = new Animated.Value(0);
  const flatListRef = React.useRef<FlatList>(null);

  useEffect(() => {
    loadUser();
    fetchCarouselData();
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    if (carouselData.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % carouselData.length;
        flatListRef.current?.scrollToIndex({
          index: nextSlide,
          animated: true
        });
        return nextSlide;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [carouselData.length]);

  const handleSignOut = async () => {
    const performSignOut = async () => {
      setIsSigningOut(true);

      try {
        // Logout using the auth store
        await useAuthStore.logout();

        // Small delay to show loading state and ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 800));

        // Navigate to auth screen and reset the entire navigation stack
        router.replace('/language-selection');

        // Show success feedback
        showSuccess('You have been successfully signed out.');

      } catch (error) {
        console.error('Error signing out:', error);

        // Show error
        showError('There was an error signing you out. Please try again.');
        setIsSigningOut(false);
      }
    };

    performSignOut();
  };

  const fetchCarouselData = async () => {
    setIsLoadingCarousel(true);
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
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
            query GetProfileCarousal($user_id: uuid = "") {
              __typename
              whatsubGetProfileCarousals(request: {user_id: $user_id}) {
                __typename
                type
                blurhash
                image_url
                data
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
        console.error('Error fetching carousel data:', data.errors);
        return;
      }

      setCarouselData(data.data?.whatsubGetProfileCarousals || []);
    } catch (error) {
      console.error('Error fetching carousel data:', error);
    } finally {
      setIsLoadingCarousel(false);
    }
  };

  const handleCarouselItemPress = (item: CarouselItem) => {
    try {
      let data;

      // Parse data if it's a string
      if (typeof item.data === 'string') {
        try {
          data = JSON.parse(item.data);
        } catch (parseError) {
          console.error('Error parsing carousel data:', parseError);
          return;
        }
      } else {
        data = item.data;
      }

      // Navigate based on data
      if (data?.args?.brand_id) {
        router.push({
          pathname: '/product-details',
          params: { id: data.args.brand_id }
        });
      } else if (data?.url) {
        Linking.openURL(data.url).catch((err) =>
          console.error('Failed to open URL:', err)
        );
      } else if (data?.route) {
        router.push(data.route);
      }
    } catch (error) {
      console.error('Error handling carousel item press:', error);
      showError('Failed to open content');
    }
  };

  const renderCarouselItem = ({ item, index }: { item: CarouselItem; index: number }) => (
    <TouchableOpacity
      style={styles.carouselItem}
      onPress={() => handleCarouselItemPress(item)}
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
      <View style={styles.carouselContent}>
        <View style={styles.carouselIcon}>
          <ExternalLink size={16} color="white" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const loadUser = async () => {
    try {
      const phoneNumber = (await AsyncStorage.getItem('phone_number')) || '';
      const dp = (await AsyncStorage.getItem('dp')) || '';
      const fullname = (await AsyncStorage.getItem('fullname')) || '';

      setUser({
        dp,
        fullname,
        phoneNumber,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };


  const handleProfilePress = () => {
    router.push('/(tabs)/account/profile');
  };

  const handlePayoutMethodsPress = () => {
    router.push('/(tabs)/account/payment-methods');
  };

  const handleChangeLanguagePress = () => {
    router.push('/(tabs)/account/language');
  };

  const handlePrivacyPress = () => {
    router.push('/(tabs)/account/privacy');
  };

  const handleSavingsPress = () => {
    router.push('/(tabs)/account/savings');
  };

  const handleSettingsPress = () => {
    router.push('/(tabs)/account/settings');
  };

  const handleNotificationsPress = () => {
    router.push('/(tabs)/account/notifications');
  };

  const handleOrderHistoryPress = () => {
    router.push('/(tabs)/account/order-history');
  };

  const handleFriendsPress = () => {
    router.push('/(tabs)/account/friends');
  };

  const handleBlogsPress = () => {
    router.push('/(tabs)/account/blogs');
  };

  const handleReviewUsPress = () => {
    // TODO: Implement blogs and articles page
    try {
      Linking.openURL('https://play.google.com/store/apps/details?id=org.grow90.whatsub')
      .catch(error => (console.log('error occurred: ', error)));
    }
    catch{
      console.log('Error occurred');
      showError('Error occurred');
    }
  };

  const handleAppInfoPress = () => {
    router.push('/(tabs)/account/app-info');
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0]?.toUpperCase() || '';
    const last = parts[parts.length - 1]?.[0]?.toUpperCase() || '';
    return first + last;
  };

  const handleAIMailboxPress = () => {
    router.push('/(tabs)/account/ai-mailbox');
  };

  const settingsItems = [
    {
      icon: User,
      title: t('account.profile'),
      color: '#6366F1',
      onPress: handleProfilePress,
    },
    {
      icon: ShoppingBag,
      title: 'Order History',
      color: '#F59E0B',
      onPress: handleOrderHistoryPress,
    },
    {
      icon: Users,
      title: 'Friends',
      color: '#10B981',
      onPress: handleFriendsPress,
    },
    {
      icon: BookOpen,
      title: 'Blogs and Articles',
      color: '#8B5CF6',
      onPress: handleBlogsPress,
    },
    {
      icon: Mail,
      title: 'AI Powered Mailbox',
      color: '#06B6D4',
      onPress: handleAIMailboxPress,
    },
    {
      icon: CreditCard,
      title: t('account.paymentMethods'),
      color: '#F59E0B',
      onPress: handlePayoutMethodsPress,
    },
    {
      icon: SettingsIcon,
      title: 'App Settings',
      color: '#6366F1',
      onPress: handleSettingsPress,
    },
    {
      icon: Gift,
      title: 'Money Saved',
      color: '#10B981',
      onPress: handleSavingsPress,
    },
    {
      icon: Star,
      title: 'Review Us',
      color: '#EC4899',
      onPress: handleReviewUsPress,
    },
    {
      icon: HelpCircle,
      title: t('account.helpSupport'),
      color: '#8B5CF6',
      onPress: () => router.push('/(tabs)/account/help-support'),
    },
    {
      icon: Info,
      title: 'App Info',
      color: '#06B6D4',
      onPress: handleAppInfoPress,
    },
  ];

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            {user?.dp && !useFallBack ? (
              <Image
                source={{ uri: user.dp }}
                onError={() => setUseFallBack(true)}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitial}>
                  {user?.fullname ? getInitials(user.fullname) : 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullname}</Text>
            <Text style={styles.profileEmail}>{user?.phoneNumber}</Text>
          </View>
        </View>

        {/* Carousel Section */}
        {carouselData.length > 0 && (
          <View style={styles.carouselSection}>
            <FlatList
              ref={flatListRef}
              data={carouselData}
              renderItem={renderCarouselItem}
              keyExtractor={(item, index) => `carousel-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CAROUSEL_ITEM_WIDTH + 20}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContainer}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                {
                  useNativeDriver: false,
                  listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                    const slideIndex = Math.round(
                      event.nativeEvent.contentOffset.x / (CAROUSEL_ITEM_WIDTH + 40)
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

        <View style={styles.settingsContainer}>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingItem}
              onPress={item.onPress}
              disabled={isSigningOut}
            >
              <View style={[
                styles.settingIcon,
                { backgroundColor: `${item.color}20` }
              ]}>
                <item.icon size={16} color={item.color} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{item.title}</Text>
              </View>
              <ChevronRight size={16} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            isSigningOut && styles.logoutButtonDisabled
          ]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <>
              <ActivityIndicator size="small" color="#EF4444" />
              <Text style={styles.logoutText}>{t('account.signingOut')}</Text>
            </>
          ) : (
            <>
              <LogOut size={16} color="#EF4444" />
              <Text style={styles.logoutText}>{t('account.signOut')}</Text>
            </>
          )}
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
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  placeholder: {
    width: 36,
    height: 36,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    padding: 16,
    marginBottom: 20,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '12',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  carouselSection: {
    marginHorizontal: 6,
    marginBottom: 24,
  },
  carouselContainer: {
    gap: 8,
  },
  carouselItem: {
    width: CAROUSEL_ITEM_WIDTH,
    height: CAROUSEL_ITEM_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // paddingHorizontal:10
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
  settingsContainer: {
    marginHorizontal: 10,
    gap: 6,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 14,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginHorizontal: 10,
    padding: 14,
    gap: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  accountInfo: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.3)',
    marginHorizontal: 10,
    marginTop: 24,
    padding: 14,
  },
  accountInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  accountInfoText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  versionInfo: {
    backgroundColor: 'rgba(31, 41, 55, 0.4)',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 16,
    padding: 12,
  },
  versionText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
});