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
import { ArrowLeft, Smartphone, Search, Clock, ChevronDown, Zap, Star, Info, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Users, Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
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

interface Circle {
  id: string;
  name: string;
}

interface Plan {
  id: string;
  validity: string;
  dataBenefit: string;
  talktime: number;
  active: boolean;
  price: number;
  description: string;
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
  };
  whatsub_bbps_plan: {
    validity: string;
    dataBenefit: string;
    talktime: number;
    active: boolean;
  };
  whatsub_bbps_operator: {
    id: string;
    name: string;
    image: string;
    input_length: number;
    is_flexipay: boolean;
  };
}

interface CircleOperatorResponse {
  circleId: string;
  operatorId: string;
}

export default function MobileRechargePage() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [selectedCircle, setSelectedCircle] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Data state
  const [operators, setOperators] = useState<Operator[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);

  // UI state
  const [isLoadingOperators, setIsLoadingOperators] = useState(false);
  const [isLoadingCircles, setIsLoadingCircles] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showCircleModal, setShowCircleModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchOperators();
    fetchCircles();
    fetchRechargeHistory();
  }, []);

  // Auto-fill circle and operator when phone number is entered
  useEffect(() => {
    if (phoneNumber.length === 10) {
      autoFillCircleAndOperator();
    }
  }, [phoneNumber]);

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
            service: "PREPAID"
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

  const fetchCircles = async () => {
    setIsLoadingCircles(true);
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
            query GetCircles {
              __typename
              whatsub_bbps_circles {
                __typename
                id
                name
              }
            }
          `
        })
      });

      const data = await response.json();
      setCircles(data.data?.whatsub_bbps_circles || []);
    } catch (error) {
      console.error('Error fetching circles:', error);
    } finally {
      setIsLoadingCircles(false);
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
            service: "PREPAID"
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

  const autoFillCircleAndOperator = async () => {
    if (phoneNumber.length !== 10) return;

    setIsAutoFilling(true);
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
            query MyQuery($phonenumber: String = "") {
              __typename
              getBBPSCircle(request: {phonenumber: $phonenumber}) {
                __typename
                circleId
                operatorId
              }
            }
          `,
          variables: {
            phonenumber: phoneNumber
          }
        })
      });

      const data = await response.json();
      const result = data.data?.getBBPSCircle as CircleOperatorResponse;

      if (result?.circleId && result?.operatorId) {
        setSelectedCircle(result.circleId);
        setSelectedOperator(result.operatorId);
      }
    } catch (error) {
      console.error('Error auto-filling circle and operator:', error);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleCheckPlans = () => {
    if (phoneNumber && selectedOperator && selectedCircle) {
      const operatorData = getSelectedOperatorData();
      router.push({
        pathname: '/recharge-plans',
        params: {
          operatorId: selectedOperator,
          circleId: selectedCircle,
          phoneNumber: phoneNumber,
          operatorName: operatorData?.name || ''
        }
      });
    }
  };

  const handleRecharge = () => {
    if (selectedPlan) {
      Alert.alert(
        'Confirm Recharge',
        `Recharge ${phoneNumber} with ₹${selectedPlan.price} plan?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            onPress: () => {
              setIsProcessing(true);
              // Simulate payment process
              setTimeout(() => {
                setIsProcessing(false);
                Alert.alert('Success', 'Recharge completed successfully!');
                handlePaymentSuccess();
              }, 2000);
            }
          }
        ]
      );
    }
  };

  const handlePaymentSuccess = () => {
    fetchRechargeHistory();
    setSelectedPlan(null);
    setShowPlans(false);
    setPhoneNumber('');
    setSelectedOperator('');
    setSelectedCircle('');
  };

  const handleHistoryItemClick = (item: RechargeHistory) => {
    setPhoneNumber(item.canumber);
    setSelectedOperator(item.whatsub_bbps_operator.id);
    setSelectedCircle(item.whatsub_bbps_circle.id);
  };

  const getSelectedOperatorData = () => {
    return operators.find(op => op.id === selectedOperator);
  };

  const getSelectedCircleData = () => {
    return circles.find(circle => circle.id === selectedCircle);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchOperators(),
      fetchCircles(),
      fetchRechargeHistory()
    ]);
    setIsRefreshing(false);
  };

  const isCheckPlansEnabled = phoneNumber.length === 10 && selectedOperator && selectedCircle;

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
              <Smartphone size={24} color="#6366F1" />
              <Text style={styles.title}>{t('mobile.title')}</Text>
            </View>
            <Text style={styles.subtitle}>
              {t('mobile.subtitle')}
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
          <Text style={styles.formTitle}>{t('mobile.title')}</Text>

          {/* Mobile Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('mobile.mobileNumber')}</Text>
            <View style={styles.inputContainer}>
              <Smartphone size={18} color="#9CA3AF" />
              <TextInput
                style={styles.textInput}
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, '').slice(0, 10))}
                placeholder={t('mobile.mobileNumberPlaceHolder')}
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                maxLength={10}
              />
              {isAutoFilling && (
                <ActivityIndicator size="small" color="#6366F1" />
              )}
            </View>
          </View>

          {/* Operator Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('mobile.selectOperator')}</Text>
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
                    {getSelectedOperatorData()?.is_flexipay && (
                      <View style={styles.flexiPayBadge}>
                        <Text style={styles.flexiPayText}>FlexiPay</Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>
                  {isLoadingOperators ? t('common.loading') : t('mobile.chooseOperator')}
                </Text>
              )}
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Circle Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('mobile.selectCircle')}</Text>
            <TouchableOpacity
              style={styles.selectorContainer}
              onPress={() => setShowCircleModal(true)}
              disabled={isLoadingCircles}
            >
              <Text style={[
                styles.selectorText,
                selectedCircle ? styles.selectedText : styles.selectorPlaceholder
              ]}>
                {selectedCircle
                  ? getSelectedCircleData()?.name
                  : isLoadingCircles
                    ? t('common.loading')
                    : t('mobile.chooseCircle')
                }
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Check Plans Button */}
          <TouchableOpacity
            style={[
              styles.checkPlansButton,
              isCheckPlansEnabled && !isLoadingPlans ? styles.checkPlansButtonEnabled : styles.checkPlansButtonDisabled
            ]}
            onPress={handleCheckPlans}
            disabled={!isCheckPlansEnabled || isLoadingPlans}
          >
            {isLoadingPlans ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.checkPlansButtonText}>{t('mobile.loadingPlans')}</Text>
              </>
            ) : (
              <>
                <Search size={18} color="white" />
                <Text style={styles.checkPlansButtonText}>{t('mobile.checkPlans')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Recharge History */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Clock size={20} color="#F59E0B" />
            <Text style={styles.historyTitle}>{t('mobile.recentRecharges')}</Text>
          </View>

          {isLoadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : rechargeHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Smartphone size={32} color="#6B7280" />
              <Text style={styles.emptyHistoryText}>{t('mobile.noRechargeHistory')}</Text>
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
                      <Text style={styles.historyPhoneNumber}>{item.canumber}</Text>
                      <Text style={styles.historyCircle}>
                        {item.whatsub_bbps_circle.name}
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
          visible={showOperatorModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowOperatorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Operator</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {operators.map((op) => (
                  <TouchableOpacity
                    key={op.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedOperator(op.id);
                      setShowOperatorModal(false);
                    }}
                  >
                    <Image
                      source={{ uri: op.image }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.modalItemText}>{op.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowOperatorModal(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


        <Modal
          visible={showCircleModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCircleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Circle</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {circles.map((circle) => (
                  <TouchableOpacity
                    key={circle.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedCircle(circle.id);
                      setShowCircleModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{circle.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCircleModal(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


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
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 20,
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
    paddingHorizontal: 14,
    gap: 12,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
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
  flexiPayBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  flexiPayText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
  },
  selectorText: {
    fontSize: 16,
    flex: 1,
  },
  selectedText: {
    color: 'white',
  },
  selectorPlaceholder: {
    color: '#6B7280',
  },
  checkPlansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  checkPlansButtonEnabled: {
    backgroundColor: '#6366F1',
  },
  checkPlansButtonDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  },
  checkPlansButtonText: {
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
  historyOperatorImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyPhoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  historyCircle: {
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalItemText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 12,
  },
  modalImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
});