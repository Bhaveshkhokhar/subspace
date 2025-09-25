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
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ShoppingCart,
  Heart,
  Share2,
  ExternalLink,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Star,
  Users,
  Clock,
  Shield,
  Plus,
  Check,
  CreditCard
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface Plan {
  id: string;
  plan_name: string;
  display_data: string;
  price: number;
  plan_details: string;
  discounted_price: number;
  duration: string | null;
  duration_type: string | null;
  status: string;
  is_plan: boolean;
  whatsub_order_items: Array<{
    id: string;
    quantity: number;
  }>;
}

interface ServiceDetails {
  image_url: string;
  blurhash: string;
  backdrop_url: string;
  backdrop_blurhash: string;
  about: string;
  url: string;
  service_name: string;
  playstore_rating: number;
  package_name: string | null;
  playstore_number_of_ratings: number;
  flexipay: boolean;
  flexipay_discount: number;
  flexipay_min: number;
  flexipay_max: number;
  flexipay_vendor: string;
  show_powered_by: boolean;
  flexipay_vendor_image: string | null;
  flexipay_vendor_conditions: string | null;
  flexipay_vendor_instructions: string;
  whatsub_class: {
    name: string;
  };
  whatsub_plans: Plan[];
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const { t } = useTranslation();
  const { toast, showSuccess, showInfo, showError, hideToast } = useToast();
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showRedeemInstructions, setShowRedeemInstructions] = useState(false);
  const [addingToCartPlanIds, setAddingToCartPlanIds] = useState<Set<string>>(new Set());
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [modalPlan, setModalPlan] = useState<Plan | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // FlexiPay specific states
  const [customAmount, setCustomAmount] = useState('');
  const [showFlexiPay, setShowFlexiPay] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (id) {
      fetchServiceDetails(id as string);
    }
  }, [id]);

  // Helper function to check if FlexiPay amount is valid
  const isFlexiPayAmountValid = () => {
    if (!customAmount || !serviceDetails) return false;

    const amount = parseFloat(customAmount);
    if (isNaN(amount)) return false;

    if (serviceDetails.flexipay_min && amount < serviceDetails.flexipay_min) return false;
    if (serviceDetails.flexipay_max && amount > serviceDetails.flexipay_max) return false;

    return true;
  };

  const fetchServiceDetails = async (serviceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!authToken || !userId) {
        setError('Please login to view service details');
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
            query getServiceDetails($service_id: uuid!, $user_id: uuid = "") {
              __typename
              whatsub_services(where: {id: {_eq: $service_id}}) {
                __typename
                image_url
                blurhash
                backdrop_url
                backdrop_blurhash
                about
                url
                service_name
                playstore_rating
                package_name
                playstore_number_of_ratings
                flexipay
                flexipay_discount
                flexipay_min
                flexipay_max
                flexipay_vendor
                show_powered_by
                flexipay_vendor_image
                flexipay_vendor_conditions
                flexipay_vendor_instructions
                whatsub_class {
                  __typename
                  name
                }
                whatsub_plans(where: {whatsub_coupon_availability: {count: {_gt: "0"}}}, order_by: {discounted_price: asc}) {
                  __typename
                  id
                  plan_name
                  display_data
                  price
                  plan_details
                  discounted_price
                  duration
                  duration_type
                  status
                  is_plan
                  whatsub_order_items(where: {whatsub_order: {status: {_eq: "cart"}, user_id: {_eq: $user_id}}}) {
                    __typename
                    id
                    quantity
                  }
                }
              }
              whatsub_orders(where: {status: {_eq: "cart"}, user_id: {_eq: $user_id}}) {
                __typename
                status
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
          variables: {
            service_id: serviceId,
            user_id: userId
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        setError('Failed to load service details');
        return;
      }

      const service = data.data?.whatsub_services?.[0];
      const orders = data.data?.whatsub_orders || [];

      if (service) {
        setServiceDetails(service);

        // Set FlexiPay state based on service details
        setShowFlexiPay(service.flexipay);

        // Auto-select the first available plan if not FlexiPay
        if (!service.flexipay && service.whatsub_plans.length > 0) {
          const availablePlans = service.whatsub_plans.filter((plan: Plan) =>
            plan.status === 'active'
          );
          if (availablePlans.length > 0) {
            setSelectedPlan(availablePlans[0]);
          }
        }

        // Calculate cart count
        const totalItems = orders.reduce((total: number, order: any) =>
          total + (order.whatsub_order_items_aggregate?.aggregate?.sum?.quantity || 0), 0
        );
        setCartCount(totalItems);
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
      setError('Failed to load service details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCartClick = () => {
    router.push('/cart');
  };

  const handleAddToCart = async (plan?: Plan) => {
    const planToAdd = plan || selectedPlan;

    if (!planToAdd && !showFlexiPay) {
      setError('Please select a plan');
      return;
    }

    if (showFlexiPay) {
      if (!customAmount) {
        setError('Please enter an amount');
        return;
      }

      const amount = parseFloat(customAmount);
      if (isNaN(amount)) {
        setError('Please enter a valid amount');
        return;
      }

      if (serviceDetails?.flexipay_min && amount < serviceDetails.flexipay_min) {
        setError(`Minimum amount is ₹${serviceDetails.flexipay_min}`);
        return;
      }

      if (serviceDetails?.flexipay_max && amount > serviceDetails.flexipay_max) {
        setError(`Maximum amount is ₹${serviceDetails.flexipay_max}`);
        return;
      }

      // Handle FlexiPay purchase
      handleFlexiPayPurchase(amount);
      return;
    }

    if (!planToAdd) return;

    const userId = await storage.getUserId();
    const authToken = await storage.getAuthToken();
    if (!userId || !authToken) {
      setError('Please login to add items to cart');
      return;
    }

    setAddingToCartPlanIds(prev => new Set(prev).add(planToAdd.id));

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation AddItemToCartMutation($plan_id: uuid = "", $user_id: uuid = "") {
              __typename
              whatsubAddItemToCart(request: {user_id: $user_id, plan_id: $plan_id}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            plan_id: planToAdd.id,
            user_id: userId
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0].message);
        return;
      }

      if (data.data?.whatsubAddItemToCart?.affected_rows > 0) {
        // Update cart count
        setCartCount(prev => prev + 1);

        // Refresh service details to update cart items
        await fetchServiceDetails(id as string);

        // Close modal if open
        if (showPlanModal) {
          setShowPlanModal(false);
        }
        showSuccess('Item added to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError('Failed to add item to cart');
    } finally {
      setAddingToCartPlanIds(prev => {
        const next = new Set(prev);
        next.delete(planToAdd.id);
        return next;
      });
    }
  };

  const handleFlexiPayPurchase = async (amount: number) => {
    const userId = await storage.getUserId();
    const authToken = await storage.getAuthToken();
    if (!userId || !authToken || !serviceDetails) {
      setError('Please login to make a purchase');
      return;
    }

    setAddingToCartPlanIds(prev => new Set(prev).add('flexipay'));

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($amount: numeric = "", $service_id: uuid = "", $user_id: uuid = "") {
              __typename
              whatsubAddAmountToCart(request: {amount: $amount, service_id: $service_id, user_id: $user_id}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            amount: amount,
            service_id: id,
            user_id: userId
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0].message);
        return;
      }

      if (data.data?.whatsubAddAmountToCart?.affected_rows > 0) {
        // Update cart count
        setCartCount(prev => prev + 1);

        // Clear the amount input
        setCustomAmount('');

        showSuccess('FlexiPay item added to cart successfully');
      } else {
        setError('Failed to add FlexiPay item to cart');
      }
    } catch (error) {
      console.error('Error adding FlexiPay to cart:', error);
      setError('Failed to add FlexiPay item to cart');
    } finally {
      setAddingToCartPlanIds(prev => {
        const next = new Set(prev);
        next.delete('flexipay');
        return next;
      });
    }

  };

  const openWebsite = async (url: string) => {
    try {
      await Linking.openURL(url.trim());
    } catch (error) {
      console.error('Error opening website:', error);
    }
  };

  const openApp = async (packageName: string, websiteUrl: string) => {
    try {
      await Linking.openURL(websiteUrl.trim());
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openPlanModal = (plan: Plan) => {
    setModalPlan(plan);
    setShowPlanModal(true);
  };

  const calculateDiscount = (originalPrice: number, discountedPrice: number) => {
    return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
  };

  const getPlanCartQuantity = (plan: Plan) => {
    return plan.whatsub_order_items.reduce((total, item) => total + item.quantity, 0);
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore');
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>{t('product.loading')}</Text>
      </LinearGradient>
    );
  }

  if (error || !serviceDetails) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <X size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>{t('product.notFound')}</Text>
          <Text style={styles.errorMessage}>{error || t('product.notFoundSubtitle')}</Text>
          <TouchableOpacity
            style={styles.backToExploreButton}
            onPress={() => router.replace('/(tabs)/explore')}
          >
            <Text style={styles.backToExploreText}>{t('product.backToBrands')}</Text>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('product.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('product.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.cartButton}
          onPress={handleCartClick}
        >
          <ShoppingCart size={20} color="#F59E0B" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero Section with Backdrop */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: serviceDetails.backdrop_url || serviceDetails.image_url }}
            style={styles.backdropImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.backdropGradient}
          />

          {/* Service Info Overlay */}
          <View style={styles.serviceInfoOverlay}>
            <View style={styles.serviceLogoContainer}>
              <Image
                source={{ uri: serviceDetails.image_url }}
                style={styles.serviceLogo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{serviceDetails.service_name}</Text>

              <View style={styles.serviceBadges}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{serviceDetails.whatsub_class.name}</Text>
                </View>

                {serviceDetails.flexipay && (
                  <View style={[styles.badge, styles.flexiPayBadge]}>
                    <Text style={styles.badgeText}>{serviceDetails.flexipay_discount}% OFF</Text>
                  </View>
                )}

                {serviceDetails.playstore_rating > 0 && (
                  <View style={[styles.badge, styles.ratingBadge]}>
                    <Star size={12} color="white" fill="white" />
                    <Text style={styles.badgeText}>{serviceDetails.playstore_rating.toFixed(1)}</Text>
                  </View>
                )}

                {serviceDetails.playstore_number_of_ratings > 0 && (
                  <View style={[styles.badge, styles.usersBadge]}>
                    <Users size={12} color="white" />
                    <Text style={styles.badgeText}>
                      {(serviceDetails.playstore_number_of_ratings / 1000000).toFixed(1)}M
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.serviceActions}>
                {serviceDetails.url && (
                  <TouchableOpacity
                    style={styles.serviceActionButton}
                    onPress={() => openWebsite(serviceDetails.url)}
                  >
                    <ExternalLink size={16} color="white" />
                    <Text style={styles.serviceActionText}>{t('product.website')}</Text>
                  </TouchableOpacity>
                )}

                {serviceDetails.package_name && (
                  <TouchableOpacity
                    style={styles.serviceActionButton}
                    onPress={() => openApp(serviceDetails.package_name ?? '', serviceDetails.url)}
                  >
                    <Smartphone size={16} color="white" />
                    <Text style={styles.serviceActionText}>{t('product.app')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        {serviceDetails.about && (
          <View style={styles.sectionContainer}>
            <View style={[styles.sectionHeader, styles.aboutSectionHeader]}>
              <Info size={20} color="#6366F1" />
              <Text style={styles.sectionTitle}>{t('product.about', {
                service_name: `${serviceDetails.service_name}`
              })}</Text>
            </View>
            <Text style={styles.aboutText}>{serviceDetails.about}</Text>
          </View>
        )}

        {/* Redeem Instructions */}
        {serviceDetails.flexipay_vendor_instructions && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setShowRedeemInstructions(!showRedeemInstructions)}
            >
              <View style={styles.collapsibleHeaderContent}>
                <View style={styles.collapsibleIcon}>
                  <Info size={20} color="#F59E0B" />
                </View>
                <View style={styles.collapsibleTitles}>
                  <Text style={styles.sectionTitle}>{t('product.redeem')}</Text>
                  <Text style={styles.collapsibleSubtitle}>{t('product.redeemSubtitle')}</Text>
                </View>
              </View>

              {showRedeemInstructions ? (
                <ChevronUp size={20} color="#9CA3AF" />
              ) : (
                <ChevronDown size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            {showRedeemInstructions && (
              <View style={styles.collapsibleContent}>
                <Text style={styles.instructionsText}>{serviceDetails.flexipay_vendor_instructions}</Text>

                {serviceDetails.flexipay_vendor_conditions && (
                  <View style={styles.termsContainer}>
                    <Text style={styles.termsTitle}>{t('product.termsAndConditions')}</Text>
                    <Text style={styles.termsText}>{serviceDetails.flexipay_vendor_conditions}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* FlexiPay Input Section */}
        {showFlexiPay ? (
          <View style={styles.sectionContainer}>
            <View style={styles.flexiPayContainer}>
              <View style={styles.flexiPayHeader}>
                <CreditCard size={24} color="#6366F1" />
                <Text style={styles.flexiPayTitle}>Enter Purchase Amount</Text>
              </View>

              <View style={styles.amountInputContainer}>
                <Text style={styles.amountInputLabel}>
                  Amount (₹{serviceDetails.flexipay_min} - ₹{serviceDetails.flexipay_max})
                </Text>
                <View style={[styles.amountInputWrapper,
                isFocused && styles.amountInputWrapperFocused]}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    underlineColorAndroid="transparent"
                    selectionColor="#6366F1"
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={`Enter amount (₹${serviceDetails.flexipay_min} - ₹${serviceDetails.flexipay_max})`}
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                  />
                </View>
                <Text style={styles.amountInputHelper}>
                  Valid range: ₹{serviceDetails.flexipay_min} - ₹{serviceDetails.flexipay_max}
                </Text>
                {customAmount && !isFlexiPayAmountValid() && (
                  <Text style={styles.amountErrorText}>
                    Amount must be between ₹{serviceDetails.flexipay_min} and ₹{serviceDetails.flexipay_max}
                  </Text>
                )}
              </View>

              <View style={styles.quickSelectContainer}>
                <Text style={styles.quickSelectLabel}>Quick Select</Text>
                <View style={styles.quickSelectButtons}>
                  {[
                    serviceDetails.flexipay_min,
                    Math.round((serviceDetails.flexipay_min + serviceDetails.flexipay_max) / 3),
                    Math.round((serviceDetails.flexipay_min + serviceDetails.flexipay_max) / 2),
                    serviceDetails.flexipay_max
                  ].map((amount, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickSelectButton}
                      onPress={() => setCustomAmount(amount.toString())}
                    >
                      <Text style={styles.quickSelectButtonText}>₹{amount}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.flexiPayDetails}>
                <View style={styles.flexiPayDetailRow}>
                  <Text style={styles.flexiPayDetailLabel}>Discount</Text>
                  <Text style={styles.flexiPayDetailValue}>{serviceDetails.flexipay_discount}%</Text>
                </View>

                <View style={styles.flexiPayDetailRow}>
                  <Text style={styles.flexiPayDetailLabel}>Minimum Amount</Text>
                  <Text style={styles.flexiPayDetailValue}>₹{serviceDetails.flexipay_min}</Text>
                </View>

                <View style={styles.flexiPayDetailRow}>
                  <Text style={styles.flexiPayDetailLabel}>Maximum Amount</Text>
                  <Text style={styles.flexiPayDetailValue}>₹{serviceDetails.flexipay_max}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  (!isFlexiPayAmountValid() || addingToCartPlanIds.has('flexipay')) && styles.disabledButton
                ]}
                onPress={() => handleAddToCart()}
                disabled={!isFlexiPayAmountValid() || addingToCartPlanIds.has('flexipay')}
              >
                {addingToCartPlanIds.has('flexipay') ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.purchaseButtonText}>Adding to Cart...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <ShoppingCart size={20} color="white" />
                    <Text style={styles.purchaseButtonText}>{t('product.addToCart')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Products/Plans Section */
          <View style={styles.sectionContainer}>
            {serviceDetails.whatsub_plans.length !== 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>{t('product.availablePlans')}</Text>
                    <Text style={styles.sectionSubtitle}>{t('product.availablePlansSubtitle')}</Text>
                  </View>
                  <View>
                    <Text style={styles.planCount}>
                      {serviceDetails.whatsub_plans.filter(plan => plan.status === 'active').length} {t('product.count')}
                    </Text>
                  </View>
                </View>
                <View style={styles.plansContainer}>
                  {serviceDetails.whatsub_plans.map((plan) => {
                    const isAvailable = plan.status === 'active';
                    const discount = calculateDiscount(plan.price, plan.discounted_price);
                    const cartQuantity = getPlanCartQuantity(plan);
                    const isAddingThisPlan = addingToCartPlanIds.has(plan.id);

                    return (
                      <View
                        key={plan.id}
                        style={[
                          styles.planCard,
                          !isAvailable && styles.disabledPlanCard,
                          selectedPlan?.id === plan.id && styles.selectedPlanCard
                        ]}
                      >
                        {/* Badges */}
                        <View style={styles.planBadges}>
                          {discount > 0 && (
                            <View style={styles.discountBadge}>
                              <Text style={styles.discountBadgeText}>
                                {discount}% {t('common.off')}
                              </Text>
                            </View>
                          )}
                          {cartQuantity > 0 && (
                            <View style={styles.cartBadge}>
                              <Text style={styles.cartBadgeText}>
                                {cartQuantity} {t('product.inCart')}
                              </Text>
                            </View>
                          )}
                        </View>

                        <TouchableOpacity
                          style={styles.planCardContent}
                          onPress={() => isAvailable && setSelectedPlan(plan)}
                          disabled={!isAvailable}
                        >
                          <View style={styles.planHeader}>
                            <Text style={styles.planName}>{plan.plan_name}</Text>
                            <Text style={styles.planDescription}>{plan.display_data}</Text>

                            <View style={styles.planPricing}>
                              <Text style={styles.discountedPrice}>
                                ₹{plan.discounted_price.toFixed(2)}
                              </Text>
                              {plan.price > plan.discounted_price && (
                                <Text style={styles.originalPrice}>
                                  ₹{plan.price.toFixed(2)}
                                </Text>
                              )}
                            </View>

                            {plan.duration && plan.duration_type && (
                              <View style={styles.durationContainer}>
                                <Clock size={14} color="#9CA3AF" />
                                <Text style={styles.durationText}>
                                  {t('explore.duration')}: {plan.duration} {plan.duration_type}
                                </Text>
                              </View>
                            )}

                            <View style={styles.availabilityContainer}>
                              <View style={[
                                styles.availabilityIndicator,
                                isAvailable ? styles.availableIndicator : styles.unavailableIndicator
                              ]} />
                              <Text style={[
                                styles.availabilityText,
                                isAvailable ? styles.availableText : styles.unavailableText
                              ]}>
                                {isAvailable ? t('common.available') : t('common.notAvailable')}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>

                        {isAvailable && (
                          <View style={styles.planActions}>
                            <TouchableOpacity
                              style={[
                                styles.addToCartButton,
                                isAddingThisPlan && styles.loadingButton
                              ]}
                              onPress={() => handleAddToCart(plan)}
                              disabled={isAddingThisPlan}
                            >
                              {isAddingThisPlan ? (
                                <View>
                                  <ActivityIndicator size="small" color="white" />
                                </View>
                              ) : (
                                <View style={styles.buttonContent}>
                                  <ShoppingCart size={16} color="white" />
                                  <Text style={styles.addToCartText}>{t('product.addToCart')}</Text>
                                </View>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.viewDetailsButton}
                              onPress={() => openPlanModal(plan)}
                            >
                              <Text style={styles.viewDetailsText}>{t('product.viewDetails')}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Plan Details Modal */}
      <Modal
        visible={showPlanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalPlan?.plan_name}</Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <X size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Plan Info */}
              <Text style={styles.modalSubtitle}>{modalPlan?.display_data}</Text>

              <View style={styles.modalPriceRow}>
                <Text style={styles.modalDiscountedPrice}>₹{modalPlan?.discounted_price}</Text>
                {modalPlan && modalPlan.price > modalPlan.discounted_price && (
                  <Text style={styles.modalOriginalPrice}>₹{modalPlan.price}</Text>
                )}
              </View>

              {modalPlan?.duration && (
                <View style={styles.modalRow}>
                  <Clock size={16} color="#9CA3AF" />
                  <Text style={styles.modalRowText}>
                    {t('explore.duration')}: {modalPlan.duration} {modalPlan.duration_type}
                  </Text>
                </View>
              )}

              <Text style={styles.modalDescription}>{modalPlan?.plan_details}</Text>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalAddButton, addingToCartPlanIds.has(modalPlan?.id || '') && styles.disabledButton]}
                onPress={() => handleAddToCart(modalPlan!)}
                disabled={addingToCartPlanIds.has(modalPlan?.id || '')}
              >
                {addingToCartPlanIds.has(modalPlan?.id || '') ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <View style={styles.buttonContent}>
                    <ShoppingCart size={18} color="white" />
                    <Text style={styles.modalAddText}>{t('product.addToCart')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


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
  loadingContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    fontWeight: '800',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#6366F1',
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
  heroSection: {
    height: 220,
    position: 'relative',
    marginBottom: 16,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  serviceInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  serviceLogoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 8,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  serviceLogo: {
    width: '100%',
    height: '100%',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  serviceBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  flexiPayBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.8)',
  },
  ratingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.8)',
  },
  usersBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.8)',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  serviceActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  sectionContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    marginHorizontal: 10,
    marginBottom: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  aboutSectionHeader: {
    justifyContent: 'flex-start',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  planCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  aboutText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsibleHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  collapsibleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  collapsibleTitles: {
    flex: 1,
  },
  collapsibleSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  collapsibleContent: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  instructionsText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  termsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.5)',
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  disabledPlanCard: {
    opacity: 0.6,
  },
  selectedPlanCard: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  planBadges: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    flexDirection: 'column',
    gap: 8,
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planCardContent: {
    padding: 16,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  discountedPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  durationText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availableIndicator: {
    backgroundColor: '#10B981',
  },
  unavailableIndicator: {
    backgroundColor: '#EF4444',
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  availableText: {
    color: '#10B981',
  },
  unavailableText: {
    color: '#EF4444',
  },

  planActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)',
    paddingTop: 16,
    gap: 8,
  },
  addToCartButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingButton: {
    opacity: 0.7,
  },
  addToCartText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  viewDetailsButton: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 8,
    paddingVertical: 10,
    margin: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.5)',
  },
  viewDetailsText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyPlansContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPlansText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
  },
  bottomActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  bottomActionButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bottomActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    backgroundColor: '#0E0E0E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  modalCloseButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    fontWeight: '800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPlanHeader: {
    marginBottom: 12,
  },
  modalPlanName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  modalPlanPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  modalPlanDetails: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalPlanFeatures: {
    paddingTop: 6,
  },
  modalFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  modalFeaturesText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  modalAddToCartButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  modalAddToCartText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    fontSize: 22,
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
  backToExploreButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backToExploreText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalDiscountedPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginRight: 10,
  },
  modalOriginalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalRowText: {
    color: 'white',
    marginLeft: 5,
  },
  modalDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginTop: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalAddText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },

  // FlexiPay specific styles
  flexiPayContainer: {
    gap: 16,
  },
  flexiPayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  flexiPayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  amountInputContainer: {
    marginBottom: 4,
  },
  amountInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    paddingHorizontal: 14,
  },
  amountInputWrapperFocused: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  currencySymbol: {
    color: '#9CA3AF',
    fontSize: 16,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  amountInputHelper: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  quickSelectContainer: {
    marginBottom: 16,
  },
  quickSelectLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  quickSelectButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSelectButton: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  quickSelectButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  flexiPayDetails: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  flexiPayDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  flexiPayDetailLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  flexiPayDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  purchaseButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  amountErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
});