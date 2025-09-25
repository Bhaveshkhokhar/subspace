import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet as WalletIcon,
  Plus,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Clock,
  IndianRupee,
  ArrowLeft,
  Zap,
  HandCoins,
  Landmark,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import QRPaymentModal from '@/components/QRPaymentModal';
import WithdrawModal from '@/components/WithdrawModal';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import {WalletShimmer} from '@/components/shimmer';

const { width } = Dimensions.get('window');

interface WalletBalance {
  total_amount: number;
  locked_amount: number;
  unlocked_amount: number;
}

interface WalletTransaction {
  id: string;
  amount: number;
  purpose: string;
  created_at: string;
}

interface WithdrawDetails {
  account_name: string,
  bank_account_number: string,
  ifsc: string,
  payout_type: string,
  upi_id: string,
}

export default function WalletScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [walletBalance, setWalletBalance] = useState<WalletBalance>({
    total_amount: 0,
    locked_amount: 0,
    unlocked_amount: 0
  });
  const [withdrawDetails, setWithdrawDetails] = useState<WithdrawDetails>({
    account_name: "",
    bank_account_number: "",
    ifsc: "",
    upi_id: "",
    payout_type: ""
  });
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true); // stop when no more records

  const LIMIT = 10;

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchWalletBalance(),
        fetchTransactions(0)
      ]);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
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
           query getTransaction($user_id: uuid!) {
              __typename
              whatsub_user_wallet(where: {user_id: {_eq: $user_id}}) {
                __typename
                total_amount
              }
              whatsub_user_wallet_locked_unlocked_internal_mv(where: {user_id: {_eq: $user_id}}) {
                __typename
                locked_amount
                unlocked_amount
              }
              whatsub_bank_account_details(where: {user_id: {_eq: $user_id}}) {
                __typename
                account_name
                bank_account_number
                ifsc
                upi_id
                payout_type
              }
            }
          `,
          variables: {
            user_id: userId
          }
        })
      });

      const data = await response.json();

      if (data.data) {
        const total = data.data.whatsub_user_wallet[0]?.total_amount || 0;
        const { locked_amount = 0, unlocked_amount = 0 } =
          data.data.whatsub_user_wallet_locked_unlocked_internal_mv[0] || {};

        setWalletBalance({
          total_amount: total,
          locked_amount,
          unlocked_amount
        });

        setWithdrawDetails(data.data.whatsub_bank_account_details[0]);
      }
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    }
  };

  const fetchTransactions = async (newOffset = 0) => {
    try {
      setLoading(true);

      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();
      if (!userId || !authToken) return;

      const response = await fetch("https://db.subspace.money/v1/graphql", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            query getTransaction($user_id: uuid!, $limit: Int!, $offset: Int!) {
              whatsub_wallet(
                where: {user_id: {_eq: $user_id}}, 
                order_by: {created_at: desc}, 
                limit: $limit, 
                offset: $offset
              ) {
                id
                amount
                purpose
                created_at
              }
            }
          `,
          variables: {
            user_id: userId,
            limit: LIMIT,
            offset: newOffset,
          },
        }),
      });

      const data = await response.json();
      const newData: WalletTransaction[] = data.data?.whatsub_wallet || [];

      if (newOffset === 0) {
        setTransactions(newData);
      } else {
        setTransactions((prev) => [...prev, ...newData]);
      }

      setHasMore(newData.length === LIMIT); // if less than LIMIT → no more data
      setOffset(newOffset);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchTransactions(offset + LIMIT);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchWalletData();
    setIsRefreshing(false);
  };

  const handleQuickAdd = (value: number) => {
    setAmount(value.toString());
  };

  const handleAddMoney = async () => {
    const amountToAdd = parseFloat(amount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      setError(t('error.invalidInput'));
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setAmount('');
    setError(null);
    fetchWalletBalance();
    fetchTransactions();
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleBankIconPress = () => {
    // Check if user has withdrawal details (bank account or UPI)
    const hasWithdrawDetails = withdrawDetails && (
      (withdrawDetails.payout_type === 'bank' && withdrawDetails.bank_account_number && withdrawDetails.ifsc) ||
      (withdrawDetails.payout_type === 'upi' && withdrawDetails.upi_id)
    );

    if (hasWithdrawDetails) {
      // Show withdraw modal if user has valid withdrawal details
      setShowWithdrawModal(true);
    } else {
      // Route to payment methods if no withdrawal details
      router.push('/(tabs)/account/payment-methods');
      showError('Please add your bank details or UPI ID to withdraw money');
    }
  };

  const handleWithdrawSuccess = () => {
    setShowWithdrawModal(false);
    // Refresh wallet balance after successful withdrawal
    fetchWalletBalance();
    showSuccess('Withdrawal request submitted successfully');
  };

  const handleWithdrawError = (errorMessage: string) => {
    showError(errorMessage);
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ', ' + date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTransactionIcon = (amount: number) => {
    if (amount > 0) {
      return <ArrowDown size={18} color="#fff" fontSize="1000" />;
    } else {
      return <ArrowUp size={18} color="#fff" fontSize="1000" />;
    }
  };

  const renderBalanceCard = () => (
    <View style={styles.balanceCard}>
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceLabel}>
          {t('wallet.title')}
        </Text>
        <TouchableOpacity
          style={styles.balanceIconContainer}
          onPress={handleBankIconPress}
        >
          <Landmark size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <Text style={styles.balanceAmount}>
        {formatCurrency(walletBalance.total_amount)}
      </Text>

      <View style={styles.balanceBreakdown}>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceItemLabel}>
            {t('wallet.locked')}
          </Text>
          <Text style={styles.balanceItemValue}>
            {formatCurrency(walletBalance.locked_amount)}
          </Text>
        </View>
        <View style={styles.balanceItem}>
          <Text style={styles.balanceItemLabel}>
            {t('wallet.unlocked')}
          </Text>
          <Text style={styles.balanceItemValue2}>
            {formatCurrency(walletBalance.unlocked_amount)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderAddMoneySection = () => (
    <View style={styles.addMoneyCard}>
      <Text style={styles.addMoneyTitle}>
        {t('wallet.addMoney')}
      </Text>

      <View style={[styles.amountInputContainer,
      ]}>
        <TextInput
          style={[styles.amountInput,
          isFocused && styles.amountInputContainerFocused]}
          underlineColorAndroid="transparent"
          selectionColor="#6366F1"
          placeholder={t('wallet.enterAmount')}
          placeholderTextColor="#6B7280"
          value={amount}
          onChangeText={setAmount}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.quickAmountContainer}>
        {[100, 200, 500, 1000].map((value) => (
          <TouchableOpacity
            key={value}
            style={styles.quickAmountButton}
            onPress={() => handleQuickAdd(value)}
          >
            <Plus size={14} color="#39FF14" />
            <Text style={styles.quickAmountText}>
              ₹{value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.proceedButton,
          !amount && styles.proceedButtonDisabled
        ]}
        onPress={handleAddMoney}
        disabled={!amount}
      >
        <Text style={styles.proceedButtonText}>
          {t('wallet.proceed')}
        </Text>
        <ArrowRight size={18} color="white" />
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );

  const renderTransaction = ({ item }: { item: WalletTransaction }) => (
    <View key={item.id} style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.transactionIconContainer,
            item.amount > 0 ? styles.positiveTransaction : styles.negativeTransaction,
          ]}
        >
          {getTransactionIcon(item.amount)}
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionPurpose} numberOfLines={2}>
            {item.purpose}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.transactionRight}>
        <Text
          style={[
            styles.transactionAmount,
            item.amount > 0 ? styles.positiveAmount : styles.negativeAmount,
          ]}
        >
          {item.amount > 0 ? "+" : "-"}
          {formatCurrency(Math.abs(item.amount))}
        </Text>
      </View>
    </View>
  );


  // Show shimmer while loading initial data
  if (isLoading) {
    return <WalletShimmer />;
  }
  
  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        // refreshControl={
        //   <RefreshControl
        //     refreshing={isRefreshing}
        //     onRefresh={onRefresh}
        //     tintColor="#6366F1"
        //     colors={['#6366F1']}
        //   />
        // }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Balance Card */}
        {renderBalanceCard()}

        {/* Add Money Section */}
        {renderAddMoneySection()}

        {/* Recent Transactions */}
        <View style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>
              {t('wallet.recentTransactions')}
            </Text>
            <Clock size={20} color="#6B7280" />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Zap size={32} color="#6B7280" />
              <Text style={styles.emptyTransactionsText}>
                {t('wallet.noTransactions')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id}
              renderItem={renderTransaction}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={loading ? <ActivityIndicator /> : null}
              style={{ maxHeight: 520 }} // 👈 limit height so it scrolls *inside* the card
              nestedScrollEnabled // 👈 required for Android nested scrolling
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {/* QR Payment Modal */}
      <QRPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={parseFloat(amount) || 0}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        title={t('wallet.addMoney')}
        description={t('wallet.scanQR')}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isVisible={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        availableBalance={walletBalance.unlocked_amount}
        withdrawDetails={withdrawDetails}
        onSuccess={handleWithdrawSuccess}
        onError={handleWithdrawError}
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
    paddingTop: 40,
    paddingBottom: 10,
  },
  balanceCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    padding: 20,
    marginBottom: 10,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 20,
  },
  balanceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#79ECE0',
    marginBottom: 20,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceItem: {
    flex: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  balanceItemLabel: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  balanceItemValue: {
    fontWeight: '600',
    color: '#C60000',
    fontSize: 16,
  },
  balanceItemValue2: {
    fontWeight: '600',
    color: '#00E400',
    fontSize: 16,
  },
  addMoneyCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    padding: 20,
    marginBottom: 20,
  },
  addMoneyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 20,
  },
  amountInputContainer: {
    marginBottom: 16,
  },
  amountInputContainerFocused: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  amountInput: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    color: 'white',
    borderWidth: 0,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#39FF1430',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  quickAmountText: {
    fontWeight: '600',
    color: '#39FF14',
    fontSize: 12,
  },
  proceedButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  proceedButtonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
  },
  proceedButtonText: {
    fontWeight: '600',
    color: 'white',
    fontSize: 15,
  },
  errorText: {
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
  },
  transactionsCard: {
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 0,
    padding: 10,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTransactionsText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positiveTransaction: {
    backgroundColor: '#22C55E',
  },
  negativeTransaction: {
    backgroundColor: '#EF4444',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionPurpose: {
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
    fontSize: 14,
  },
  transactionDate: {
    color: '#6B7280',
    fontSize: 11,
  },
  transactionRight: {
    alignItems: 'center',
  },
  transactionAmount: {
    fontWeight: '600',
    fontSize: 14,
  },
  positiveAmount: {
    color: '#10B981',
  },
  negativeAmount: {
    color: '#EF4444',
  },
});