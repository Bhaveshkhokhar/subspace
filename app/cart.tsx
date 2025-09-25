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
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Trash,
  Tag,
  ArrowRight,
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle,
  X
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import QRPaymentModal from '@/components/QRPaymentModal';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';

const { width } = Dimensions.get('window');

interface CartItem {
  discounted_price: number;
  id: string;
  image_url: string;
  plan_id: string;
  plan_name: string;
  price: number;
  quantity: number;
  service_id: string | null;
  service_name: string;
  type: string;
}

interface CartData {
  id: string;
  items: CartItem[];
  message: string | null;
}

interface Coupon {
  coupon_code: string;
  available: number;
  max_amount: number;
  discount_percentage: number;
  coupon_md: string;
  expiring_at: string;
  product_id: string;
}

export default function CartPage() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [unlockedAmount, setUnlockedAmount] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState<string>('');
  const [showCoupons, setShowCoupons] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Error and success states
  const [error, setError] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);

  useEffect(() => {
    fetchCart();
    fetchCoupons();
  }, []);

  const fetchCart = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        setError('Please login to view cart');
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
            query MyQuery($user_id: uuid = "") {
              __typename
              whatsubGetCart(request: {user_id: $user_id}) {
                __typename
                id
                items
                message
              }
              whatsub_user_wallet_locked_unlocked_internal(where: {user_id: {_eq: $user_id}}) {
                __typename
                unlocked_amount
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
        setError('Failed to load cart');
        return;
      }

      setCartData(data.data?.whatsubGetCart);
      setUnlockedAmount(data.data?.whatsub_user_wallet_locked_unlocked_internal[0]?.unlocked_amount || 0);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError('Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoupons = async () => {
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
            query GetCoupons($user_id: uuid = "") {
              __typename
              whatsub_coupons(where: {user_id: {_eq: $user_id}, allowed_on_brands: {_eq: true}, available: {_gte: "1"}}) {
                __typename
                coupon_code
                available
                max_amount
                discount_percentage
                coupon_md
                expiring_at
                product_id
              }
            }
          `,
          variables: {
            user_id: userId
          }
        })
      });

      const data = await response.json();
      setCoupons(data.data?.whatsub_coupons || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  };

  const handleQuantityChange = async (item: CartItem, increase: boolean) => {
    const userId = await storage.getUserId();
    const authToken = await storage.getAuthToken();

    if (!userId || !authToken) return;

    setUpdatingItems(prev => new Set(prev).add(item.id));

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: increase ? `
            mutation AddItemToCartMutation($plan_id: uuid = "", $user_id: uuid = "") {
              __typename
              whatsubAddItemToCart(request: {user_id: $user_id, plan_id: $plan_id}) {
                __typename
                affected_rows
              }
            }
          ` : `
            mutation RemoveItemFromCartMutation($item_id: uuid = "", $user_id: uuid = "") {
              __typename
              whatsubRemoveFromCart(request: {id: $item_id, user_id: $user_id}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: increase ? {
            plan_id: item.plan_id,
            user_id: userId
          } : {
            item_id: item.id,
            user_id: userId
          }
        })
      });

      const data = await response.json();
      if (data.data?.whatsubAddItemToCart?.affected_rows > 0 ||
        data.data?.whatsubRemoveFromCart?.affected_rows > 0) {
        await fetchCart();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      showError('Failed to update item quantity');
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleApplyCoupon = async () => {
    const userId = await storage.getUserId();
    const authToken = await storage.getAuthToken();

    if (!userId || !authToken || !couponCode.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($user_id: uuid = "", $coupon_code: String = "", $type: String = "brand") {
              __typename
              wAddCoupon(request: {coupon_code: $coupon_code, user_id: $user_id, type: $type}) {
                __typename
                id
                coupon_code
                max_amount
                discount_percentage
                coupon_md
                product_id
              }
            }
          `,
          variables: {
            user_id: userId,
            coupon_code: couponCode.trim(),
            type: "brand"
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        setCouponError(data.errors[0]?.message || 'Invalid coupon code');
      } else if (data.data?.wAddCoupon) {
        await fetchCart();
        setCouponCode('');
        setSelectedCoupon(couponCode.trim());
        showSuccess('Coupon applied successfully');
      } else {
        setCouponError('Invalid coupon code');
      }
    } catch (error) {
      setCouponError('Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const applyCoupon = (coupon: Coupon) => {
    setCouponCode(coupon.coupon_code);
    setSelectedCoupon(coupon.coupon_code);
    setShowCoupons(false);
  };

  const removeCoupon = () => {
    setSelectedCoupon('');
    setCouponCode('');
  };

  const handlePayment = async () => {
    const userId = await storage.getUserId();
    const authToken = await storage.getAuthToken();

    if (!userId || !authToken) {
      router.replace('/auth');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($order_id: uuid = "", $user_id: uuid = "", $coupon_code: String = "") {
              __typename
              whatsubPurchaseCart(request: {order_id: $order_id, user_id: $user_id, coupon_code: $coupon_code}) {
                __typename
                affected_rows
                details
              }
            }
          `,
          variables: {
            user_id: userId,
            order_id: cartData?.id,
            coupon_code: selectedCoupon || ''
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0]?.message || 'Payment failed');
        return;
      }

      const result = data.data?.whatsubPurchaseCart;
      if (result?.details?.amount_required) {
        const requiredAmount = result.details.amount_required / 100;
        setPendingPaymentAmount(requiredAmount);
        setShowPaymentModal(true);
      } else {
        setError('Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setError('Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setCheckoutSuccess(true);

    setTimeout(() => {
      router.replace('/(tabs)/home');
    }, 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setShowPaymentModal(false);
    setError(`Payment failed: ${errorMessage}`);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchCart(), fetchCoupons()]);
    setIsRefreshing(false);
  };

  const subtotal = cartData?.items?.reduce((total, item) => total + (item.discounted_price * item.quantity), 0) || 0;
  const walletDeduction = Math.min(unlockedAmount / 100, subtotal);
  const total = Math.max(0, subtotal - walletDeduction);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/explore');
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Success Screen
  if (checkoutSuccess) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={48} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Order Successful!</Text>
          <Text style={styles.successMessage}>Your order has been processed successfully</Text>
          <ActivityIndicator size="small" color="#10B981" style={styles.successSpinner} />
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
          <ArrowLeft size={16} color="white" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.title}>Your Cart</Text>
          {cartData?.items && cartData.items.length > 0 && (
            <Text style={styles.subtitle}>
              {cartData.items.length} {cartData.items.length === 1 ? 'item' : 'items'}
            </Text>
          )}
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Loading cart...</Text>
          </View>
        ) : !cartData?.items || cartData.items.length === 0 ? (
          /* Empty Cart */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <ShoppingBag size={48} color="#6366F1" />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>
              Add some products to get started
            </Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Cart Items */}
            <View style={styles.itemsContainer}>
              {cartData.items.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.itemImageContainer}>
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.itemImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.service_name}
                    </Text>
                    <Text style={styles.itemPlan} numberOfLines={1}>
                      {item.plan_name}
                    </Text>

                    <View style={styles.itemPricing}>
                      <Text style={styles.itemPrice}>
                        ₹{item.discounted_price.toFixed(2)}
                      </Text>
                      {item.discounted_price < item.price && (
                        <Text style={styles.itemOriginalPrice}>
                          ₹{item.price.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.itemActions}>
                    <View style={styles.quantityContainer}>
                      {(item.type === 'flexi_coupon') ? (
                        <>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleQuantityChange(item, false)}
                            disabled={updatingItems.has(item.id)}
                          >
                            <Trash size={16} color={"white"} />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleQuantityChange(item, false)}
                            disabled={updatingItems.has(item.id)}
                          >
                            <Minus size={16} color={"white"} />
                          </TouchableOpacity>

                          <View style={styles.quantityDisplay}>
                            {updatingItems.has(item.id) ? (
                              <ActivityIndicator size="small" color="#6366F1" />
                            ) : (
                              <Text style={styles.quantityText}>{item.quantity}</Text>
                            )}
                          </View>

                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleQuantityChange(item, true)}
                            disabled={updatingItems.has(item.id)}
                          >
                            <Plus size={16} color="white" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                    <Text style={styles.itemTotal}>
                      ₹{(item.discounted_price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Coupon Section */}
            <View style={styles.couponCard}>
              <View style={styles.couponHeader}>
                <Tag size={18} color="#6366F1" />
                <Text style={styles.couponTitle}>Apply Coupon</Text>
                {coupons.length > 0 && (
                  <Text style={styles.couponCount}>
                    ({coupons.length} available)
                  </Text>
                )}
              </View>

              <View style={styles.couponInputContainer}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter coupon code"
                  placeholderTextColor="#6B7280"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  onFocus={() => setShowCoupons(true)}
                />

                {selectedCoupon ? (
                  <TouchableOpacity
                    style={styles.couponButton}
                    onPress={removeCoupon}
                  >
                    <Text style={styles.couponButtonTextRemove}>Remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.couponButton}
                    onPress={handleApplyCoupon}
                    disabled={!couponCode.trim() || isApplyingCoupon}
                  >
                    {isApplyingCoupon ? (
                      <View>
                        <ActivityIndicator size="small" color="white" />
                      </View>
                    ) : (
                      <Text style={[
                        styles.couponButtonText,
                        !couponCode.trim() && styles.couponButtonTextDisabled
                      ]}>
                        Apply
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {couponError && (
                <View style={styles.couponErrorContainer}>
                  <AlertCircle size={14} color="#EF4444" />
                  <Text style={styles.couponErrorText}>{couponError}</Text>
                </View>
              )}

              {/* Available Coupons */}
              {showCoupons && coupons.length > 0 && (
                <View style={styles.availableCoupons}>
                  <Text style={styles.availableCouponsTitle}>
                    Available Coupons:
                  </Text>

                  <ScrollView
                    style={styles.couponsScrollView}
                    nestedScrollEnabled={true}
                  >
                    {coupons.map((coupon) => (
                      <TouchableOpacity
                        key={coupon.coupon_code}
                        style={styles.couponItem}
                        onPress={() => applyCoupon(coupon)}
                      >
                        <View style={styles.couponItemContent}>
                          <View style={styles.couponItemInfo}>
                            <Text style={styles.couponItemCode}>{coupon.coupon_code}</Text>
                            <Text style={styles.couponItemDiscount}>
                              {coupon.discount_percentage}% off up to ₹{coupon.max_amount}
                            </Text>
                            <Text style={styles.couponItemExpiry}>
                              Expires: {formatDate(coupon.expiring_at)}
                            </Text>
                          </View>
                          <Text style={styles.couponUseText}>Use Code</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Order Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Wallet Balance (₹{(unlockedAmount / 100).toFixed(2)})
                </Text>
                <Text style={styles.summaryValueNegative}>
                  - ₹{walletDeduction.toFixed(2)}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>₹{total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Checkout Button */}
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                (isProcessing || !cartData?.items?.length) && styles.checkoutButtonDisabled
              ]}
              onPress={handlePayment}
              disabled={isProcessing || !cartData?.items?.length}
            >
              {isProcessing ? (
                <View style={styles.checkoutButtonContent}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.checkoutButtonText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.checkoutButtonContent}>
                  <Text style={styles.checkoutButtonText}>
                    Proceed to Pay ₹{total.toFixed(2)}
                  </Text>
                  <ArrowRight size={18} color="white" />
                </View>
              )}
            </TouchableOpacity>

            {/* Continue Shopping */}
            <TouchableOpacity
              style={styles.continueShoppingButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* QR Payment Modal */}

      <QRPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={pendingPaymentAmount}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        title="Complete Payment"
        description="Add money to complete your purchase"
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
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 20,
    gap: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    fontWeight: '800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  shopButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  itemsContainer: {
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 8,
  },
  cartItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  itemPlan: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  itemPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  itemOriginalPrice: {
    fontSize: 12,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(75, 85, 99, 0.5)',
  },
  quantityDisplay: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  couponCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 12,
    padding: 12,
    marginBottom: 20,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  couponTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  couponCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  couponInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    paddingLeft: 16,
    overflow: 'hidden',
  },
  couponInput: {
    flex: 1,
    color: 'white',
    fontSize: 12,
    paddingVertical: 12,
  },
  couponButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  couponButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  couponButtonTextDisabled: {
    color: '#4B5563',
  },
  couponButtonTextRemove: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  couponErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  couponErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
  },
  availableCoupons: {
    marginTop: 16,
  },
  availableCouponsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  couponsScrollView: {
    maxHeight: 200,
  },
  couponItem: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    marginBottom: 8,
    padding: 12,
  },
  couponItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  couponItemInfo: {
    flex: 1,
  },
  couponItemCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  couponItemDiscount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  couponItemExpiry: {
    fontSize: 10,
    color: '#6B7280',
  },
  couponUseText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 12,
    padding: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  summaryValue: {
    fontSize: 14,
    color: 'white',
  },
  summaryValueNegative: {
    fontSize: 14,
    color: '#EF4444',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 16,
    gap: 8,
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  continueShoppingButton: {
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 12,
  },
  continueShoppingText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  successSpinner: {
    marginTop: 16,
  },
  checkoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
