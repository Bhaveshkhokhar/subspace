import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  Gift,
  Tag,
  Calendar,
  Filter,
  Search,
  ChevronRight,
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle,
  Ticket,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import { SearchBar } from '@/components/SearchBar';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface CouponAllocation {
  id: string;
  coupon: string;
  expiring_at: string;
  updated_at: string;
  allocated_at: string;
  avail_conditions: string;
  action_name: string;
  action: any;
  whatsub_plan: {
    plan_name: string;
    whatsub_service: {
      service_name: string;
    };
  } | null;
  pin: string;
  amount: number;
  whatsub_service: {
    service_name: string;
    flexipay_unit: string;
  } | null;
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function OrderHistoryScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  const [orders, setOrders] = useState<CouponAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken) {
      fetchOrders();
    }
  }, [userId, authToken]);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/account');
    }
  };

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

  const fetchOrders = async () => {
    if (!userId || !authToken) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query getCoupons($user_id: uuid, $limit: Int, $offset: Int) {
              __typename
              whatsub_coupon_allocation(where: {user_id: {_eq: $user_id}}, order_by: {updated_at: desc_nulls_first}, limit: $limit, offset: $offset) {
                __typename
                id
                coupon
                expiring_at
                updated_at
                allocated_at
                avail_conditions
                action_name
                action
                whatsub_plan {
                  __typename
                  plan_name
                  whatsub_service {
                    __typename
                    service_name
                  }
                }
                pin
                amount
                whatsub_service {
                  __typename
                  service_name
                  flexipay_unit
                }
              }
            }
          `,
          variables: {
            user_id: userId,
            limit: 20,
            offset: 0
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error fetching orders:', data.errors);
        showError('Failed to load order history');
        return;
      }
      
      setOrders(data.data?.whatsub_coupon_allocation || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showError('Failed to load order history');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const getOrderStatus = (order: CouponAllocation) => {
    const now = new Date();
    const expiryDate = new Date(order.expiring_at);
    
    if (expiryDate < now) {
      return { status: 'expired', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
    }
    
    if (order.action_name === 'used') {
      return { status: 'used', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' };
    }
    
    return { status: 'active', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' };
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(order =>
        order.coupon.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.whatsub_plan?.whatsub_service?.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.whatsub_service?.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.action_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  const handleCopyText = async (text: string, label: string) => {
    try {
      if (Platform.OS === 'web') {
        // Web clipboard API
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      } else {
        // Native platforms using Clipboard API
        await Clipboard.setStringAsync(text);
      }
      showSuccess(`${label} copied to clipboard`);
    } catch (error) {
      console.error('Error copying text:', error);
      showError(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const isOrderExpanded = (orderId: string) => {
    return expandedOrders.has(orderId);
  };

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
          <Text style={styles.headerTitle}>Order History</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading order history...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Search size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <SearchBar
            placeholder="Search orders, services, coupons..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            // style={{ flex: 1 }}
          />
        )}


        {/* Orders List */}
        <View style={styles.ordersContainer}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Package size={48} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No orders found' : 'No order history'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Your coupon and subscription orders will appear here'
                }
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const status = getOrderStatus(order);
              
              const serviceName = order.whatsub_plan?.whatsub_service?.service_name || 
                                order.whatsub_service?.service_name || 
                                'Unknown Service';
              
              return (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.orderItem,
                    isOrderExpanded(order.id) && styles.orderItemExpanded
                  ]}
                  activeOpacity={0.7}
                >
                  {/* Header Section */}
                  <View style={styles.orderHeader}>
                    <Text style={styles.serviceName}>{serviceName}</Text>
                    <Text style={styles.orderAmount}> 
                      ₹{order.amount.toFixed(2)}
                    </Text>
                  </View>

                  {/* Date Information */}
                  <View style={styles.dateSection}>
                    <View style={styles.dateItem}>
                      <Package size={12} color="#9CA3AF" />
                      <Text style={styles.dateText}>
                        Purchased on {formatDate(order.allocated_at)}
                      </Text>
                    </View>
                    <View style={styles.dateItem}>
                      <Clock size={12} color="#F59E0B" />
                      <Text style={styles.dateText}>
                        Expires on {formatDate(order.expiring_at)}
                      </Text>
                    </View>
                  </View>

                  {/* Dashed Divider */}
                  <View style={styles.dashedDivider} />

                  {/* Coupon and PIN Section */}
                  <View style={styles.codesSection}>
                    <TouchableOpacity
                      style={styles.codeContainer}
                      onPress={() => handleCopyText(order.coupon, 'Coupon code')}
                    >
                      <Text style={styles.codeText}>{order.coupon}</Text>
                      <Copy size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    {order.pin && (
                      <TouchableOpacity
                        style={styles.codeContainer}
                        onPress={() => handleCopyText(order.pin, 'PIN')}
                      >
                        <Text style={styles.codeText}>{order.pin}</Text>
                        <Copy size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                      style={styles.expandButton}
                      onPress={() => toggleOrderExpansion(order.id)}
                    >
                      {isOrderExpanded(order.id) ? (
                        <ChevronUp size={20} color="#9CA3AF" />
                      ) : (
                        <ChevronDown size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Expanded Details */}
                  {isOrderExpanded(order.id) && (
                    <View style={styles.expandedDetails}>
                     {/* Purchase Time */}
                     <View style={styles.purchaseTimeContainer}>
                       <Text style={styles.purchaseTimeText}>
                         ( Purchased on {formatDate(order.allocated_at)}, {formatTime(order.allocated_at)} )
                       </Text>
                     </View>
                     
                     {/* Avail Conditions */}
                     {order.avail_conditions && (
                       <View style={styles.conditionsContainer}>
                         <Text style={styles.conditionsText}>
                           {order.avail_conditions}
                         </Text>
                       </View>
                     )}
                     
                      <View style={styles.statusContainer}>
                        <View style={[
                          styles.statusIndicator,
                          { backgroundColor: status.color }
                        ]} />
                        <Text style={[styles.statusLabel, { color: status.color }]}>
                          {status.status.toUpperCase()}
                        </Text>
                      </View>
                      
                      {order.whatsub_plan?.plan_name && (
                        <View style={styles.planInfo}>
                          <Text style={styles.planLabel}>Plan:</Text>
                          <Text style={styles.planValue}>{order.whatsub_plan.plan_name}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 14,
  },
  backButton: {
    width: 32,
    height: 32,
    fontWeight: '800',
    backgroundColor: 'transparent',
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
    width: 32,
    height: 32,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
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
  ordersContainer: {
    paddingHorizontal: 10,
    marginBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    paddingHorizontal: 20,
  },
  orderItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginBottom: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  orderItemExpanded: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  dateSection: {
    marginBottom: 16,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  dashedDivider: {
    height: 1,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  codesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    fontFamily: 'monospace',
  },
  expandButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  planLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  planValue: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  purchaseTimeContainer: {
    marginBottom: 16,
  },
  purchaseTimeText: {
    fontSize: 14,
    color: '#06B6D4',
    textAlign: 'left',
  },
  conditionsContainer: {
    marginBottom: 16,
  },
  conditionsText: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 18,
  },
  summarySection: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 20,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: (width - 80) / 2,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});