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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Zap,
  Search,
  Clock,
  ChevronDown,
  Star,
  Info,
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle,
  Lightbulb
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import QRPaymentModal from '@/components/QRPaymentModal';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface Operator {
  id: string;
  name: string;
  code: string;
  image: string;
  is_flexipay: boolean;
  flexipay_min: number;
  input_length: number;
  discount_percentage: number;
  discount_fixed: number;
  fee_percentage: number;
  fee_fixed: number;
}

interface RechargeHistory {
  canumber: string;
  operator: string;
  amount: number;
  created_at: string;
  plan_id: string;
  whatsub_bbps_circle: {
    id: string;
    name: string;
  } | null;
  whatsub_bbps_plan: {
    validity: string;
    dataBenefit: string;
    talktime: number;
    active: boolean;
  } | null;
  whatsub_bbps_operator: {
    id: string;
    name: string;
    image: string;
    input_length: number;
    is_flexipay: boolean;
  };
}

export default function ElectricityRechargePage() {
  // Form state
  const [consumerNumber, setConsumerNumber] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [customAmount, setCustomAmount] = useState('');

  // Data state
  const [operators, setOperators] = useState<Operator[]>([]);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);


  // UI state
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [isLoadingOperators, setIsLoadingOperators] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [operatorSearchQuery, setOperatorSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchOperators();
    fetchRechargeHistory();
  }, []);

  const fetchOperators = async () => {
    setIsLoadingOperators(true);
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
            query getOperators($service: String) {
              __typename
              whatsub_bbps_operators(where: {active: {_eq: true}, service: {_eq: $service}}) {
                __typename
                id
                name
                code
                image
                is_flexipay
                flexipay_min
                input_length
                discount_percentage
                discount_fixed
                fee_percentage
                fee_fixed
              }
            }
          `,
          variables: {
            service: "ELECTRICITY"
          }
        })
      });

      const data = await response.json();
      setOperators(data.data?.whatsub_bbps_operators || []);
    } catch (error) {
      console.error('Error fetching operators:', error);
    } finally {
      setIsLoadingOperators(false);
    }
  };

  const fetchRechargeHistory = async () => {
    setIsLoadingHistory(true);
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
            query RechargeHistory($user_id: uuid!, $limit: Int!, $service: String!) {
              __typename
              whatsub_bbps(where: {user_id: {_eq: $user_id}, status: {_eq: "Done"}, service: {_eq: $service}}, limit: $limit, order_by: {created_at: desc}) {
                __typename
                canumber
                operator
                amount
                created_at
                plan_id
                whatsub_bbps_circle {
                  __typename
                  id
                  name
                }
                whatsub_bbps_plan {
                  __typename
                  validity
                  dataBenefit
                  talktime
                  active
                }
                whatsub_bbps_operator {
                  __typename
                  id
                  name
                  image
                  input_length
                  is_flexipay
                }
              }
            }
          `,
          variables: {
            user_id: userId,
            limit: 10,
            service: "ELECTRICITY"
          }
        })
      });

      const data = await response.json();
      setRechargeHistory(data.data?.whatsub_bbps || []);
    } catch (error) {
      console.error('Error fetching recharge history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handlePayment = async () => {
    const amount = parseFloat(customAmount);

    if (!consumerNumber || !selectedOperator || !customAmount) {
      setError('Please fill all required fields');
      return;
    }

    setIsProcessing(true);
    setError(null);

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
            operator: getSelectedOperatorData()?.code,
            canumber: consumerNumber,
            amount: amount.toString(),
            plan_id: null,
            operator_id: selectedOperator,
            circle_id: null,
            service: "ELECTRICITY"
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
        // Show payment modal for the required amount
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
    fetchRechargeHistory();
    setCustomAmount('');
    setConsumerNumber('');
    setSelectedOperator('');
    setError(null);
  };

  const handleHistoryItemClick = (item: RechargeHistory) => {
    setConsumerNumber(item.canumber);
    setSelectedOperator(item.whatsub_bbps_operator.id);
  };

  const getSelectedOperatorData = () => {
    return operators.find(op => op.id === selectedOperator);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchOperators(), fetchRechargeHistory()]);
    setIsRefreshing(false);
  };

  const getFilteredOperators = () => {
    if (!operatorSearchQuery.trim()) {
      return operators;
    }

    return operators.filter(operator =>
      operator.name.toLowerCase().includes(operatorSearchQuery.toLowerCase()) ||
      operator.code.toLowerCase().includes(operatorSearchQuery.toLowerCase())
    );
  };

  const isFormValid = () => {
    const amount = parseFloat(customAmount);
    return consumerNumber.length >= 6 && selectedOperator && amount > 0;
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/quickPaymentsPage');
    }
  };

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E']}
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
          <View style={styles.titleContainer}>
            <Zap size={24} color="#EAB308" />
            <Text style={styles.title}>Electricity Bill</Text>
          </View>
          <Text style={styles.subtitle}>
            Pay your electricity bill with instant confirmation
          </Text>
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


        {/* Main Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Bill Payment Details</Text>

          {/* Consumer Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Consumer Number</Text>
            <View style={styles.inputContainer}>
              <Lightbulb size={18} color="#9CA3AF" />
              <TextInput
                style={styles.textInput}
                value={consumerNumber}
                onChangeText={setConsumerNumber}
                placeholder="Enter consumer number"
                placeholderTextColor="#6B7280"
              />
            </View>
            <Text style={styles.helperText}>
              Find this on your electricity bill
            </Text>
          </View>

          {/* Operator Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Select Electricity Board</Text>
            <TouchableOpacity
              style={styles.selectorContainer}
              onPress={() => setShowOperatorModal(true)}
              disabled={isLoadingOperators}
            >
              {selectedOperator ? (
                <View style={styles.selectedOption}>
                  <Image
                    source={{ uri: getSelectedOperatorData()?.image }}
                    style={styles.operatorImage}
                    resizeMode="contain"
                  />
                  <View style={styles.selectedOptionText}>
                    <Text style={styles.selectedOptionName}>
                      {getSelectedOperatorData()?.name}
                    </Text>
                    {(getSelectedOperatorData()?.discount_percentage ?? 0) > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                          {getSelectedOperatorData()?.discount_percentage}% OFF
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>
                  {isLoadingOperators ? 'Loading boards...' : 'Choose electricity board'}
                </Text>
              )}
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Enter Amount</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.textInput}
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="Enter bill amount"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Popular Amounts */}
          <View style={styles.quickAmountsSection}>
            <Text style={styles.quickAmountsLabel}>Quick Select</Text>
            <View style={styles.quickAmountsGrid}>
              {[500, 1000, 2000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setCustomAmount(amount.toString())}
                >
                  <Text style={styles.quickAmountText}>₹{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pay Bill Button */}
          <TouchableOpacity
            style={[
              styles.payButton,
              isFormValid() && !isProcessing ? styles.payButtonEnabled : styles.payButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={!isFormValid() || isProcessing}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#000000" />
                <Text style={styles.payButtonText}>Processing...</Text>
              </>
            ) : (
              <>
                <Zap size={18} color="#000000" />
                <Text style={styles.payButtonText}>
                  Pay Bill {customAmount && `₹${customAmount}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Payment History */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Clock size={20} color="#EAB308" />
            <Text style={styles.historyTitle}>Recent Payments</Text>
          </View>

          {isLoadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : rechargeHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Zap size={32} color="#6B7280" />
              <Text style={styles.emptyHistoryText}>No payment history</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {rechargeHistory.slice(0, 5).map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.historyItem}
                  onPress={() => handleHistoryItemClick(item)}
                >
                  <View style={styles.historyItemLeft}>
                    <Image
                      source={{ uri: item.whatsub_bbps_operator.image }}
                      style={styles.historyOperatorImage}
                      resizeMode="contain"
                    />
                    <View style={styles.historyItemInfo}>
                      <Text style={styles.historyConsumerNumber}>{item.canumber}</Text>
                      <Text style={styles.historyOperatorName}>
                        {item.whatsub_bbps_operator.name}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyItemRight}>
                    <Text style={styles.historyAmount}>₹{item.amount}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Operator Selection Modal */}
        <Modal
          visible={showOperatorModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowOperatorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Electricity Board</Text>
                <TouchableOpacity onPress={() => setShowOperatorModal(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <View style={styles.searchContainer}>
                <Search size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search electricity board..."
                  placeholderTextColor="#6B7280"
                  value={operatorSearchQuery}
                  onChangeText={setOperatorSearchQuery}
                />
              </View>

              {/* Operators List */}
              <ScrollView style={{ maxHeight: 400 }}>
                {getFilteredOperators().map((operator) => (
                  <TouchableOpacity
                    key={operator.id}
                    style={styles.operatorItem}
                    onPress={() => {
                      setSelectedOperator(operator.id);
                      setShowOperatorModal(false);
                    }}
                  >
                    <Image source={{ uri: operator.image }} style={styles.operatorItemImage} />
                    <Text style={styles.operatorItemText}>{operator.name}</Text>
                    {selectedOperator === operator.id && (
                      <CheckCircle size={18} color="#EAB308" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>


        {/* Payment Modal */}
        <QRPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={pendingPaymentAmount}
          onSuccess={handlePaymentSuccess}
          onError={(error) => setError(error)}
          title={t('electricity.completePayment')}
          description={t('electricity.payBillFor', {
            consumerNumber,
            amount: pendingPaymentAmount,
          })}
        />

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 20,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    fontWeight: '800',
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
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  currencySymbol: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  operatorImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  selectedOptionText: {
    flex: 1,
  },
  selectedOptionName: {
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
  },
  discountBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 10,
    color: '#EAB308',
    fontWeight: '600',
  },
  selectorPlaceholder: {
    color: '#6B7280',
    fontSize: 16,
    flex: 1,
  },
  quickAmountsSection: {
    marginBottom: 20,
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E5E7EB',
    marginBottom: 12,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EAB308',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  payButtonEnabled: {
    backgroundColor: '#EAB308',
  },
  payButtonDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  historyCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    padding: 20,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    padding: 12,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  historyOperatorImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyConsumerNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  historyOperatorName: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  featuresList: {
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeText: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55,65,81,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    marginLeft: 8,
  },
  operatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  operatorItemImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 12,
  },
  operatorItemText: {
    flex: 1,
    fontSize: 16,
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
    padding: 12,
    gap: 8,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
});