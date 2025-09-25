import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Wallet, ArrowDown, CircleAlert as AlertCircle, CircleCheck as CheckCircle, IndianRupee, CreditCard as Edit } from 'lucide-react-native';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface WithdrawModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  availableBalance: number;
  minWithdrawAmount?: number;
  maxWithdrawAmount?: number;
  withdrawDetails?: {
    account_name: string;
    bank_account_number: string;
    ifsc: string;
    upi_id: string;
    payout_type: string;
  };
}

export default function WithdrawModal({
  isVisible,
  onClose,
  onSuccess,
  onError,
  availableBalance,
  minWithdrawAmount = 50,
  maxWithdrawAmount = 50000,
  withdrawDetails
}: WithdrawModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fixedCharge, setFixedCharge] = useState<number>(0);
  const [percentageCharge, setPercentageCharge] = useState<number>(0);

  // Reset state when modal opens
  useEffect(() => {
    fetchTransactionCharges();
    if (isVisible) {
      setAmount('');
      setError(null);
      setSuccess(false);
      setIsSubmitting(false);
      setIsFocused(false);
    }
  }, [isVisible]);

  const formatCurrency = (value: number) => {
    return `₹${(value / 100).toFixed(2)}`;
  };
  const fetchTransactionCharges = async () => {
    const percentageCharge = await AsyncStorage.getItem(STORAGE_KEYS.transactionChargesPercentage); // 1%
    const fixedCharge = await AsyncStorage.getItem(STORAGE_KEYS.transactionChargesPrices); // ₹5
    setPercentageCharge(Number(Number(percentageCharge)/1000));
    setFixedCharge(Number(Number(fixedCharge)/100));
  }
  const calculateTransactionCharges = (withdrawAmount: number) => {
    return (withdrawAmount*percentageCharge)/100 + fixedCharge;
  };

  const calculateNetAmount = (withdrawAmount: number) => {
    const charges = calculateTransactionCharges(withdrawAmount);
    return withdrawAmount - charges;
  };

  const validateAmount = (value: string): string | null => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue <= 0) {
      return 'Please enter a valid amount';
    }
    
    if (numValue < minWithdrawAmount) {
      return `Amount should be more than ₹${minWithdrawAmount}`;
    }
    
    if (numValue > maxWithdrawAmount) {
      return `Maximum withdrawal amount is ₹${maxWithdrawAmount}`;
    }
    
    const availableInRupees = availableBalance / 100;
    if (numValue > availableInRupees) {
      return `Insufficient balance. You have ${formatCurrency(availableBalance)} available`;
    }
    
    return null;
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setAmount(cleanValue);
    
    // Validate amount in real-time
    if (cleanValue) {
      const numValue = parseFloat(cleanValue);
      const availableInRupees = availableBalance / 100;
      
      if (numValue < minWithdrawAmount) {
        setError(`Amount should be more than ₹${minWithdrawAmount}`);
      } else if (numValue > availableInRupees) {
        setError(`Insufficient balance. You have ${formatCurrency(availableBalance)} available`);
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  };

  const handleSubmit = async () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        setError('Authentication required');
        return;
      }

      // Convert amount to paise (multiply by 100)
      const amountInPaise = Math.round(parseFloat(amount) * 100);

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($amount: numeric = "", $user_id: uuid = "") {
              __typename
              whatsubWithdrawAmount(request: {amount: $amount, user_id: $user_id}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            amount: amountInPaise.toString(),
            user_id: userId
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0]?.message || 'Withdrawal failed');
        return;
      }

      if (data.data?.whatsubWithdrawAmount?.affected_rows > 0) {
        setSuccess(true);
        
        // Auto close after success animation
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError('Withdrawal failed. Please try again.');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const withdrawAmount = parseFloat(amount) || 0;
  const transactionCharges = withdrawAmount > 0 ? calculateTransactionCharges(withdrawAmount) : 0;
  const netAmount = withdrawAmount > 0 ? calculateNetAmount(withdrawAmount) : 0;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            {/* Header Indicator */}
            <View style={styles.headerIndicator} />

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {success ? (
              /* Success State */
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <CheckCircle size={48} color="#10B981" />
                </View>
                <Text style={styles.successTitle}>Withdrawal Successful!</Text>
                <Text style={styles.successMessage}>
                  ₹{netAmount.toFixed(2)} will be credited to your account
                </Text>
                <ActivityIndicator size="small" color="#10B981" style={styles.successSpinner} />
              </View>
            ) : (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Bank Details Header */}
                <View style={styles.bankDetailsHeader}>
                  <Text style={styles.bankDetailsTitle}>Bank Details</Text>
                </View>

                {/* Account Details */}
                {withdrawDetails && (
                  <View style={styles.accountDetailsSection}>
                    {withdrawDetails.payout_type === 'bank' ? (
                      <>
                        {/* Account Name */}
                        <View style={styles.detailGroup}>
                          <Text style={styles.detailLabel}>Account Name</Text>
                          <View style={styles.detailContainer}>
                            <Text style={styles.detailValue}>{withdrawDetails.account_name}</Text>
                            <Edit size={16} color="#6B7280" />
                          </View>
                        </View>

                        {/* Account Number */}
                        <View style={styles.detailGroup}>
                          <Text style={styles.detailLabel}>Account Number</Text>
                          <View style={styles.detailContainer}>
                            <Text style={styles.detailValue}>{withdrawDetails.bank_account_number}</Text>
                            <Edit size={16} color="#6B7280" />
                          </View>
                        </View>

                        {/* IFSC Number */}
                        <View style={styles.detailGroup}>
                          <Text style={styles.detailLabel}>IFSC Number</Text>
                          <View style={styles.detailContainer}>
                            <Text style={styles.detailValue}>{withdrawDetails.ifsc}</Text>
                            <Edit size={16} color="#6B7280" />
                          </View>
                        </View>
                      </>
                    ) : (
                      /* UPI Details */
                      <View style={styles.detailGroup}>
                        <Text style={styles.detailLabel}>UPI ID</Text>
                        <View style={styles.detailContainer}>
                          <Text style={styles.detailValue}>{withdrawDetails.upi_id}</Text>
                          <Edit size={16} color="#6B7280" />
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Enter Amount Section */}
                <View style={styles.amountSection}>
                  <Text style={styles.amountLabel}>Enter Amount</Text>
                  
                  <View style={[
                    styles.amountInputContainer,
                    isFocused && styles.amountInputContainerFocused
                  ]}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={amount}
                      onChangeText={handleAmountChange}
                      placeholder="Enter Amount"
                      placeholderTextColor="#6B7280"
                      keyboardType="decimal-pad"
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      editable={!isSubmitting}
                      maxLength={8}
                    />
                  </View>

                  {/* Minimum Amount Warning */}
                  <Text style={styles.minimumAmountText}>
                    Withdraw amount should be more than ₹{minWithdrawAmount}
                  </Text>

                  {/* Transaction Breakdown */}
                  {withdrawAmount >= minWithdrawAmount && (
                    <View style={styles.transactionBreakdown}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Withdraw Amount:</Text>
                        <Text style={styles.breakdownValue}>₹{withdrawAmount.toFixed(2)}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Transaction Charges (1% + ₹5):</Text>
                        <Text style={styles.breakdownCharges}>- ₹{transactionCharges.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.breakdownRow, styles.netAmountRow]}>
                        <Text style={styles.netAmountLabel}>Net Amount:</Text>
                        <Text style={styles.netAmountValue}>₹{netAmount.toFixed(2)}</Text>
                      </View>
                    </View>
                  )}

                  {/* Error Message */}
                  {error && (
                    <View style={styles.errorContainer}>
                      <AlertCircle size={16} color="#EF4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </View>

                {/* Withdraw Button */}
                <TouchableOpacity
                  style={[
                    styles.withdrawButton,
                    (!amount || validateAmount(amount) || isSubmitting) && styles.withdrawButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!amount || !!validateAmount(amount) || isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.withdrawButtonText}>Withdraw</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    minHeight: height * 0.7,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    position: 'relative',
  },
  headerIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#6366F1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  bankDetailsHeader: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  bankDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  accountDetailsSection: {
    marginBottom: 32,
  },
  detailGroup: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  detailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  amountSection: {
    marginBottom: 32,
  },
  amountLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amountInputContainerFocused: {
    borderColor: '#6366F1',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#9CA3AF',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  minimumAmountText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  transactionBreakdown: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  breakdownValue: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  breakdownCharges: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  netAmountRow: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  netAmountLabel: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  netAmountValue: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  withdrawButton: {
    backgroundColor: '#6B7280',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButtonDisabled: {
    opacity: 0.6,
  },
  withdrawButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
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
});