import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  Users, 
  Globe,
  Info,
  CircleAlert as AlertCircle
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface SharedGroup {
  id: string;
  status: string;
  is_public: boolean;
  name: string;
  room_dp: string;
  blurhash: string;
}

interface PublicGroupSetting {
  is_public: boolean;
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function SharedSubscriptionSettingsScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([]);
  const [globalPublicSetting, setGlobalPublicSetting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingGroups, setUpdatingGroups] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken) {
      fetchData();
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

  const fetchData = async () => {
    if (!userId || !authToken) return;
    
    setIsLoading(true);
    try {
      await Promise.all([
        fetchSharedGroups(),
        fetchGlobalPublicSetting() 
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSharedGroups = async () => {
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
            query MyQuery($user_id: uuid, $limit: Int, $offset: Int) {
              __typename
              whatsub_rooms(where: {user_id: {_eq: $user_id}, status: {_eq: "active"}, type: {_eq: "group"}}, order_by: {created_at: desc}, limit: $limit, offset: $offset) {
                __typename
                id
                status
                is_public
                name
                room_dp
                blurhash
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
        console.error('Error fetching shared groups:', data.errors);
        showError('Failed to load shared groups');
        return;
      }
      
      setSharedGroups(data.data?.whatsub_rooms || []);
    } catch (error) {
      console.error('Error fetching shared groups:', error);
      showError('Failed to load shared groups');
    }
  };

  const fetchGlobalPublicSetting = async () => {
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
            query Query($user_id: uuid) {
              __typename
              whatsub_store_public_groups(where: {user_id: {_eq: $user_id}}) {
                __typename
                is_public
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
        console.error('Error fetching global public setting:', data.errors);
        return;
      }
      
      const setting = data.data?.whatsub_store_public_groups?.[0];
      if (setting) {
        setGlobalPublicSetting(setting.is_public);
      }
    } catch (error) {
      console.error('Error fetching global public setting:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const handleGlobalToggle = async (value: boolean) => {
    if (!userId || !authToken) return;
    
    setGlobalPublicSetting(value);
    
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation UpdateGlobalPublicSetting($user_id: uuid!, $is_public: Boolean!) {
              __typename
              insert_whatsub_store_public_groups(objects: {user_id: $user_id, is_public: $is_public}, on_conflict: {constraint: whatsub_store_public_groups_user_id_key, update_columns: [is_public]}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_id: userId,
            is_public: value
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error updating global setting:', data.errors);
        setGlobalPublicSetting(!value); // Revert on error
        showError('Failed to update global setting');
        return;
      }
      
      if (data.data?.insert_whatsub_store_public_groups?.affected_rows > 0) {
        showSuccess(value ? 'All groups are now public by default' : 'All groups are now private by default');
      }
    } catch (error) {
      console.error('Error updating global setting:', error);
      setGlobalPublicSetting(!value); // Revert on error
      showError('Failed to update global setting');
    }
  };

  const handleGroupToggle = (groupId: string) => {
    // Navigate to group-info page for individual group settings
    router.push({
      pathname: '/(tabs)/chat/group-info',
      params: {
        roomId: groupId,
        adminId: userId
      }
    });
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
          <Text style={styles.headerTitle}>Shared Subscriptions</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading shared subscriptions...</Text>
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
          <Text style={styles.headerTitle}>Shared Subscriptions</Text>
          {/* <Switch
            value={globalPublicSetting}
            onValueChange={handleGlobalToggle}
            trackColor={{ false: '#374151', true: '#6366F1' }}
            thumbColor={globalPublicSetting ? '#FFFFFF' : '#9CA3AF'}
            ios_backgroundColor="#374151"
          /> */}
        </View>
        
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
        

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Groups with toggle 'ON' are public, switch toggle to 'OFF' to private. Private groups will not be shown in the marketplace.
          </Text>
        </View>

        {/* Shared Groups List */}
        <View style={styles.groupsContainer}>
          {sharedGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users size={48} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>No Shared Subscriptions</Text>
              <Text style={styles.emptySubtitle}>
                Create shared subscription groups to manage their visibility here
              </Text>
            </View>
          ) : (
            sharedGroups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupItem}
                onPress={() => handleGroupToggle(group.id)}
                disabled={updatingGroups.has(group.id)}
              >
                <View style={styles.groupContent}>
                  <View style={styles.groupLogoContainer}>
                    <Image
                      source={{ uri: group.room_dp }}
                      style={styles.groupLogo}
                      resizeMode="contain"
                    />
                  </View>
                  
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName} numberOfLines={2}>
                      {group.name}
                    </Text>
                  </View>
                  
                  <View style={styles.groupToggle}>
                    {updatingGroups.has(group.id) ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <Switch
                        value={group.is_public}
                        onValueChange={() => handleGroupToggle(group.id)}
                        trackColor={{ false: '#374151', true: '#6366F1' }}
                        thumbColor={group.is_public ? '#FFFFFF' : '#9CA3AF'}
                        ios_backgroundColor="#374151"
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  descriptionContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: '#93C5FD',
    lineHeight: 20,
  },
  groupsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  groupItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  groupLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  groupLogo: {
    width: 36,
    height: 36,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    lineHeight: 22,
  },
  groupToggle: {
    marginLeft: 12,
  },
  infoSection: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 20,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  infoContent: {
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
});