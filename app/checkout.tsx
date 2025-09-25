import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CreditCard, Wallet, Tag, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Clock, Users, Shield, Info, X } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRPaymentModal from '@/components/QRPaymentModal';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface WalletBalance {
  unlocked_amount: number;
}

interface Coupon {
  coupon_code: string;
  available: number;
  max_amount: number;
  discount_percentage: number;
  coupon_md: string;
  expiring_at: string;
}

interface GroupDetails {
  id: string;
  name: string;
  room_dp: string;
  price: number;
  share_limit: number;
  number_of_users: number;
  admin_name: string;
  plan_name: string;
  service_name: string;
  service_image_url: string;
  expiring_at: string;
}

export default function CheckoutPage() {
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  
  // Parse params once using useMemo to prevent re-parsing on every render
  const parsedParams = useMemo(() => {
    const groupFromParams = params.group ? JSON.parse(params.group as string) : null;
    const planDetailFromParams = params.planDetail ? JSON.parse(params.planDetail as string) : null;
    const roomId = params.roomId ? (params.roomId as string) : null;
    
    return {
      groupFromParams,
      planDetailFromParams,
      roomId
    };
  }, [params.group, params.planDetail, params.roomId]);
  
  const { groupFromParams, planDetailFromParams, roomId } = parsedParams;
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({ unlocked_amount: 0 });
  const [sharedFee, setSharedFee] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<string>('');
  const [couponInput, setCouponInput] = useState<string>('');
  const [showCoupons, setShowCoupons] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRPaymentModal, setShowQRPaymentModal] = useState(false);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);

  // Use useEffect with proper dependencies - only trigger when roomId changes
  useEffect(() => {
    if (roomId || groupFromParams) {
      fetchWalletBalance();
      fetchCoupons();
      fetchGroupDetails();
      fetchFee();
    }
  }, [roomId]); // Remove groupFromParams from dependency array

  // Set group details immediately when component mounts if we have the data
  useEffect(() => {
    if (groupFromParams && planDetailFromParams) {
      setGroupDetails({
        id: groupFromParams.room_id,
        name: groupFromParams.fullname ? `${groupFromParams.fullname}'s Group` : 'Subscription Group',
        room_dp: groupFromParams.room_dp,
        price: groupFromParams.price,
        share_limit: groupFromParams.share_limit,
        number_of_users: groupFromParams.number_of_users,
        admin_name: groupFromParams.fullname || 'Admin',
        plan_name: planDetailFromParams.plan_name,
        service_name: planDetailFromParams.service_name,
        service_image_url: planDetailFromParams.service_image_url,
        expiring_at: groupFromParams.expiring_at
      });
    }
  }, []); // Empty dependency array since we only want this to run once

  const fetchFee = async () => {
    const fee = await AsyncStorage.getItem(STORAGE_KEYS.sharedFee);
    setSharedFee(fee ? parseFloat(fee)/100 : 0);
  }

  const fetchWalletBalance = async () => {
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();
      
      if (!userId || !authToken) {
        setError('Authentication required');
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
      const balance = data.data?.whatsub_user_wallet_locked_unlocked_internal?.[0];
      if (balance) {
        setWalletBalance(balance);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const fetchCoupons = async () => {
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();
      
      if (!userId || !authToken) {
        setError('Authentication required');
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
              whatsub_coupons(where: {user_id: {_eq: $user_id}, allowed_on_sharing: {_eq: true}, available: {_gte: "1"}}) {
                __typename
                coupon_code
                available
                max_amount
                discount_percentage
                coupon_md
                expiring_at
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

  const fetchGroupDetails = async () => {
    // If we already have group details from params, don't fetch again
    if (groupFromParams && planDetailFromParams) {
      // Group details are already set in the second useEffect
      return;
    }
    
    // Add your API call here if you need to fetch group details from server
    // when not provided in params
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();
      
      if (!userId || !authToken) {
        setError('Authentication required');
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
            mutation MyMutation($user_id: uuid = "", $room_id: uuid = "", $coupon_code: String = "") {
              __typename
              whatsubJoinSubscriptionGroupV2(request: {user_id: $user_id, room_id: $room_id, coupon_code: $coupon_code}) {
                __typename
                affected_rows
                details
              }
            }
          `,
          variables: {
            user_id: userId,
            room_id: roomId,
            coupon_code: selectedCoupon || ''
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        setError(data.errors[0]?.message || t('error.paymentFailed'));
        return;
      }

      const result = data.data?.whatsubJoinSubscriptionGroupV2;
      if (result?.details?.amount_required) {
        // Show payment modal for the required amount
        const requiredAmount = result.details.amount_required / 100;
        setPendingPaymentAmount(requiredAmount);
        // Show QR payment modal instead of regular payment modal
        setPendingPaymentAmount(requiredAmount);
        setShowQRPaymentModal(true);
      } else {
        // Payment successful
        setPaymentSuccess(true);
        
        // Navigate back to home after a delay
        setTimeout(() => {
          router.push('/(tabs)/home');
        }, 2000);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setError(t('error.paymentFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRPaymentSuccess = () => {
    setShowQRPaymentModal(false);
    setPaymentSuccess(true);
    
    // Navigate back to home after a delay
    setTimeout(() => {
      router.push('/(tabs)/home');
    }, 2000);
  };

  const handleQRPaymentError = (errorMessage: string) => {
    setShowQRPaymentModal(false);
    setError(errorMessage);
  };

  const applyCoupon = (couponCode: string) => {
    setSelectedCoupon(couponCode);
    setCouponInput(couponCode);
    setShowCoupons(false);
  };

  const removeCoupon = () => {
    setSelectedCoupon('');
    setCouponInput('');
  };

  const calculateDiscount = () => {
    if (!selectedCoupon || !groupDetails) return 0;
    
    const coupon = coupons.find(c => c.coupon_code === selectedCoupon);
    if (!coupon) return 0;
    
    const itemPrice = Math.ceil(groupDetails.price / groupDetails.share_limit);
    const discount = Math.min((itemPrice * coupon.discount_percentage) / 100, coupon.max_amount);
    return discount;
  };

  const calculateTotal = () => {
    if (!groupDetails) return 0;
    
    const itemPrice = Math.ceil(groupDetails.price / groupDetails.share_limit);
    const fee = sharedFee;
    const discount = calculateDiscount();
    const walletDeduction = Math.min(walletBalance.unlocked_amount / 100, itemPrice + fee - discount);
    
    return Math.max(0, itemPrice + fee - discount - walletDeduction);
  };

  const handlePaymentSuccess = () => {
    // Refresh wallet balance and retry the group join
    fetchWalletBalance().then(() => {
      handlePayment();
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
   return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}></Text>
      </LinearGradient>
    );
  }

  if (!groupDetails) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <AlertCircle size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>{t('checkout.groupNotFound')}</Text>
          <Text style={styles.errorMessage}>{t('checkout.groupNotFoundDesc')}</Text>
          <TouchableOpacity 
            style={styles.goBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.goBackButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (paymentSuccess) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={48} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>{t('wallet.paymentSuccess')}</Text>
          <Text style={styles.successMessage}>{t('checkout.redirectingToGroup')}</Text>
          <ActivityIndicator size="small" color="#6366F1" style={styles.successSpinner} />
        </View>
      </LinearGradient>
    );
  }

  const itemPrice = Math.ceil(groupDetails.price / groupDetails.share_limit);
  const fee = sharedFee;
  const discount = calculateDiscount();
  const walletDeduction = Math.min(walletBalance.unlocked_amount / 100, itemPrice + fee - discount);
  const netPayable = calculateTotal();

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.title}>{t('checkout.title')}</Text>
              <Text style={styles.subtitle}>{t('checkout.subtitle')}</Text>
            </View>
          </View>

          {/* Admin Renewal Notice */}
          <View style={styles.adminNoticeCard}>
            <View style={styles.adminNoticeContent}>
              <Info size={16} color="#10B981" />
              <Text style={styles.adminNoticeText}>
                {t('checkout.adminRenewalNotice1')} {formatDate(groupDetails.expiring_at)}, {t('checkout.adminRenewalNotice2')}
              </Text>
            </View>
          </View>

          {/* Group Details Card */}
          <View style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={styles.serviceLogoContainer}>
                <Image
                  source={{ uri: groupDetails.service_image_url }}
                  style={styles.serviceLogo}
                  resizeMode="contain"
                />
              </View>
              
              <View style={styles.serviceInfo}>
                <Text style={styles.planName}>{groupDetails.plan_name}</Text>
                <Text style={styles.serviceName}>{groupDetails.service_name}</Text>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceAmount}>₹{itemPrice}</Text>
                <Text style={styles.priceLabel}>{t('checkout.perUser')}</Text>
              </View>
            </View>

            <View style={styles.groupDetails}>
              <View style={styles.groupDetailRow}>
                <Text style={styles.groupDetailLabel}>
                  {t('checkout.groupAdmin')} {groupDetails.admin_name}
                </Text>
                <Text style={styles.groupDetailValue}>
                  {groupDetails.number_of_users}/{groupDetails.share_limit} {t('common.users')}
                </Text>
              </View>
              <Text style={styles.nextPaymentText}>
                {t('checkout.nextPayment')} {formatDate(groupDetails.expiring_at)}
              </Text>
            </View>
          </View>

          {/* Billing Details */}
          <View style={styles.billingCard}>
            <View style={styles.billingHeader}>
              <Text style={styles.billingTitle}>{t('checkout.billingDetails')}</Text>
            </View>
            
            <View style={styles.billingContent}>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('checkout.itemPrice')}</Text>
                <Text style={styles.billingValue}>₹{itemPrice}</Text>
              </View>
              
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>{t('checkout.fee')} ({sharedFee}%)</Text>
                <Text style={styles.billingValuePositive}>+ ₹{sharedFee}</Text>
              </View>
              
              {discount > 0 && (
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>{t('cart.couponDiscount')}</Text>
                  <Text style={styles.billingValueNegative}>- ₹{discount}</Text>
                </View>
              )}
              
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>
                  {t('wallet.title')} (₹{(walletBalance.unlocked_amount / 100).toFixed(2)})
                </Text>
                <Text style={styles.billingValueNegative}>- ₹{walletDeduction.toFixed(2)}</Text>
              </View>
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('checkout.netPayable')}</Text>
                <Text style={styles.totalValue}>₹{netPayable.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Coupon Section */}
          <View style={styles.couponCard}>
            <View style={styles.couponHeader}>
              <Tag size={18} color="#6366F1" />
              <Text style={styles.couponTitle}>{t('cart.couponCode')}</Text>
              {coupons.length > 0 && (
                <Text style={styles.couponCount}>
                  ({coupons.length} {t('cart.available')})
                </Text>
              )}
            </View>
            
            <View style={styles.couponInputContainer}>
              <TextInput
                style={styles.couponInput}
                placeholder={t('cart.enterCouponCode')}
                placeholderTextColor="#6B7280"
                value={couponInput}
                onChangeText={setCouponInput}
                onFocus={() => setShowCoupons(true)}
              />
              
              {selectedCoupon ? (
                <TouchableOpacity
                  style={styles.couponButton}
                  onPress={removeCoupon}
                >
                  <Text style={styles.couponButtonTextRemove}>{t('common.remove')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.couponButton}
                  onPress={() => applyCoupon(couponInput)}
                  disabled={!couponInput.trim()}
                >
                  <Text style={[
                    styles.couponButtonText,
                    !couponInput.trim() && styles.couponButtonTextDisabled
                  ]}>
                    {t('common.apply')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Available Coupons */}
            {showCoupons && coupons.length > 0 && (
              <View style={styles.availableCoupons}>
                <Text style={styles.availableCouponsTitle}>
                  {t('cart.availableCoupons')}:
                </Text>
                
                <ScrollView 
                  style={styles.couponsScrollView}
                  nestedScrollEnabled={true}
                >
                  {coupons.map((coupon) => (
                    <TouchableOpacity
                      key={coupon.coupon_code}
                      style={styles.couponItem}
                      onPress={() => applyCoupon(coupon.coupon_code)}
                    >
                      <View style={styles.couponItemContent}>
                        <View style={styles.couponItemInfo}>
                          <Text style={styles.couponCode}>{coupon.coupon_code}</Text>
                          <Text style={styles.couponDiscount}>
                            {coupon.discount_percentage}% {t('common.off')} {t('cart.upTo')} ₹{coupon.max_amount}
                          </Text>
                          <Text style={styles.couponExpiry}>
                            {t('checkout.expires')}: {formatDate(coupon.expiring_at)}
                          </Text>
                        </View>
                        <Text style={styles.couponUseText}>{t('cart.useCode')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorMessageContainer}>
              <AlertCircle size={16} color="#EF4444" />
              <Text style={styles.errorMessageText}>{error}</Text>
            </View>
          )}

          {/* Payment Button */}
          <TouchableOpacity
            style={[
              styles.paymentButton,
              (isProcessing || netPayable <= 0) && styles.paymentButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={isProcessing || netPayable <= 0}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <CreditCard size={18} color="white" />
                <Text style={styles.paymentButtonText}>
                  {t('checkout.pay')} ₹{netPayable.toFixed(2)} {t('checkout.andJoin')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Security Notice
          <View style={styles.securityNotice}>
            <Shield size={14} color="#9CA3AF" />
            <Text style={styles.securityNoticeText}>
              {t('checkout.securityNotice')}
            </Text>
          </View> */}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Payment Modal */}
      {showPaymentModal && (
        <Modal
          visible={showPaymentModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('checkout.addMoneyTitle')}</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <X size={20} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <Text style={styles.modalDescription}>
                  {t('checkout.addMoneyDescription')}
                </Text>
                
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>{t('wallet.enterAmount')}</Text>
                  <View style={styles.amountDisplay}>
                    <Text style={styles.amountValue}>₹{pendingPaymentAmount.toFixed(2)}</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.addMoneyButton}
                  onPress={handlePaymentSuccess}
                >
                  <Wallet size={18} color="white" />
                  <Text style={styles.addMoneyButtonText}>{t('wallet.addMoney')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      
      {/* QR Payment Modal */}
      <QRPaymentModal
        isOpen={showQRPaymentModal}
        onClose={() => setShowQRPaymentModal(false)}
        amount={pendingPaymentAmount}
        onSuccess={handleQRPaymentSuccess}
        onError={handleQRPaymentError}
        title={t('checkout.payWithUPI') || "Pay with UPI"}
        description={t('checkout.scanQRToComplete') || "Scan this QR code with any UPI app to complete your payment"}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 30,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  goBackButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
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
  adminNoticeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 16,
    padding: 12,
  },
  adminNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminNoticeText: {
    flex: 1,
    color: '#10B981',
    fontSize: 14,
    lineHeight: 20,
  },
  groupCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    marginBottom: 16,
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  serviceLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'white',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceLogo: {
    width: '100%',
    height: '100%',
  },
  serviceInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00E400',
  },
  priceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  groupDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)',
    paddingTop: 16,
  },
  groupDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  groupDetailLabel: {
    fontSize: 14,
    color: '#fefeffff',
  },
  groupDetailValue: {
    fontSize: 14,
    color: '#fefeffff',
  },
  nextPaymentText: {
    fontSize: 14,
    color: '#fefeffff',
  },
  billingCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  billingHeader: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
  },
  billingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  billingContent: {
    padding: 16,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billingLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  billingValue: {
    fontSize: 14,
    color: 'white',
  },
  billingValuePositive: {
    fontSize: 14,
    color: '#10B981',
  },
  billingValueNegative: {
    fontSize: 14,
    color: '#EF4444',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  couponCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    marginBottom: 16,
    padding: 16,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  couponTitle: {
    fontSize: 16,
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
    fontSize: 14,
    paddingVertical: 12,
  },
  couponButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  couponCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  couponDiscount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  couponExpiry: {
    fontSize: 10,
    color: '#6B7280',
  },
  couponUseText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '600',
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 16,
    padding: 12,
    gap: 8,
  },
  errorMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 16,
    paddingVertical: 16,
    gap: 8,
  },
  paymentButtonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
    textAlign: 'center',
  },
  amountContainer: {
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  amountDisplay: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  addMoneyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});