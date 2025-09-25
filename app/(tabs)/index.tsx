import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  Plus,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import { SearchBar } from '@/components/SearchBar';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { useChatSocket } from '@/context/ChatSocketProvider';

const { width } = Dimensions.get('window');

interface ChatRoom {
  name: string;
  id: string;
  type: string;
  room_dp: string;
  blurhash: string;
  latest_message: string;
  latest_message_created_at: string;
  latest_message_created_by: string;
  auth_fullname: {
    fullname: string;
  };
  whatsub_room_user_mappings: Array<{
    user_id: string;
    auth_fullname: {
      dp: string;
      fullname: string;
    };
  }>;
  unseen_messages: Array<{
    unseen_message_count: number;
  }>;
}

export default function ChatListScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { socket, registerConsumer, unregisterConsumer } = useChatSocket();

  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'group' | 'private' | 'anonymous'>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pagination state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isEndReached, setIsEndReached] = useState(false);

  const LIMIT = 20;

  // Fetch updated chat data for a specific room
  const fetchUpdatedChat = async (roomId: string) => {
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            query MyQuery($user_id: uuid, $room_id: uuid) {
              __typename
              whatsub_rooms(where: {id: {_eq: $room_id}}) {
                __typename
                name
                id
                type
                room_dp
                blurhash
                latest_message
                latest_message_created_at
                latest_message_created_by
                auth_fullname {
                  __typename
                  fullname
                }
                whatsub_room_user_mappings(where: {whatsub_room: {type: {_nin: ["group", "pool"]}}, user_id: {_neq: $user_id}}) {
                  __typename
                  user_id
                  auth_fullname {
                    __typename
                    dp
                    fullname
                  }
                }
                unseen_messages: whatsub_room_user_mappings(where: {user_id: {_eq: $user_id}}) {
                  __typename
                  unseen_message_count
                }
              }
            }
          `,
          variables: {
            user_id: userId,
            room_id: roomId,
          },
        }),
      });

      const data = await response.json();
      const updatedRoom = data.data?.whatsub_rooms?.[0];
      
      if (updatedRoom) {
        setChats((prevChats) => {
          // Check if room already exists in the list
          const existingIndex = prevChats.findIndex((chat: ChatRoom) => chat.id === roomId);
          
          if (existingIndex !== -1) {
            // Update existing room
            const updatedChats = [...prevChats];
            updatedChats[existingIndex] = updatedRoom;
            
            // Sort by latest_message_created_at descending
            updatedChats.sort(
              (a, b) =>
                new Date(b.latest_message_created_at).getTime() -
                new Date(a.latest_message_created_at).getTime()
            );
            
            return updatedChats;
          } else {
            // Add new room to the list
            const newChats = [updatedRoom, ...prevChats];
            
            // Sort by latest_message_created_at descending
            newChats.sort(
              (a, b) =>
                new Date(b.latest_message_created_at).getTime() -
                new Date(a.latest_message_created_at).getTime()
            );
            
            return newChats;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching updated chat:', error);
    }
  };

  // Reference-counted socket lifecycle: register on focus, unregister on blur
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        await registerConsumer();
      })();

      return () => {
        if (!mounted) return;
        unregisterConsumer();
        mounted = false;
      };
    }, [registerConsumer, unregisterConsumer])
  );

  // Reset pagination and fetch chats when activeTab changes
  useEffect(() => {
    resetPagination();
    fetchChats(0, false);
  }, [activeTab]);

  // Refresh chats when screen comes into focus (after navigation)
  useFocusEffect(
    useCallback(() => {
      resetPagination();
      fetchChats(0, false);
    }, [activeTab])
  );

  // Socket listener: update chat list when messages arrive
  useEffect(() => {
    if (!socket) return;

    const handleSocketMessage = (data: any) => {
      const roomId = data;
      
      // Fetch updated chat data for the specific room
      if (roomId) {
        fetchUpdatedChat(roomId);
      }
    };

    const handleRefreshChatList = () => {
      // Refresh the entire chat list when requested
      resetPagination();
      fetchChats(0, false);
    };
    
    socket.on('message', handleSocketMessage);
    
    return () => {
      socket.off('message', handleSocketMessage);
    };
  }, [socket, activeTab]);

  const resetPagination = () => {
    setOffset(0);
    setHasMore(true);
    setIsEndReached(false);
  };

  const fetchChats = async (currentOffset = offset, isLoadMore = false) => {
    // Prevent multiple simultaneous requests
    if (isLoadMore && (isLoadingMore || !hasMore)) return;
    
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        showError('Please login again');
        return;
      }

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            query MyQuery($user_id: uuid, $limit: Int, $offset: Int, $type: [String!]) {
              __typename
              whatsub_rooms(where: {whatsub_room_user_mappings: {user_id: {_eq: $user_id}}, status: {_eq: "active"}, type: {_in: $type}}, limit: $limit, offset: $offset, order_by: {latest_message_created_at: desc}) {
                __typename
                name
                id
                type
                room_dp
                blurhash
                latest_message
                latest_message_created_at
                latest_message_created_by
                auth_fullname {
                  __typename
                  fullname
                }
                whatsub_room_user_mappings(where: {whatsub_room: {type: {_nin: ["group", "pool"]}}, user_id: {_neq: $user_id}}) {
                  __typename
                  user_id
                  auth_fullname {
                    __typename
                    dp
                    fullname
                  }
                }
                unseen_messages: whatsub_room_user_mappings(where: {user_id: {_eq: $user_id}}) {
                  __typename
                  unseen_message_count
                }
              }
            }
          `,
          variables: {
            user_id: userId,
            limit: LIMIT,
            offset: currentOffset,
            type: activeTab === 'All' ? ['group', 'private', 'anonymous'] : [activeTab],
          },
        }),
      });

      const data = await response.json();
      const newChats = data.data?.whatsub_rooms || [];

      // Check if there are more chats to load
      const hasMoreChats = newChats.length === LIMIT;
      setHasMore(hasMoreChats);

      if (isLoadMore) {
        // Append new chats to existing ones
        setChats(prevChats => {
          // Remove duplicates (in case of race conditions)
          const existingIds = new Set(prevChats.map((chat: ChatRoom) => chat.id));
          const uniqueNewChats = newChats.filter((chat: ChatRoom) => !existingIds.has(chat.id));
          return [...prevChats, ...uniqueNewChats];
        });
        setOffset(currentOffset + LIMIT);
      } else {
        // Replace existing chats
        setChats(newChats);
        setOffset(LIMIT);
      }

    } catch (error) {
      console.error('Error fetching chats:', error);
      showError('Failed to load chats');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    resetPagination();
    await fetchChats(0, false);
    setIsRefreshing(false);
  };

  const loadMoreChats = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      fetchChats(offset, true);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    if (isCloseToBottom && !isEndReached) {
      setIsEndReached(true);
      loadMoreChats();
    } else if (!isCloseToBottom && isEndReached) {
      setIsEndReached(false);
    }
  };

  const handleChatPress = (selectedChat: ChatRoom) => {
    // Update the unseen count to 0 immediately in the UI
    setChats(prevChats => 
      prevChats.map((chat: ChatRoom) => 
        chat.id === selectedChat.id 
          ? { ...chat, unseen_messages: [{ unseen_message_count: 0 }] }
          : chat
      )
    );

    router.push({
      pathname: '/(tabs)/chat/conversation',
      params: {
        roomId: selectedChat.id,
      },
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;

    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return 'yesterday';
    }

    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getUnseenCount = (chat: ChatRoom) => {
    return chat.unseen_messages[0]?.unseen_message_count || 0;
  };

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;

    const q = searchQuery.toLowerCase();
    return chats.filter((chat: ChatRoom) => {
      const name = String(chat.whatsub_room_user_mappings?.[0]?.auth_fullname?.fullname) || '';
      const latest = chat.latest_message || '';
      return (
        name.toLowerCase().includes(q) || latest.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, chats]);

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#6366F1" />
        <Text style={styles.loadingMoreText}>Loading more chats...</Text>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('chat.messages')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowSearch((s) => !s)}
          >
            <Search size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton}>
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <SearchBar
          placeholder={t('chat.searchConversations')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      )}

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {(['All', 'group', 'private', 'anonymous'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab === 'All' ? t('common.all') : t(`chat.${tab}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.chatList}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chatListContent}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}></Text>
          </View>
        ) : filteredChats.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MessageSquare size={32} color="#6366F1" />
            </View>
            <Text style={styles.emptyTitle}>
              {t('chat.noConversations')}
            </Text>
          </View>
        ) : (
          <View style={styles.chatListContent}>
            {filteredChats.map((chat: ChatRoom) => {
              const unseenCount = getUnseenCount(chat);

              return (
                <TouchableOpacity
                  key={chat.id}
                  style={styles.chatItem}
                  onPress={() => handleChatPress(chat)}
                  activeOpacity={0.7}
                >
                  <View style={styles.chatItemContent}>
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatarWrapper}>
                        <Image
                          source={{ 
                            uri: chat.type === 'group' 
                              ? chat.room_dp 
                              : String(chat.whatsub_room_user_mappings[0]?.auth_fullname?.dp) || chat.room_dp
                          }}
                          style={styles.avatar}
                          defaultSource={require('@/assets/images/icon.png')}
                        />
                      </View>
                    </View>

                    <View style={styles.chatInfo}>
                      <View style={styles.chatHeader}>
                        <Text style={styles.chatName} numberOfLines={1}>
                          {chat.type === 'group' 
                            ? chat.name 
                            : String(chat.whatsub_room_user_mappings[0]?.auth_fullname?.fullname) || 'Unknown'}
                        </Text>
                        <View style={styles.chatMeta}>
                          <Text style={styles.chatTime}>
                            {formatTime(chat.latest_message_created_at)}
                          </Text>
                          {unseenCount > 0 && (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadCount}>
                                {unseenCount > 9 ? '9+' : unseenCount}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.lastMessage,
                          unseenCount > 0 && styles.unreadMessage,
                        ]}
                        numberOfLines={1}
                      >
                        {chat.latest_message || 'No messages yet'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            
            {renderFooter()}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    fontWeight: '800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    fontWeight: '600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  tabs: {
    borderRadius: 12,
    gap: 3,
    paddingBottom: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 70,
    marginRight: 6,
    backgroundColor: 'rgba(31,41,55,0.3)',
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeTabText: {
    color: 'white',
  },
  chatList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  chatListContent: {
    paddingBottom: 30,
  },
  chatItem: {},
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 14,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    padding: 1.5,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  chatName: {
    fontWeight: '600',
    color: 'white',
    flex: 1,
    fontSize: 16,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatTime: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    fontWeight: '600',
    color: 'white',
    fontSize: 10,
  },
  lastMessage: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  unreadMessage: {
    color: 'white',
    fontWeight: '500',
  },
});