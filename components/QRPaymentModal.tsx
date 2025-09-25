import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Shield, Clock, CircleAlert as AlertCircle } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Svg, { Path, Polyline } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  title?: string;
  description?: string;
}

interface PaymentResponse {
  payment_id: string;
  payment_type: string;
  upiUrl: string;
}

export default function QRPaymentModal({
  isOpen,
  onClose,
  amount,
  onSuccess,
  onError,
  title,
  description
}: QRPaymentModalProps) {
  const { t } = useTranslation();
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'generating' | 'pending' | 'success' | 'failed'>('idle');
  const [paymentInterval, setPaymentInterval] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes timeout

  const defaultTitle = title || t('wallet.addMoney');
  const defaultDescription = description || t('wallet.proceed');

  useEffect(() => {
    if (isOpen && amount > 0) {
      initiatePayment();
    }
    
    return () => {
      if (paymentInterval) {
        clearInterval(paymentInterval);
      }
    };
  }, [isOpen, amount]);

  useEffect(() => {
    if (paymentStatus === 'pending' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && paymentStatus === 'pending') {
      setPaymentStatus('failed');
      setError(t('error.timeout'));
      onError?.(t('error.timeout'));
    }
  }, [timeLeft, paymentStatus, onError, t]);

  const initiatePayment = async () => {
    const userId = await storage.getUserId();
    const authToken = await storage.getAuthToken();
    
    if (!userId || !authToken || amount <= 0) return;

    setPaymentStatus('generating');
    setError(null);
    setTimeLeft(120);

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($amount: String = "", $target_app_android: String = "", $user_id: uuid = "") {
              __typename
              whatsubCreateUPIIntentRequest(request: {amount: $amount, target_app_android: $target_app_android, user_id: $user_id}) {
                __typename
                payment_id
                payment_type
                upiUrl
              }
            }
          `,
          variables: {
            amount: Math.round(amount * 100).toString(), // Convert to paise
            target_app_android: "",
            user_id: userId
          }
        })
      });

      const data = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        const errorMessage = data.errors[0].message || t('error.serverError');
        throw new Error(errorMessage);
      }
      
      const paymentData = data.data?.whatsubCreateUPIIntentRequest as PaymentResponse;

      if (paymentData?.upiUrl) {
        setPaymentUrl(paymentData.upiUrl);
        setPaymentStatus('pending');

        const intervalId = setInterval(() => {
          checkPaymentStatus(paymentData.payment_id, paymentData.payment_type);
        }, 3000);

        setPaymentInterval(intervalId);
      } else {
        throw new Error(t('wallet.paymentFailed'));
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      setError(t('wallet.paymentFailed'));
      setPaymentStatus('failed');
      onError?.(t('wallet.paymentFailed'));
    }
  };

  const checkPaymentStatus = async (paymentId: string, paymentType: string) => {
    const userId = await storage.getUserId();
    const authToken = await storage.getAuthToken();
    
    if (!userId || !authToken) return;

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($payment_type: String = "", $user_id: uuid = "", $payment_id: String = "", $payment_token_id: String = "") {
              __typename
              w_verifyOrder(request: {payment_id: $payment_id, user_id: $user_id, payment_type: $payment_type, payment_token_id: $payment_token_id}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            payment_id: paymentId,
            user_id: userId,
            payment_type: paymentType,
            payment_token_id: ""
          }
        })
      });

      const data = await response.json();
      
      if (data.data?.w_verifyOrder?.affected_rows > 0) {
        setPaymentStatus('success');
        if (paymentInterval) {
          clearInterval(paymentInterval);
          setPaymentInterval(null);
        }
        onSuccess?.();
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  const handleClose = () => {
    if (paymentInterval) {
      clearInterval(paymentInterval);
      setPaymentInterval(null);
    }
    setPaymentUrl(null);
    setPaymentStatus('idle');
    setError(null);
    setTimeLeft(120);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{defaultTitle}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.amountText}>{t('wallet.enterAmount')}: ₹{amount.toFixed(2)}</Text>

          {/* Content */}
          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }}>
            {paymentStatus === 'generating' && (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.infoText}>{t('common.loading')}</Text>
              </View>
            )}

            {paymentStatus === 'pending' && paymentUrl && (
              <View style={styles.centerContent}>
                <Text style={styles.desc}>{defaultDescription}</Text>
                <View style={styles.qrWrapper}>
                  <QRCode value={paymentUrl} size={width * 0.55} backgroundColor="white" color="black" />
                </View>
                <View style={styles.timerBox}>
                  <Clock size={16} color="#F59E0B" />
                  <Text style={styles.timerText}>
                    {t('payments.timeRemaining')}: {formatTime(timeLeft)}
                  </Text>
                </View>
                <Text style={styles.status}>{t('payments.waitingConfirmation')}</Text>
                <Text style={styles.warning}>{t('payments.dontClose')}</Text>
              </View>
            )}

            {paymentStatus === 'success' && (
              <View style={styles.centerContent}>
                <View style={styles.successIcon}>
                  <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
                    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <Polyline points="22,4 12,14.01 9,11.01" />
                  </Svg>
                </View>
                <Text style={styles.successTitle}>{t('wallet.paymentSuccess')}</Text>
                <Text style={styles.infoText}>{t('success.completed')}</Text>
              </View>
            )}

            {paymentStatus === 'failed' && (
              <View style={styles.centerContent}>
                <View style={styles.failedIcon}>
                  <AlertCircle size={40} color="#EF4444" />
                </View>
                <Text style={styles.failedTitle}>{t('wallet.paymentFailed')}</Text>
                <Text style={styles.infoText}>{error || t('error.unknown')}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={initiatePayment}>
                  <Text style={styles.retryText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {paymentStatus === 'pending' && (
            <View style={styles.footer}>
              <Shield size={16} color="#9CA3AF" />
              <Text style={styles.secure}>{t('payments.securePayment')}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '95%',
    maxHeight: '95%',
    borderRadius: 20,
    backgroundColor: '#1F2937',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(55,65,81,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 10,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 12,
    textAlign: 'center',
  },
  qrWrapper: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 16,
    marginBottom: 16,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    gap: 6,
  },
  timerText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  status: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 10,
  },
  warning: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16,185,129,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 6,
  },
  failedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  failedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 6,
  },
  retryBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31,41,55,0.85)',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  secure: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
