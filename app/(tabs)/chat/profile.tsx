import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  X, 
  Star, 
  MessageSquare, 
  Mail, 
  Phone,
  Clock
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

interface UserInfo {
  dp: string;
  email: string;
  fullname: string;
  last_active: string;
  phone: string;
}

interface CommonGroup {
  id: string;
  name: string;
  room_dp: string;
}

interface UserSubscription {
  plan: string;
  service_image_url: string;
  service_name: string;
  service_id: string;
  type: string;
}

interface FriendProfile {
  info: UserInfo | null;
  commonGroups: CommonGroup[];
  subscriptions: UserSubscription[];
}

export const unstable_settings = {
    // Hides this route from deep linking and tab navigation
    href: null,
};

export default function ProfileScreen() {
  const params = useLocalSearchParams();
  const { friendId } = params;
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  const [friendProfile, setFriendProfile] = useState<FriendProfile>({
    info: null,
    commonGroups: [],
    subscriptions: []
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (friendId) {
      fetchFriendProfile(friendId as string);
    }
  }, [friendId]);

  const fetchFriendProfile = async (friendUserId: string) => {
    const userId = await storage.getUserId();
    const authToken = await storage.getAuthToken();
    
    if (!userId || !authToken) {
      setError('Authentication required');
      return;
    }
    
    setIsLoadingProfile(true);
    setError(null);
    
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query MyQuery($user_id: uuid = "", $friends_user_id: uuid = "") {
              __typename
              getUserInfo(request: {friends_user_id: $friends_user_id, user_id: $user_id}) {
                __typename
                dp
                email
                fullname
                last_active
                phone
              }
              getUserCommonGroups(request: {friends_user_id: $friends_user_id, user_id: $user_id}) {
                __typename
                id
                name
                room_dp
              }
              getUserPublicSubscriptions(request: {friends_user_id: $friends_user_id, user_id: $user_id}) {
                __typename
                plan
                service_image_url
                service_name
                service_id
                type
              }
            }
          `,
          variables: {
            user_id: userId,
            friends_user_id: friendUserId
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'Failed to fetch profile');
      }
      
      setFriendProfile({
        info: data.data.getUserInfo,
        commonGroups: data.data.getUserCommonGroups || [],
        subscriptions: data.data.getUserPublicSubscriptions || []
      });
    } catch (err) {
      console.error('Error fetching friend profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleClose = () => {
    router.back();
  };

  const handleRetry = () => {
    if (friendId) {
      fetchFriendProfile(friendId as string);
    }
  };

  if (isLoadingProfile) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to Load Profile</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <>
      <LinearGradient
        colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarGradient}>
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{ 
                        uri: friendProfile.info?.dp || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2'
                      }}
                      style={styles.avatar}
                      defaultSource={require('@/assets/images/icon.png')}
                    />
                  </View>
                </View>
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {friendProfile?.info?.fullname || 'Unknown User'}
                </Text>
                {friendProfile.info?.last_active && (
                  <View style={styles.lastActiveContainer}>
                    <Clock size={16} color="#9CA3AF" />
                    <Text style={styles.lastActiveText}>
                      Last Active: {formatLastActive(friendProfile.info.last_active)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Contact Information */}
            {(friendProfile.info?.email || friendProfile.info?.phone) && (
              <View style={styles.contactGrid}>
                {friendProfile.info?.email && (
                  <View style={styles.contactCard}>
                    <View style={styles.contactIcon}>
                      <Mail size={20} color="#6366F1" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue}>{friendProfile.info.email}</Text>
                    </View>
                  </View>
                )}
                
                {friendProfile.info?.phone && (
                  <View style={styles.contactCard}>
                    <View style={styles.contactIcon}>
                      <Phone size={20} color="#10B981" />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Phone Number</Text>
                      <Text style={styles.contactValue}>{friendProfile.info.phone}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Subscriptions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Active Subscriptions</Text>
            </View>
            
            {friendProfile.subscriptions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No public subscriptions</Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subscriptionsScrollContent}
                style={styles.subscriptionsScroll}
              >
                {friendProfile.subscriptions.map((subscription, index) => (
                  <View key={index} style={styles.subscriptionCard}>
                    <View style={styles.subscriptionLogo}>
                      <Image
                        source={{ uri: subscription.service_image_url }}
                        style={styles.subscriptionImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.subscriptionInfo}>
                      <Text style={styles.subscriptionName}>{subscription.service_name}</Text>
                      <Text style={styles.subscriptionPlan}>{subscription.plan}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Common Groups Section */}
          {friendProfile.commonGroups.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MessageSquare size={20} color="#6366F1" />
                <Text style={styles.sectionTitle}>Common Groups</Text>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.groupsScrollContent}
                style={styles.groupsScroll}
              >
                {friendProfile.commonGroups.map((group) => (
                  <View key={group.id} style={styles.groupCard}>
                    <View style={styles.groupLogo}>
                      <Image
                        source={{ uri: group.room_dp }}
                        style={styles.groupImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.groupName} numberOfLines={2}>{group.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366F1',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  lastActiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastActiveText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  contactGrid: {
    gap: 16,
  },
  contactCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  subscriptionsScroll: {
    marginHorizontal: -20,
  },
  subscriptionsScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  subscriptionCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    width: 140,
    alignItems: 'center',
  },
  subscriptionLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'transparent',
    padding: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  subscriptionImage: {
    width: '100%',
    height: '100%',
  },
  subscriptionInfo: {
    alignItems: 'center',
  },
  subscriptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  subscriptionPlan: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  groupsScroll: {
    marginHorizontal: -20,
  },
  groupsScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  groupCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    width: 120,
    alignItems: 'center',
  },
  groupLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'white',
    padding: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupImage: {
    width: '100%',
    height: '100%',
  },
  groupName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    textAlign: 'center',
    lineHeight: 18,
  },
});