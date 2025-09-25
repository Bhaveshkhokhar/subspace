import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  CircleCheck as CheckCircle, 
  CircleAlert as AlertCircle,
  Ban as Bank
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  isVerified: boolean;
}

interface UPIDetails {
  upiId: string;
  isVerified: boolean;
}

interface ExistingPaymentMethod {
  id: string;
  account_name: string;
  bank_account_number: string;
  bank_name: string;
  ifsc: string;
  payout_type: string;
  upi_id: string;
  user_id: string;
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function PaymentMethodsScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [paymentType, setPaymentType] = useState<'bank' | 'upi'>('bank');
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountName: '',
    accountNumber: '',
    ifsc: '',
    isVerified: false
  });
  const [upiDetails, setUpiDetails] = useState<UPIDetails>({
    upiId: '',
    isVerified: false
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [existingPaymentMethods, setExistingPaymentMethods] = useState<ExistingPaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken) {
      fetchExistingPaymentMethods();
    }
  }, [userId, authToken]);

  const initializeUser = async () => {
    try {
      const id = await storage.getUserId();
      const token = await storage.getAuthToken();
      
      setUserId(id);
      setAuthToken(token);
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  };

  const fetchExistingPaymentMethods = async () => {
    if (!userId || !authToken) return;
    
    setIsLoadingPaymentMethods(true);
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query getbankDetails($user_id: uuid!) {
              __typename
              whatsub_bank_account_details(where: {user_id: {_eq: $user_id}}) {
                __typename
                id
                account_name
                bank_account_number
                bank_name
                ifsc
                payout_type
                upi_id
                user_id
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
        console.error('Error fetching payment methods:', data.errors);
        return;
      }
      
      const paymentMethods = data.data?.whatsub_bank_account_details || [];
      setExistingPaymentMethods(paymentMethods);
      
      // Pre-populate form if there are existing payment methods
      if (paymentMethods.length > 0) {
        const firstMethod = paymentMethods[0];
        
        if (firstMethod.payout_type === 'bank' && firstMethod.bank_account_number) {
          setBankDetails({
            accountName: firstMethod.account_name || '',
            accountNumber: firstMethod.bank_account_number || '',
            ifsc: firstMethod.ifsc || '',
            isVerified: true
          });
          setPaymentType('bank');
        } else if (firstMethod.payout_type === 'upi' && firstMethod.upi_id) {
          setUpiDetails({
            upiId: firstMethod.upi_id || '',
            isVerified: true
          });
          setPaymentType('upi');
        }
      }
    } catch (error) {
      console.error('Error fetching existing payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const verifyBankDetails = async () => {
    if (!bankDetails.accountNumber || !bankDetails.ifsc || !bankDetails.accountName) {
      setVerificationError('Please fill in all bank details');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query MyQuery($account: String = "", $ifsc: String = "", $user_id: uuid = "") {
              __typename
              whatsubKycBankAccountVerification(request: {account_number: $account, ifsc: $ifsc, user_id: $user_id}) {
                __typename
                bank_account_details
              }
            }
          `,
          variables: {
            account: bankDetails.accountNumber,
            ifsc: bankDetails.ifsc,
            user_id: userId
          }
        })
      });

      const data = await response.json();
      if (data.data?.whatsubKycBankAccountVerification?.bank_account_details) {
        setBankDetails(prev => ({ ...prev, isVerified: true }));
        showSuccess('Bank details verified successfully');
      } else {
        setVerificationError('Bank details verification failed');
      }
    } catch (error) {
      setVerificationError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyUPI = async () => {
    if (!upiDetails.upiId) {
      setVerificationError('Please enter UPI ID');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($user_id: uuid = "", $vpa: String = "") {
              __typename
              w_verifyVPA(request: {user_id: $user_id, vpa: $vpa}) {
                __typename
                name
              }
            }
          `,
          variables: {
            vpa: upiDetails.upiId,
            user_id: userId
          }
        })
      });

      const data = await response.json();
      if (data.data?.w_verifyVPA?.name) {
        setUpiDetails(prev => ({ ...prev, isVerified: true }));
        showSuccess('UPI ID verified successfully');
      } else {
        setVerificationError('UPI verification failed');
      }
    } catch (error) {
      setVerificationError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const saveBankDetails = async () => {
    if (!bankDetails.isVerified) {
      showError('Please verify your bank details first');
      return;
    }

    setIsSaving(true);
    try {
      // Here you would implement the API call to save bank details
      // For now, we'll just simulate success
      setTimeout(() => {
        showSuccess('Bank details saved successfully');
        setIsSaving(false);
      }, 1000);
    } catch (error) {
      showError('Failed to save bank details');
      setIsSaving(false);
    }
  };

  const saveUPIDetails = async () => {
    if (!upiDetails.isVerified) {
      showError('Please verify your UPI ID first');
      return;
    }

    setIsSaving(true);
    try {
      // Here you would implement the API call to save UPI details
      // For now, we'll just simulate success
      setTimeout(() => {
        showSuccess('UPI details saved successfully');
        setIsSaving(false);
      }, 1000);
    } catch (error) {
      showError('Failed to save UPI details');
      setIsSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.paymentMethods')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Loading State */}
          {isLoadingPaymentMethods && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading payment methods...</Text>
            </View>
          )}

          {/* Existing Payment Methods */}
          {!isLoadingPaymentMethods && existingPaymentMethods.length > 0 && (
            <View style={styles.existingMethodsContainer}>
              <Text style={styles.existingMethodsTitle}>Saved Payment Methods</Text>
              {existingPaymentMethods.map((method) => (
                <View key={method.id} style={styles.existingMethodCard}>
                  <View style={styles.existingMethodHeader}>
                    {method.payout_type === 'bank' ? (
                      <Bank size={20} color="#6366F1" />
                    ) : (
                      <Smartphone size={20} color="#10B981" />
                    )}
                    <Text style={styles.existingMethodType}>
                      {method.payout_type === 'bank' ? 'Bank Account' : 'UPI'}
                    </Text>
                    <View style={styles.verifiedBadge}>
                      <CheckCircle size={14} color="#10B981" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  </View>
                  
                  {method.payout_type === 'bank' ? (
                    <View style={styles.existingMethodDetails}>
                      <Text style={styles.existingMethodLabel}>Account Name:</Text>
                      <Text style={styles.existingMethodValue}>{method.account_name}</Text>
                      <Text style={styles.existingMethodLabel}>Account Number:</Text>
                      <Text style={styles.existingMethodValue}>
                        ****{method.bank_account_number?.slice(-4)}
                      </Text>
                      <Text style={styles.existingMethodLabel}>IFSC:</Text>
                      <Text style={styles.existingMethodValue}>{method.ifsc}</Text>
                      {method.bank_name && (
                        <>
                          <Text style={styles.existingMethodLabel}>Bank:</Text>
                          <Text style={styles.existingMethodValue}>{method.bank_name}</Text>
                        </>
                      )}
                    </View>
                  ) : (
                    <View style={styles.existingMethodDetails}>
                      <Text style={styles.existingMethodLabel}>UPI ID:</Text>
                      <Text style={styles.existingMethodValue}>{method.upi_id}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Payment Type Selector */}
          <View style={styles.existingMethodsContainer}>
            <Text style={styles.sectionTitle}>
              {existingPaymentMethods.length > 0 ? 'Add New Payment Method' : 'Add Payment Method'}
            </Text> 
            <View style={styles.paymentTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.paymentTypeButton,
                  paymentType === 'bank' && styles.activePaymentTypeButton
                ]}
                onPress={() => {
                  setPaymentType('bank');
                  setVerificationError(null);
                }}
              >
                <Bank size={20} color={paymentType === 'bank' ? 'white' : '#9CA3AF'} />
                <Text style={[
                  styles.paymentTypeText,
                  paymentType === 'bank' && styles.activePaymentTypeText
                ]}>
                  Bank Account
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentTypeButton,
                  paymentType === 'upi' && styles.activePaymentTypeButton
                ]}
                onPress={() => {
                  setPaymentType('upi');
                  setVerificationError(null);
                }}
              >
                <Smartphone size={20} color={paymentType === 'upi' ? 'white' : '#9CA3AF'} />
                <Text style={[
                  styles.paymentTypeText,
                  paymentType === 'upi' && styles.activePaymentTypeText
                ]}>
                  UPI
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bank Details Form */}
          {paymentType === 'bank' && (
            <View style={styles.formContainer}>
              <View style={styles.formHeader}>
                <Bank size={24} color="#6366F1" />
                <Text style={styles.formTitle}>Bank Account Details</Text>
              </View>

              {verificationError && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{verificationError}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Account Holder Name</Text>
                <TextInput
                  style={styles.input}
                  value={bankDetails.accountName}
                  onChangeText={(text) => setBankDetails(prev => ({ ...prev, accountName: text }))}
                  placeholder="Enter account holder name"
                  placeholderTextColor="#6B7280"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  value={bankDetails.accountNumber}
                  onChangeText={(text) => setBankDetails(prev => ({ ...prev, accountNumber: text }))}
                  placeholder="Enter account number"
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>IFSC Code</Text>
                <TextInput
                  style={styles.input}
                  value={bankDetails.ifsc}
                  onChangeText={(text) => setBankDetails(prev => ({ ...prev, ifsc: text.toUpperCase() }))}
                  placeholder="Enter IFSC code"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    bankDetails.isVerified && styles.verifiedButton,
                    isVerifying && styles.disabledButton
                  ]}
                  onPress={verifyBankDetails}
                  disabled={isVerifying || bankDetails.isVerified}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : bankDetails.isVerified ? (
                    <>
                      <CheckCircle size={16} color="white" />
                      <Text style={styles.buttonText}>Verified</Text>
                    </>
                  ) : (
                    <Text style={styles.buttonText}>Verify</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!bankDetails.isVerified || isSaving) && styles.disabledButton
                  ]}
                  onPress={saveBankDetails}
                  disabled={true}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              {bankDetails.isVerified && (
                <View style={styles.successContainer}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.successText}>
                    Your bank account has been verified successfully
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* UPI Details Form */}
          {paymentType === 'upi' && (
            <View style={styles.formContainer}>
              <View style={styles.formHeader}>
                <Smartphone size={24} color="#6366F1" />
                <Text style={styles.formTitle}>UPI Details</Text>
              </View>

              {verificationError && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{verificationError}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>UPI ID</Text>
                <TextInput
                  style={styles.input}
                  value={upiDetails.upiId}
                  onChangeText={(text) => setUpiDetails(prev => ({ ...prev, upiId: text }))}
                  placeholder="Enter UPI ID (e.g., name@upi)"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={styles.helperText}>
                  Enter your UPI ID
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    upiDetails.isVerified && styles.verifiedButton,
                    isVerifying && styles.disabledButton
                  ]}
                  onPress={verifyUPI}
                  disabled={isVerifying || upiDetails.isVerified}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : upiDetails.isVerified ? (
                    <>
                      <CheckCircle size={16} color="white" />
                      <Text style={styles.buttonText}>Verified</Text>
                    </>
                  ) : (
                    <Text style={styles.buttonText}>Verify</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!upiDetails.isVerified || isSaving) && styles.disabledButton
                  ]}
                  onPress={saveUPIDetails}
                  disabled={!upiDetails.isVerified || isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              {upiDetails.isVerified && (
                <View style={styles.successContainer}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.successText}>
                    Your UPI ID has been verified successfully
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  paymentTypeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    marginBottom: 24,
  },
  paymentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  activePaymentTypeButton: {
    backgroundColor: '#6366F1',
  },
  paymentTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activePaymentTypeText: {
    color: 'white',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  verifyButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  verifiedButton: {
    backgroundColor: '#10B981',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  successText: {
    fontSize: 14,
    color: '#10B981',
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  existingMethodsContainer: {
    marginBottom: 24,
  },
  existingMethodsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  existingMethodCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  existingMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  existingMethodType: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  existingMethodDetails: {
    gap: 8,
  },
  existingMethodLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  existingMethodValue: {
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
});