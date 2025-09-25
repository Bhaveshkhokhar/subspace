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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Users,
  Phone,
  UserPlus
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import { SearchBar } from '@/components/SearchBar';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import * as Contacts from 'expo-contacts';

const { width } = Dimensions.get('window');

interface Friend {
  dp: string;
  fullname: string;
  id: string;
  phone: string;
  whatsub_users_subscriptions: any[];
}

interface PhoneContact {
  id: string;
  name: string;
  phoneNumbers?: Array<{
    number?: string;
    digits?: string;
  }>;
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function FriendsScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<'subspace' | 'phone'>('subspace');

  // SubSpace friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  // Phone contacts state
  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [hasContactsPermission, setHasContactsPermission] = useState(false);
  const [contactsPermissionRequested, setContactsPermissionRequested] = useState(false);

  // Common state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken && activeTab === 'subspace') {
      fetchFriends();
    }
  }, [userId, authToken, activeTab]);

  useEffect(() => {
    if (activeTab === 'phone') {
      checkContactsPermission();
    }
  }, [activeTab]);

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

  const fetchFriends = async () => {
    if (!userId || !authToken) return;

    setIsLoadingFriends(true);
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            query getContacts($user_id: uuid!) {
              __typename
              w_getContacts(request: {user_id: $user_id}) {
                __typename
                dp
                fullname
                id
                phone
                whatsub_users_subscriptions
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
        console.error('Error fetching friends:', data.errors);
        showError('Failed to load friends');
        return;
      }

      setFriends(data.data?.w_getContacts || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      showError('Failed to load friends');
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const checkContactsPermission = async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      setHasContactsPermission(status === 'granted');

      if (status === 'granted') {
        fetchPhoneContacts();
      }
    } catch (error) {
      console.error('Error checking contacts permission:', error);
    }
  };

  const requestContactsPermission = async () => {
    try {
      setContactsPermissionRequested(true);
      const { status } = await Contacts.requestPermissionsAsync();
      setHasContactsPermission(status === 'granted');

      if (status === 'granted') {
        fetchPhoneContacts();
      } else {
        showError('Contacts permission is required to view your phone contacts');
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      showError('Failed to request contacts permission');
    }
  };

  const fetchPhoneContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      if (data) {
        const formattedContacts = data
          .filter(contact => contact.name && contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .map(contact => ({
            id: contact.id || Math.random().toString(),
            name: contact.name || 'Unknown',
            phoneNumbers: contact.phoneNumbers || []
          }));

        setPhoneContacts(formattedContacts);
      }
    } catch (error) {
      console.error('Error fetching phone contacts:', error);
      showError('Failed to load phone contacts');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'subspace') {
      await fetchFriends();
    } else if (activeTab === 'phone' && hasContactsPermission) {
      await fetchPhoneContacts();
    }
    setIsRefreshing(false);
  };

  const handleChatWithFriend = async (friend: Friend) => {
    try {
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        showError('Please login to start a chat');
        return;
      }

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation createPrivateRoom($user_id: uuid!, $other_id: uuid!) {
              __typename
              createAnonymousRoom(request: {other_id: $other_id, user_id: $user_id}) {
                __typename
                id
              }
            }
          `,
          variables: {
            user_id: userId,
            other_id: friend.id
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        showError('Failed to create chat room');
        return;
      }

      const roomId = data.data?.createAnonymousRoom?.id;
      if (roomId) {
        router.push({
          pathname: '/(tabs)/chat/conversation',
          params: {
            roomId: roomId
          }
        });
      } else {
        showError('Failed to create chat room');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      showError('Failed to create chat room');
    }
  };

  const filteredFriends = friends.filter(friend =>
    !searchQuery ||
    friend.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.phone.includes(searchQuery)
  );

  const filteredContacts = phoneContacts.filter(contact =>
    !searchQuery ||
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumbers?.some(phone =>
      phone.number?.includes(searchQuery) || phone.digits?.includes(searchQuery)
    )
  );

  const renderSubSpaceTab = () => {
    if (isLoadingFriends) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      );
    }

    if (filteredFriends.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['#06B6D4', '#10B981']}
              style={styles.emptyIcon}
            >
              <View style={styles.emptyIconFace}>
                <View style={styles.emptyIconEyes}>
                  <View style={styles.emptyIconEye} />
                  <View style={styles.emptyIconEye} />
                </View>
                <View style={styles.emptyIconSmile} />
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No friends as of now!</Text>
        </View>
      );
    }

    return (
      <View style={styles.friendsList}>
        {filteredFriends.map((friend) => (
          <View key={friend.id} style={styles.friendItem}>
            <View style={styles.friendContent}>
              <View style={styles.friendAvatarContainer}>
                <Image
                  source={{
                    uri: friend.dp || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2'
                  }}
                  style={styles.friendAvatar}
                  defaultSource={require('@/assets/images/icon.png')}
                />
              </View>

              <View style={styles.friendInfo}>
                <Text style={styles.friendName} numberOfLines={1}>
                  {friend.fullname}
                </Text>
                <Text style={styles.friendPhone} numberOfLines={1}>
                  {friend.phone}
                </Text>
                <Text style={styles.friendSubscriptions}>
                  {friend.whatsub_users_subscriptions?.length || 0} subscriptions
                </Text>
              </View>

              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => handleChatWithFriend(friend)}
              >
                <MessageSquare size={18} color="#6366F1" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPhoneTab = () => {
    if (!hasContactsPermission) {
      return (
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <View style={styles.permissionIcon}>
              <View style={styles.contactBookIcon}>
                <View style={styles.contactBookCover} />
                <View style={styles.contactBookPages} />
                <View style={styles.contactBookPerson}>
                  <View style={styles.personHead} />
                  <View style={styles.personBody} />
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.permissionTitle}>Allow your contacts</Text>
          <Text style={styles.permissionDescription}>
            We will need your contacts to give you better experience.
          </Text>

          <TouchableOpacity
            style={styles.allowButton}
            onPress={requestContactsPermission}
            disabled={contactsPermissionRequested}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.allowButtonGradient}
            >
              {contactsPermissionRequested ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.allowButtonText}>Sure, I'd Like that</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notNowButton}
            onPress={() => setActiveTab('subspace')}
          >
            <Text style={styles.notNowText}>Not now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isLoadingContacts) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      );
    }

    if (filteredContacts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <View style={styles.emptyPhoneIcon}>
              <Phone size={32} color="#6366F1" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No contacts found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try adjusting your search' : 'Your phone contacts will appear here'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.contactsList}>
        {filteredContacts.map((contact) => (
          <View key={contact.id} style={styles.contactItem}>
            <View style={styles.contactContent}>
              <View style={styles.contactAvatarContainer}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactInitial}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactName} numberOfLines={1}>
                  {contact.name}
                </Text>
                {contact.phoneNumbers && contact.phoneNumbers[0] && (
                  <Text style={styles.contactPhone} numberOfLines={1}>
                    {contact.phoneNumbers[0].number || contact.phoneNumbers[0].digits}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => showSuccess('Invite feature coming soon')}
              >
                <UserPlus size={18} color="#10B981" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Friends</Text>
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
          placeholder={activeTab === 'subspace' ? "Search friends..." : "Search contacts..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ flex: 1 }}
        />
      )}

      {/* Tab Navigation */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'subspace' && styles.activeTab
          ]}
          onPress={() => setActiveTab('subspace')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'subspace' && styles.activeTabText
          ]}>
            SUBSPACE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'phone' && styles.activeTab
          ]}
          onPress={() => setActiveTab('phone')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'phone' && styles.activeTabText
          ]}>
            PHONE
          </Text>
        </TouchableOpacity>
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
        {/* Tab Content */}
        {activeTab === 'subspace' ? renderSubSpaceTab() : renderPhoneTab()}
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
    paddingBottom: 20,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyIconFace: {
    alignItems: 'center',
  },
  emptyIconEyes: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  emptyIconEye: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1F2937',
  },
  emptyIconSmile: {
    width: 32,
    height: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: '#1F2937',
  },
  emptyPhoneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  friendsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  friendItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  friendAvatarContainer: {
    marginRight: 16,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  friendPhone: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  friendSubscriptions: {
    fontSize: 12,
    color: '#6366F1',
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  contactsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  contactItem: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  contactAvatarContainer: {
    marginRight: 16,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  permissionIconContainer: {
    marginBottom: 40,
  },
  permissionIcon: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBookIcon: {
    position: 'relative',
    width: 80,
    height: 100,
  },
  contactBookCover: {
    position: 'absolute',
    width: 80,
    height: 100,
    backgroundColor: '#E5B4B4',
    borderRadius: 8,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  contactBookPages: {
    position: 'absolute',
    right: 8,
    top: 4,
    width: 4,
    height: 92,
    backgroundColor: '#F87171',
    borderRadius: 2,
  },
  contactBookPerson: {
    position: 'absolute',
    top: 25,
    left: 20,
    alignItems: 'center',
  },
  personHead: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#374151',
    marginBottom: 4,
  },
  personBody: {
    width: 20,
    height: 24,
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionDescription: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  allowButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  allowButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  notNowButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  notNowText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});