import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  CreditCard, 
  ArrowDown, 
  ArrowUp,
  Calendar,
  IndianRupee,
  Clock
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface DailyTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  user_name?: string;
  transaction_type: 'credit' | 'debit';
}

interface TransactionResponse {
  daily_transactions: DailyTransaction[];
}

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const params = useLocalSearchParams();
  const { roomId } = params;
  
  const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const LIMIT = 20;

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken && roomId) {
      fetchTransactions(0, true);
    }
  }, [userId, authToken, roomId]);

  const initializeUser = async () => {
    try {
      const id = await storage.getUserId();
      const token = await storage.getAuthToken();
      
      setUserId(id);
      setAuthToken(token);
    } catch (error) {
      console.error('Error initializing user:', error);
      showError('Failed to initialize user data');
    }
  };

  const fetchTransactions = async (newOffset: number = 0, isInitial: boolean = false) => {
    if (!authToken || !roomId) return;
    
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query MyQuery($room_id: uuid!, $limit: Int, $offset: Int) {
              __typename
              w_getDailyTransactions(request: {room_id: $room_id, limit: $limit, offset: $offset}) {
                __typename
                daily_transactions
              }
            }
          `,
          variables: {
            room_id: roomId,
            limit: LIMIT,
            offset: newOffset
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error fetching transactions:', data.errors);
        showError('Failed to load transactions');
        return;
      }
      
      const fetchedTransactions = data.data?.w_getDailyTransactions?.daily_transactions || [];
      
      if (isInitial) {
        setTransactions(fetchedTransactions);
      } else {
        setTransactions(prev => [...prev, ...fetchedTransactions]);
      }
      
      setHasMore(fetchedTransactions.length === LIMIT);
      setOffset(newOffset);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showError('Failed to load transactions');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    setOffset(0);
    setHasMore(true);
    await fetchTransactions(0, true);
    setIsRefreshing(false);
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const newOffset = offset + LIMIT;
      fetchTransactions(newOffset, false);
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/chat/group-info');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getTransactionIcon = (transaction: DailyTransaction) => {
    if (transaction.transaction_type === 'credit') {
      return <ArrowDown size={18} color="#10B981" />;
    } else {
      return <ArrowUp size={18} color="#EF4444" />;
    }
  };

  const renderTransaction = ({ item, index }: { item: DailyTransaction; index: number }) => {
    const isCredit = item.transaction_type === 'credit';
    
    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <View style={[
            styles.transactionIconContainer,
            isCredit ? styles.creditTransaction : styles.debitTransaction
          ]}>
            {getTransactionIcon(item)}
          </View>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionDescription} numberOfLines={2}>
              {item.description || 'Transaction'}
            </Text>
            <Text style={styles.transactionTime}>
              {formatTime(item.created_at)}
            </Text>
            {item.user_name && (
              <Text style={styles.transactionUser}>
                by {item.user_name}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.transactionRight}>
          <Text style={[
            styles.transactionAmount,
            isCredit ? styles.creditAmount : styles.debitAmount
          ]}>
            {isCredit ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
          </Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#6366F1" />
        <Text style={styles.loadingFooterText}>Loading more transactions...</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <CreditCard size={48} color="#6366F1" />
      </View>
      <Text style={styles.emptyTitle}>No Transactions</Text>
      <Text style={styles.emptySubtitle}>
        Daily transactions will appear here
      </Text>
    </View>
  );

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = formatDate(transaction.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, DailyTransaction[]>);

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transactions</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Transactions</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {transactions.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.transactionsContainer}>
            {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
              <View key={date} style={styles.dateGroup}>
                {/* Date Header */}
                <View style={styles.dateHeader}>
                  <Calendar size={16} color="#9CA3AF" />
                  <Text style={styles.dateText}>{date}</Text>
                </View>
                
                {/* Transactions for this date */}
                <View style={styles.dateTransactions}>
                  {dayTransactions.map((transaction, index) => (
                    <View key={`${transaction.id}-${index}`}>
                      {renderTransaction({ item: transaction, index })}
                    </View>
                  ))}
                </View>
              </View>
            ))}
            
            {/* Load More Button */}
            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color="#6366F1" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            )}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 16,
  },
  transactionsContainer: {
    paddingHorizontal: 20,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  dateTransactions: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  creditTransaction: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  debitTransaction: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  transactionUser: {
    fontSize: 12,
    color: '#6366F1',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  creditAmount: {
    color: '#10B981',
  },
  debitAmount: {
    color: '#EF4444',
  },
  loadMoreButton: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingFooterText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});