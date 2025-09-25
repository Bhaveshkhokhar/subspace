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
  Car, 
  Search, 
  Clock, 
  ChevronDown, 
  Zap, 
  Star, 
  Info, 
  CircleCheck as CheckCircle, 
  CircleAlert as AlertCircle 
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

export default function FastagRechargePage() {
  // Form state
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [customAmount, setCustomAmount] = useState('');
  
  // Data state
  const [banks, setBanks] = useState<Operator[]>([]);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);
  
  // UI state
  const { t } = useTranslation();
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal ] = useState(false);
  const { toast, showSuccess, showError, hideToast } = useToast();
  

  useEffect(() => {
    fetchBanks();
    fetchRechargeHistory();
  }, []);

  const fetchBanks = async () => {
    setIsLoadingBanks(true);
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
            service: "FASTAG"
          }
        })
      });

      const data = await response.json();
      setBanks(data.data?.whatsub_bbps_operators || []);
    } catch (error) {
      console.error('Error fetching banks:', error);
    } finally {
      setIsLoadingBanks(false);
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
            service: "FASTAG"
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

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchBanks(), fetchRechargeHistory()]);
    setIsRefreshing(false);
  };

  const handleRecharge = async () => {
    const amount = parseFloat(customAmount);
    
    if (amount < 500) {
      setError('Minimum amount is ₹500');
      return;
    }
    
    if (!vehicleNumber || !selectedBank || !customAmount) {
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
            operator: getSelectedBankData()?.code,
            canumber: vehicleNumber,
            amount: amount.toString(),
            plan_id: null,
            operator_id: selectedBank,
            circle_id: null,
            service: "FASTAG"
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
    setVehicleNumber('');
    setSelectedBank('');
    setError(null);
  };

  const handleHistoryItemClick = (item: RechargeHistory) => {
    setVehicleNumber(item.canumber);
    setSelectedBank(item.whatsub_bbps_operator.id);
  };

  const getSelectedBankData = () => {
    return banks.find(bank => bank.id === selectedBank);
  };

  const isFormValid = () => {
    const amount = parseFloat(customAmount);
    return vehicleNumber.length >= 6 && selectedBank && amount >= 500;
  };

  const formatVehicleNumber = (value: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    return value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
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
            <View style={styles.titleContainer}>
              <Car size={24} color="#F59E0B" />
              <Text style={styles.title}>{t('fastag.title')}</Text>
            </View>
            <Text style={styles.subtitle}>
              {t('fastag.subtitle')}
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
          <Text style={styles.formTitle}>{t('fastag.formTitle')}</Text>
          
          {/* Vehicle Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('fastag.vehicleNumber')}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={vehicleNumber}
                onChangeText={(text) => setVehicleNumber(formatVehicleNumber(text))}
                placeholder="Enter vehicle number (e.g., MH01AB1234)"
                placeholderTextColor="#6B7280"
                autoCapitalize="characters"
                maxLength={15}
              />
            </View>
            <Text style={styles.helperText}>
              {t('fastag.vehicleNumberHelp')}
            </Text>
          </View>

          {/* Bank Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('fastag.selectBank')}</Text>
            <TouchableOpacity
              style={styles.selectorContainer}
              onPress={() => setShowBankModal(true)}
              disabled={isLoadingBanks}
            >
              {selectedBank ? (
                <View style={styles.selectedOption}>
                  <Image
                    source={{ uri: getSelectedBankData()?.image }}
                    style={styles.bankImage}
                    resizeMode="contain"
                  />
                  <View style={styles.selectedOptionText}>
                    <Text style={styles.selectedOptionName}>
                      {getSelectedBankData()?.name}
                    </Text>
                    {(getSelectedBankData()?.discount_percentage ?? 0) > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                          {getSelectedBankData()?.discount_percentage}% {t('common.off')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>
                  {isLoadingBanks ? 'Loading banks...' : t('fastag.chooseBankPlaceHolder')}
                </Text>
              )}
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('fastag.enterAmount')}</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.textInput}
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder={t('fastag.enterAmountPlaceHolder')}
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.helperText}>
              {t('fastag.minimumAmount')}: ₹500
            </Text>
            {customAmount && parseFloat(customAmount) < 500 && (
              <Text style={styles.errorHelperText}>
                {t('fastag.checkAmount')}
              </Text>
            )}
          </View>

          {/* Popular Amounts */}
          <View style={styles.quickAmountsSection}>
            <Text style={styles.quickAmountsLabel}>{t('fastag.quickSelect')}</Text>
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

          {/* Recharge Button */}
          <TouchableOpacity
            style={[
              styles.rechargeButton,
              isFormValid() && !isProcessing ? styles.rechargeButtonEnabled : styles.rechargeButtonDisabled
            ]}
            onPress={handleRecharge}
            disabled={!isFormValid() || isProcessing}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.rechargeButtonText}>{t('common.processing')}</Text>
              </>
            ) : (
              <>
                <Zap size={18} color="white" />
                <Text style={styles.rechargeButtonText}>
                  {t('fastag.recharge')} {customAmount && `₹${customAmount}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Recharge History */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.historyTitle}>{t('fastag.recentRecharges')}</Text>
          </View>
          
          {isLoadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : rechargeHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Car size={32} color="#6B7280" />
              <Text style={styles.emptyHistoryText}>{t('fastag.noHistory')}</Text>
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
                      style={styles.historyBankImage}
                      resizeMode="contain"
                    />
                    <View style={styles.historyItemInfo}>
                      <Text style={styles.historyVehicleNumber}>{item.canumber}</Text>
                      <Text style={styles.historyBankName}>
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

          <Modal
  visible={showBankModal}
  animationType="slide"
  transparent
  onRequestClose={() => setShowBankModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>{t('fastag.chooseBank')}</Text>
      <ScrollView style={{ maxHeight: 400 }}>
        {banks.map((bank) => (
          <TouchableOpacity
            key={bank.id}
            style={styles.bankOption}
            onPress={() => {
              setSelectedBank(bank.id);
              setShowBankModal(false);
            }}
          >
            <Image source={{ uri: bank.image }} style={styles.modalBankImage} />
            <Text style={styles.bankName}>{bank.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setShowBankModal(false)}
      >
        <Text style={styles.closeButtonText}>{t('common.close')}</Text>
      </TouchableOpacity>
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
          title={t('fastag.completePayment')}
          description={(
            t('fastag.rechargeFastagFor',{
              vehicleNumber,
              amount: String(pendingPaymentAmount),
            })
          )}
        />
        
        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      </ScrollView>
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
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 20,
    gap: 16,
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
    gap: 12,
    marginBottom: 8,
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
    padding: 20,
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
    paddingHorizontal: 8,
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
  errorHelperText: {
    fontSize: 12,
    color: '#EF4444',
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
    paddingVertical: 10,
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  bankImage: {
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
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 10,
    color: '#10B981',
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
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  rechargeButtonEnabled: {
    backgroundColor: '#F59E0B',
  },
  rechargeButtonDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  },
  rechargeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  historyCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 20,
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
    gap: 12,
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
  historyBankImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyVehicleNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  historyBankName: {
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
  aboutCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 20,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 12,
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
  padding: 20,
  width: '85%',
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: 'white',
  marginBottom: 16,
},
bankOption: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderColor: 'rgba(255,255,255,0.1)',
},
modalBankImage: {
  width: 32,
  height: 32,
  borderRadius: 6,
  marginRight: 12,
},
bankName: {
  fontSize: 16,
  color: 'white',
},
closeButton: {
  marginTop: 16,
  padding: 12,
  backgroundColor: '#F59E0B',
  borderRadius: 12,
  alignItems: 'center',
},
closeButtonText: {
  fontSize: 16,
  fontWeight: '600',
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