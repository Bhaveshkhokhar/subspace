import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  Smartphone, 
  Clock, 
  Zap, 
  Star, 
  CircleCheck as CheckCircle, 
  CircleAlert as AlertCircle, 
  Wifi, 
  Phone 
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import QRPaymentModal from '@/components/QRPaymentModal';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface Plan {
  id: string;
  talktime: number;
  validity: string;
  price: number;
  desc: string;
  type: string;
  plan_name: string;
  dataBenefit: string;
}

interface PlanMapping {
  whatsub_bbps_plan: Plan;
}

export default function RechargePlansPage() {
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  // Get parameters from URL
  const operatorId = params.operatorId as string;
  const circleId = params.circleId as string;
  const phoneNumber = params.phoneNumber as string;
  const operatorName = params.operatorName as string;
  
  // State
  const [plans, setPlans] = useState<Plan[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (operatorId && circleId) {
      fetchPlans();
    }
  }, [operatorId, circleId]);

  const fetchPlans = async () => {
    if (!operatorId || !circleId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) {
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
            query GetPlans($operator_id: uuid, $circle_id: uuid) {
              __typename
              whatsub_bbps_operator_circle_plan_mapping(where: {operator_id: {_eq: $operator_id}, circle_id: {_eq: $circle_id}, active: {_eq: true}}) {
                __typename
                whatsub_bbps_plan {
                  __typename
                  id
                  talktime
                  validity
                  price
                  desc
                  type
                  plan_name
                  dataBenefit
                }
              }
            }
          `,
          variables: {
            operator_id: operatorId,
            circle_id: circleId
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        setError('Failed to fetch plans');
        return;
      }

      const planMappings: PlanMapping[] = data.data?.whatsub_bbps_operator_circle_plan_mapping || [];
      const fetchedPlans = planMappings.map((mapping: PlanMapping) => mapping.whatsub_bbps_plan);
      setPlans(fetchedPlans);
      
      // Extract unique types from plans and set available tabs
      const types = [...new Set(fetchedPlans.map((plan: Plan) => plan.type).filter(Boolean))];
      setAvailableTypes(types);
      
      // Set the first available type as active tab
      if (types.length > 0 && !activeTab) {
        setActiveTab(types[0]);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Failed to fetch plans');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchPlans();
    setIsRefreshing(false);
  };

  const handleRecharge = async () => {
    if (!selectedPlan || !operatorId || !circleId || !phoneNumber) {
      setError('Please select a plan');
      return;
    }
    
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
            mutation createBBPSRequest($user_id: uuid!, $operator: String!, $canumber: String!, $amount: String, $plan_id: uuid, $operator_id: uuid, $circle_id: uuid, $service: String!) {
              __typename
              createBBPSRequest(request: {user_id: $user_id, operator: $operator, canumber: $canumber, amountStr: $amount, plan_id: $plan_id, operator_id: $operator_id, circle_id: $circle_id, service: $service}) {
                __typename
                affected_rows
                details
              }
            }
          `,
          variables: {
            user_id: userId,
            operator: operatorName,
            canumber: phoneNumber,
            amount: selectedPlan.price.toString(),
            plan_id: selectedPlan.id,
            operator_id: operatorId,
            circle_id: circleId,
            service: "PREPAID"
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        setError(data.errors[0]?.message || 'Payment failed');
        return;
      }

      const result = data.data?.createBBPSRequest;
      if (result?.details?.amount_required) {
        const requiredAmount = result.details.amount_required / 100;
        setPendingPaymentAmount(requiredAmount);
        setShowPaymentModal(true);
      } else {
        showError(t('error.paymentFailed') || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      showError('Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
    setIsProcessing(false);
    setPendingPaymentAmount(0);
    setError(null);
    router.push('/mobile-recharge');
  };

  const handlePaymentError = (errorMessage: string) => {
    setShowPaymentModal(false);
    setError(`Payment failed: ${errorMessage}`);
  };

  const filterPlansByTab = (plans: Plan[]) => {
    if (!activeTab) return plans;
    return plans.filter(plan => plan.type === activeTab);
  };

  const filteredPlans = filterPlansByTab(plans);

  const getPlanIcon = (plan: Plan) => {
    if (plan.dataBenefit && plan.dataBenefit !== '0' && plan.dataBenefit !== 'NA') {
      return <Wifi size={20} color="#3B82F6" />;
    }
    return <Phone size={20} color="#10B981" />;
  };

  const formatValidity = (validity: string) => {
    if (!validity) return 'N/A';
    return validity.replace(/days?/i, 'days').replace(/months?/i, 'months');
  };

  const formatDataBenefit = (dataBenefit: string) => {
    if (!dataBenefit || dataBenefit === '0' || dataBenefit === 'NA') return null;
    return dataBenefit;
  };

  const formatTabName = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/mobile-recharge');
    }
  };

  if (isLoading && plans.length === 0) {
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
            <Text style={styles.title}>{operatorName || 'Mobile Plans'}</Text>
            {phoneNumber && (
              <Text style={styles.phoneNumber}>{phoneNumber}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      {availableTypes.length > 0 && (
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {availableTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.tab,
                  activeTab === type && styles.activeTab
                ]}
                onPress={() => setActiveTab(type)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === type && styles.activeTabText
                  ]}
                >
                  {formatTabName(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Smartphone size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>{t('mobile.noPlansAvailableTitle') || 'No Plans Available'}</Text>
            <Text style={styles.emptySubtitle}>{t('mobile.noPlansAvailable') || 'There are no plans available for this operator and circle.'}</Text>
          </View>
        ) : filteredPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <Smartphone size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>{t('mobile.noPlansAvailableTitle') || 'No Plans Available'}</Text>
            <Text style={styles.emptySubtitle}>{t('mobile.noPlanForCategory') || 'No plans available for category'} {formatTabName(activeTab)}</Text>
          </View>
        ) : (
          <View style={styles.plansList}>
            {filteredPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan?.id === plan.id && styles.selectedPlanCard
                ]}
                onPress={() => setSelectedPlan(plan)}
                activeOpacity={0.8}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planIconContainer}>
                    {getPlanIcon(plan)}
                  </View>
                  <View style={styles.planPrice}>
                    <Text style={styles.priceAmount}>₹{plan.price}</Text>
                  </View>
                  {plan.validity && (
                    <View style={styles.validityBadge}>
                      <Text style={styles.validityText}>
                        {formatValidity(plan.validity)}
                      </Text>
                    </View>
                  )}
                  {plan.type && (
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>
                        {formatTabName(plan.type)}
                      </Text>
                    </View>
                  )}
                  {selectedPlan?.id === plan.id && (
                    <View style={styles.checkmarkContainer}>
                      <CheckCircle size={20} color="#6366F1" />
                    </View>
                  )}
                </View>
                
                <View style={styles.planContent}>
                  <Text style={styles.planName}>
                    {plan.plan_name || 'Plan Details'}
                  </Text>
                  
                  {plan.desc && (
                    <Text style={styles.planDescription}>{plan.desc}</Text>
                  )}
                  
                  <View style={styles.planFeatures}>
                    {formatDataBenefit(plan.dataBenefit) && (
                      <View style={styles.featureItem}>
                        <Wifi size={14} color="#9CA3AF" />
                        <Text style={styles.featureText}>
                          {t('mobile.data') || 'Data'}: {formatDataBenefit(plan.dataBenefit)}
                        </Text>
                      </View>
                    )}
                    {plan.talktime > 0 && (
                      <View style={styles.featureItem}>
                        <Phone size={14} color="#9CA3AF" />
                        <Text style={styles.featureText}>
                          {t('mobile.talktime') || 'Talktime'}: ₹{plan.talktime}
                        </Text>
                      </View>
                    )}
                    {plan.validity && (
                      <View style={styles.featureItem}>
                        <Clock size={14} color="#9CA3AF" />
                        <Text style={styles.featureText}>
                          {formatValidity(plan.validity)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Button */}
      {selectedPlan && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.rechargeButton,
              isProcessing && styles.rechargeButtonDisabled
            ]}
            onPress={handleRecharge}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.rechargeButtonText}>{t('common.processing') || 'Processing...'}</Text>
              </>
            ) : (
              <>
                <Zap size={18} color="white" />
                <Text style={styles.rechargeButtonText}>
                  {t('mobile.recharge') || 'Recharge'} ₹{selectedPlan.price}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Modal */}
      <QRPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={pendingPaymentAmount}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        title={t('mobile.completePayment') || 'Complete Payment'}
        description={t('mobile.rechargeMobileFor', {
          phoneNumber: `${phoneNumber}`,
          amount: `${selectedPlan?.price}`
        })}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  phoneNumber: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabs: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  plansList: {
    gap: 12,
  },
  planCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  selectedPlanCard: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
    position: 'relative',
  },
  planIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planPrice: {
    flex: 1,
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  validityBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginRight: 8,
  },
  validityText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  typeBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  typeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  planContent: {
    padding: 16,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 20,
  },
  planFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
    paddingBottom: 32,
  },
  rechargeButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rechargeButtonDisabled: {
    opacity: 0.6,
  },
  rechargeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});