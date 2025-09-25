import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image
} from 'react-native';
import { ArrowRight, CircleAlert as AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from '@/hooks/useLanguage';
import { useAuthStore, initiatePhoneAuth, verifyOTP } from '@/stores/authStore';
import { storage } from '@/utils/storage';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const { t } = useTranslation();

  // Initialize state from store
  const [storeState, setStoreState] = useState(() => useAuthStore.getState());
  const { phoneNumber, isLoading, error } = storeState;
  const [isFocused, setIsFocused] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(() => {
      setStoreState(useAuthStore.getState());
    });
    return unsubscribe;
  }, []);

  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Refs for OTP inputs
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `${digits}`;
  };

  const handlePhoneSubmit = async () => {
    useAuthStore.setError(null);

    if (!phoneNumber || phoneNumber.length < 10) {
      useAuthStore.setError('Please enter a valid phone number');
      return;
    }

    useAuthStore.setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const success = await initiatePhoneAuth(formattedPhone);
      if (success) {
        useAuthStore.setPhoneNumber(formattedPhone);
      }
      setStep('otp');
    } catch (err) {
      useAuthStore.setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      useAuthStore.setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return;

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async () => {
    useAuthStore.setError(null);

    const code = otpCode.join('');
    if (code.length !== 6) {
      useAuthStore.setError('Please enter the complete verification code');
      return;
    }

    useAuthStore.setLoading(true);

    try {
      const success = await verifyOTP(phoneNumber, code);
      if (success) {
        const authToken = await storage.getAuthToken();
          router.replace('/(tabs)/home');
        }
    } catch (err) {
      useAuthStore.setError(err instanceof Error ? err.message : 'Invalid verification code');
      setOtpCode(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      useAuthStore.setLoading(false);
      useAuthStore.setError(null);
    }
  };

  const resetFlow = () => {
    setStep('phone');
    useAuthStore.setPhoneNumber('');
    setOtpCode(['', '', '', '', '', '']);
    useAuthStore.setError(null);
  };

  const resendCode = async () => {
    useAuthStore.setError(null);
    useAuthStore.setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      await initiatePhoneAuth(formattedPhone);
      setOtpCode(['', '', '', '', '', '']);
    } catch (err) {
      useAuthStore.setError(err instanceof Error ? err.message : 'Failed to resend verification code');
    } finally {
      useAuthStore.setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/subspace.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcomeText}>{t('auth.title')}</Text>
            <Text style={styles.subtitleText}>{t('auth.subtitle')}</Text>
          </View>

          <View style={styles.formContainer}>
            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color="#EF4444" />
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            )}

            {step === 'phone' ? (
              <View style={styles.phoneForm}>
                <Text style={styles.formTitle}> {t('auth.phone.label')}</Text>
                <View style={[styles.wrapper, isFocused && styles.wrapperFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.phone.placeholder')}
                    placeholderTextColor="#4B5563"
                    value={phoneNumber}
                    onChangeText={(text) => {
                      useAuthStore.setPhoneNumber(text);
                    }}
                    keyboardType="phone-pad"
                    maxLength={15}
                    editable={!isLoading}
                    autoFocus={true}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                </View>

                <Text style={styles.helperText}>{t('auth.phone.note')}</Text>

                <TouchableOpacity
                  style={[
                    styles.button,
                    isLoading && styles.buttonDisabled
                  ]}
                  onPress={handlePhoneSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={styles.buttonText}>{t('auth.sending')}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.buttonText}>
                        {t('common.continue')}
                      </Text>
                      <ArrowRight size={16} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.otpForm}>
                <Text style={styles.formTitle}>{t('auth.otp.title')}</Text>
                <Text style={styles.otpSubtitle}>{t('auth.otp.subtitle')} {phoneNumber}</Text>

                <View style={styles.otpContainer}>
                  {otpCode.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { otpRefs.current[index] = ref }}
                      style={[
                        styles.otpInput,
                        digit && styles.otpInputFilled,
                        focusedIndex === index && styles.otpInputFocused
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                      keyboardType="numeric"
                      maxLength={1}
                      textAlign="center"
                      editable={!isLoading}
                      selectTextOnFocus
                      autoFocus={index === 0} // ✅ Auto-focus first
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(null)}
                    />
                  ))}
                </View>

                <View style={styles.otpActions}>
                  <TouchableOpacity onPress={resetFlow} disabled={isLoading}>
                    <Text style={[
                      styles.changeNumberText,
                      isLoading && styles.disabledText
                    ]}>
                      {t('auth.otp.change')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={resendCode} disabled={isLoading}>
                    <Text style={[
                      styles.resendText,
                      isLoading && styles.disabledText
                    ]}>
                      {t('auth.otp.resend')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    isLoading && styles.buttonDisabled
                  ]}
                  onPress={handleOtpSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={styles.buttonText}>
                        {t('auth.verifying')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.buttonText}>{t('auth.verify')}</Text>
                      <ArrowRight size={16} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 200,
    height: 42,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    flex: 1,
    fontSize: 12,
    marginLeft: 6,
  },
  phoneForm: {
    gap: 16,
  },
  otpForm: {
    gap: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  wrapper: {
    width: '100%',
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#fff',
  },
  wrapperFocused: {
    borderColor: '#6366F1',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  inputIcon: {
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    color: 'white',
    height: '100%',
    fontSize: 14,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: -6,
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: -6,
  },

  // Replace the existing otpContainer and otpInput styles with these:

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: width < 350 ? 6 : 8, // Smaller gap on very small screens
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    fontSize: 16,
    color: 'white',
    backgroundColor: '#1F1F1F',
    textAlign: 'center',           // ✅ horizontal centering
    textAlignVertical: 'center',
  },

  otpInputFocused: {
    borderColor: '#6366F1', // Indigo
    borderWidth: 2,
  },

  otpInputFilled: {
    borderColor: '#6366F1',
  },

  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeNumberText: {
    color: '#6366F1',
    textDecorationLine: 'underline',
    fontSize: 12,
  },
  resendText: {
    color: '#10B981',
    textDecorationLine: 'underline',
    fontSize: 12,
  },
  disabledText: {
    opacity: 0.5,
  },
});