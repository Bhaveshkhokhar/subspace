import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
  Keyboard,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Send,
  EllipsisVertical,
  Paperclip,
  Smile,
  Loader,
  Trash2,
  Phone,
  Info,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import { useChatSocket } from '@/context/ChatSocketProvider';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_TAB_BAR_STYLE } from '@/constants/tabBarStyles';
import CallUserModal from '@/components/CallUserModal';
import WhatsappMessageModal from '@/components/WhatsappMessageModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  message: string;
  options: any;
  created_at: string;
  from_user_id: string;
  type: string;
  from_user_fullname: {
    fullname: string;
  };
  click_type: string;
  click_text: string;
  click_data: any;
  is_seen?: boolean;
}

interface GroupMember {
  id: string;
  isGroupInfoRead: boolean;
  auth_fullname: {
    fullname: string;
    dp: string;
    id: string;
    last_active: string;
    whatsub_public_key: {
      public_key: string;
    } | null;
  };
  whatsub_group_credential: {
    credentials: string;
  } | null;
}

interface ChatDetails {
  id: string;
  name: string;
  type: string;
  is_public: boolean;
  user_id: string;
  room_dp: string;
  details: string;
  whatsub_users_subscriptions: Array<{
    id: string;
    expiry_image: string;
    whatsub_plan: {
      admin_conditions: string;
    };
  }>;
  whatsub_room_user_mappings: GroupMember[];
}

interface QuickReply {
  message: string;
  shortcut: string;
}

export const unstable_settings = {
  href: null,
};

export default function ConversationScreen() {
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { roomId } = params as {
    roomId?: string;
  };

  const { socket, registerConsumer, unregisterConsumer } = useChatSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState<string | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null);
  const [isLoadingChatDetails, setIsLoadingChatDetails] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [hasMarkedAsSeen, setHasMarkedAsSeen] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [currentUserMapping, setCurrentUserMapping] = useState<GroupMember | null>(null);
  const [suggestions, setSuggestions] = useState<QuickReply[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

  // Pagination states
  const [messageOffset, setMessageOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Scroll management
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const scrollToBottomTimeoutRef = useRef<number | null>(null);

  // Keyboard states
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const navigation = useNavigation();

  // Replace useEffect with useFocusEffect
  useFocusEffect(
    useCallback(() => {
      // Hide tab bar when screen comes into focus
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' }
      });

      // Show tab bar when screen loses focus
      return () => {
        navigation.getParent()?.setOptions({
          tabBarStyle: DEFAULT_TAB_BAR_STYLE
        });
      };
    }, [navigation])
  );

  useEffect(() => {
    initializeUser();
  }, []);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, Platform.OS === 'ios' ? 50 : 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, Platform.OS === 'ios' ? 50 : 50);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  const initializeUser = async () => {
    const id = await storage.getUserId();
    setUserId(id);
    const isBlocked = await AsyncStorage.getItem(STORAGE_KEYS.isBlocked);
    setIsBlocked(isBlocked);
  };

  // register/unregister consumer on focus
  const focusCallback = useCallback(() => {
    let mounted = true;
    (async () => {
      await registerConsumer();
    })();

    return () => {
      if (!mounted) return;
      unregisterConsumer();
      mounted = false;
    };
  }, [registerConsumer, unregisterConsumer]);

  useFocusEffect(focusCallback);

  // fetch messages when userId & roomId available
  useEffect(() => {
    if (userId && roomId) {
      fetchChatDetails();
      fetchMessages(true); // true = initial fetch
      markMessagesAsSeen();
      fetchQuickReplies(); // Fetch quick replies when component loads

    }
  }, [userId, roomId]);

  // Simple slash command filtering
  useEffect(() => {
    if (newMessage.startsWith("/")) {
      const query = newMessage.slice(1).toLowerCase();
      const filtered = quickReplies.filter((reply: QuickReply) =>
        reply.shortcut.toLowerCase().startsWith(query)
      );
      setSuggestions(filtered.slice(0, 6)); // Show up to 6 suggestions
    } else {
      setSuggestions([]);
    }
  }, [newMessage, quickReplies]);

  const scrollToBottom = useCallback((animated = true, delay = 0) => {
    if (scrollToBottomTimeoutRef.current) {
      clearTimeout(scrollToBottomTimeoutRef.current);
    }

    scrollToBottomTimeoutRef.current = setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated });
      }
    }, delay);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollToBottomTimeoutRef.current) {
        clearTimeout(scrollToBottomTimeoutRef.current);
      }
    };
  }, []);

  const markMessagesAsSeen = async () => {
    if (!userId || !roomId || hasMarkedAsSeen) return;

    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            mutation UpdateUnseenMessages($user_id: uuid, $room_id: uuid) {
              __typename
              update_whatsub_room_user_mapping(where: {user_id: {_eq: $user_id}, room_id: {_eq: $room_id}}, _set: {unseen_message_count: 0}) {
                __typename
                affected_rows
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

      if (data.data?.update_whatsub_room_user_mapping?.affected_rows > 0) {
        setHasMarkedAsSeen(true);
        console.log('Messages marked as seen for room:', roomId);
      }
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  };

  const fetchMessages = async (isInitial = false, loadMore = false) => {
    if (!userId || !roomId) return;
    if (loadMore && (!hasMoreMessages || isLoadingMore)) return;

    if (isInitial) {
      setIsLoadingMessages(true);
      setMessageOffset(0);
      setHasMoreMessages(true);
    } else if (loadMore) {
      setIsLoadingMore(true);
    }

    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;

      const currentOffset = isInitial ? 0 : messageOffset;
      const limit = 50;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            query getMessages($room_id: uuid!, $limit: Int, $offset: Int) {
              __typename
              whatsub_message(where: {room_id: {_eq: $room_id}}, order_by: {created_at: desc}, limit: $limit, offset: $offset) {
                __typename
                id
                message
                options
                created_at
                from_user_id
                type
                from_user_fullname {
                  __typename
                  fullname
                }
                click_type
                click_text
                click_data
              }
            }
          `,
          variables: {
            room_id: roomId,
            limit: limit,
            offset: currentOffset,
          },
        }),
      });

      const data = await response.json();
      // console.log(data);
      if (data.data?.whatsub_message) {
        const fetchedMessages = data.data.whatsub_message.reverse();

        if (isInitial) {
          setMessages(fetchedMessages);
          setShouldScrollToBottom(true);
          scrollToBottom(false, 300);
        } else if (loadMore) {
          setMessages(prev => [...fetchedMessages, ...prev]);
          setShouldScrollToBottom(false);
        }

        setMessageOffset(currentOffset + fetchedMessages.length);
        setHasMoreMessages(fetchedMessages.length === limit);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (isInitial) {
        showError('Failed to load messages');
      }
    } finally {
      setIsLoadingMessages(false);
      setIsLoadingMore(false);
    }
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setShouldScrollToBottom(isNearBottom);

    if (contentOffset.y <= 100 && hasMoreMessages && !isLoadingMore) {
      fetchMessages(false, true);
    }
  };

  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    const previousHeight = contentHeight;
    setContentHeight(contentHeight);

    if (isKeyboardVisible || shouldScrollToBottom || contentHeight > previousHeight + 20) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 50);
    }
  };

  const handleScrollViewLayout = (event: any) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  };

  useEffect(() => {
    if (!socket || !roomId) return;
    if (!userId) return;

    console.log('Joining room:', roomId);
    socket.emit('join_room', { room_id: roomId });

    const onChatMessage = (data: any) => {
      console.log('[chat_message] received:', data);
      const {
        room_id,
        type,
        id,
        message,
        options,
        created_at,
        from_user_id,
        click_type,
        click_text,
        click_data,
      } = data;

      if (roomId === room_id) {
        const newMsg: Message = {
          id,
          message,
          options,
          created_at,
          from_user_id,
          type,
          click_type,
          click_text,
          click_data,
          from_user_fullname: {
            fullname: from_user_id === userId ? 'You' : String(chatDetails?.whatsub_room_user_mappings[0].auth_fullname) || 'Unknown',
          },
        };

        setMessages((prev) => {
          const withoutTemp = prev.filter(msg => {
            if (msg.id.startsWith('temp-') &&
              msg.from_user_id === from_user_id &&
              msg.message === message) {
              return false;
            }
            return true;
          });

          const exists = withoutTemp.some((msg) => msg.id === id);
          if (!exists) {
            const updated = [...withoutTemp, newMsg];

            setTimeout(() => {
              scrollToBottom(true, 0);
            }, 100);

            return updated;
          }
          return withoutTemp;
        });
      }
    };

    socket.on('chat_message', onChatMessage);

    return () => {
      console.log('Leaving room:', roomId);
      socket.emit('leave_room', { room_id: roomId });
      socket.off('chat_message', onChatMessage);
    };
  }, [socket, roomId, userId, scrollToBottom]);

  // const handleSendMessage = async (type: string) => {
  //   if (!userId || !roomId || !newMessage.trim()) return;

  //   const messageText = newMessage.trim();
  //   const tempId = `temp-${Date.now()}`;

  //   const tempMessage: Message = {
  //     id: tempId,
  //     message: messageText,
  //     options: null,
  //     created_at: new Date().toISOString(),
  //     from_user_id: userId,
  //     type: type,
  //     from_user_fullname: {
  //       fullname: 'You'
  //     },
  //     click_type: '',
  //     click_text: '',
  //     click_data: null,
  //     is_seen: false
  //   };

  //   setMessages(prev => [...prev, tempMessage]);
  //   setNewMessage('');
  //   setSuggestions([]);

  //   setTimeout(() => {
  //     scrollToBottom(true, 0);
  //   }, 100);

  //   setIsSending(true);

  //   try {
  //     const authToken = await storage.getAuthToken();
  //     if (!authToken) return;

  //     if (type === "image") {
  //       const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  //       if (!permissionResult.granted) {
  //         alert("Permission to access gallery is required!");
  //         return;
  //       }

  //       // 3️⃣ Open image picker
  //       const pickerResult = await ImagePicker.launchImageLibraryAsync({
  //         mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //         allowsEditing: true,
  //         quality: 0.7,
  //         base64: true, // get image as base64
  //       });

  //       if (pickerResult.canceled) return;

  //       const base64Image = pickerResult.assets[0].base64;
  //       const response = await fetch('https://db.subspace.money/v1/graphql', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           Authorization: `Bearer ${authToken}`,
  //         },
  //         body: JSON.stringify({
  //           query: `
  //           mutation MyMutation($from_user_id: uuid = "", $room_id: uuid = "", $image: String = "") {
  //             __typename
  //             whatsubSendImageAsMessage(
  //               request: {
  //                 from_user_id: $from_user_id
  //                 room_id: $room_id
  //                 image: $image
  //               }
  //             ) {
  //               __typename
  //               message
  //             }
  //           }
  //         `,
  //           variables: {
  //             room_id: roomId,
  //             from_user_id: userId,
  //             image: base64Image,
  //           },
  //         }),
  //       });

  //       const data = await response.json();
  //     } else {
  //       const response = await fetch('https://db.subspace.money/v1/graphql', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           Authorization: `Bearer ${authToken}`,
  //         },
  //         body: JSON.stringify({
  //           query: `
  //           mutation SendMessage($message: String!, $user_id: uuid!, $room_id: uuid!) {
  //             __typename
  //             sendMessage(request: {message: $message, user_id: $user_id, room_id: $room_id}) {
  //               __typename
  //               affected_rows
  //             }
  //           }
  //         `,
  //           variables: {
  //             message: messageText,
  //             user_id: userId,
  //             room_id: roomId,
  //           },
  //         }),
  //       });

  //       const data = await response.json();
  //       if (data.data?.sendMessage?.affected_rows <= 0) {
  //         setMessages(prev => prev.filter(msg => msg.id !== tempId));
  //         setNewMessage(messageText);
  //         console.error('Failed to send message');
  //       }
  //     }


  //   } catch (error) {
  //     console.error('Error sending message:', error);
  //     setMessages(prev => prev.filter(msg => msg.id !== tempId));
  //     setNewMessage(messageText);
  //   } finally {
  //     setIsSending(false);
  //   }
  // };

  const handleSendMessage = async (type: string) => {
    console.log('handleSendMessage called with type:', type);

    if (!userId || !roomId) {
      console.log('Missing userId or roomId');
      return;
    }

    // Only check message content for text messages
    if (type === "text" && !newMessage.trim()) {
      console.log('Empty text message');
      return;
    }

    // For text messages, create temp message and clear input
    if (type === "text") {
      const messageText = newMessage.trim();
      const tempId = `temp-${Date.now()}`;

      const tempMessage = {
        id: tempId,
        message: messageText,
        options: null,
        created_at: new Date().toISOString(),
        from_user_id: userId,
        type: type,
        from_user_fullname: { fullname: 'You' },
        click_type: '',
        click_text: '',
        click_data: null,
        is_seen: false
      };

      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      setSuggestions([]);
      scrollToBottom(true, 100);
    }

    setIsSending(true);

    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) {
        console.log('No auth token');
        return;
      }

      if (type === "image") {
        console.log('Requesting media library permissions...');
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
          Alert.alert("Permission Required", "Permission to access gallery is required!");
          return;
        }

        console.log('Launching image picker...');
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });

        console.log('Picker result:', { canceled: pickerResult.canceled, assetsLength: pickerResult.assets?.length });

        if (pickerResult.canceled) {
          return;
        }

        if (!pickerResult.assets || pickerResult.assets.length === 0) {
          Alert.alert("Error", "No image was selected");
          return;
        }

        const base64Image = pickerResult.assets[0].base64;
        if (!base64Image) {
          Alert.alert("Error", "Failed to process image");
          return;
        }

        console.log('Sending image to server...');
        const response = await fetch('https://db.subspace.money/v1/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            query: `
            mutation MyMutation($from_user_id: uuid = "", $room_id: uuid = "", $image: String = "") {
              __typename
              whatsubSendImageAsMessage(
                request: {
                  from_user_id: $from_user_id
                  room_id: $room_id
                  image: $image
                }
              ) {
                __typename
                message
              }
            }
          `,
            variables: {
              room_id: roomId,
              from_user_id: userId,
              image: base64Image,
            },
          }),
        });

        const data = await response.json();
        console.log('Image upload response:', data);

        if (data.errors) {
          console.error('GraphQL errors:', data.errors);
          Alert.alert("Error", "Failed to send image");
        }
      } else {
        // Handle text message sending
        const response = await fetch('https://db.subspace.money/v1/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            query: `
            mutation SendMessage($message: String!, $user_id: uuid!, $room_id: uuid!) {
              __typename
              sendMessage(request: {message: $message, user_id: $user_id, room_id: $room_id}) {
                __typename
                affected_rows
              }
            }
          `,
            variables: {
              message: newMessage.trim(),
              user_id: userId,
              room_id: roomId,
            },
          }),
        });

        const data = await response.json();
        if (data.data?.sendMessage?.affected_rows <= 0) {
          // Remove temp message and restore input
          setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
          setNewMessage(newMessage.trim());
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert("Error", "Failed to send message");

      if (type === "text") {
        // Remove temp message and restore input
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
        setNewMessage(newMessage.trim());
      }
    } finally {
      setIsSending(false);
    }
  };

  const fetchChatDetails = async () => {
    if (!userId || !roomId) return;

    setIsLoadingChatDetails(true);
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            query getRoomsDetails($room_id: uuid!) {
              __typename
              whatsub_rooms(where: {id: {_eq: $room_id}}) {
                __typename
                id
                name
                type
                is_public
                user_id
                room_dp
                details
                whatsub_users_subscriptions(where: {type: {_eq: "admin"}}) {
                  __typename
                  id
                  expiry_image
                  whatsub_plan {
                    __typename
                    admin_conditions
                  }
                }
                whatsub_room_user_mappings {
                  __typename
                  id
                  isGroupInfoRead
                  auth_fullname {
                    __typename
                    fullname
                    dp
                    id
                    last_active
                    whatsub_public_key {
                      __typename
                      public_key
                    }
                  }
                  whatsub_group_credential {
                    __typename
                    credentials
                  }
                }
              }
            }
          `,
          variables: {
            room_id: roomId,
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error fetching group details:', data.errors);
        return;
      }

      const group = data.data?.whatsub_rooms?.[0];
      if (group) {
        setChatDetails(group);

        if (chatDetails?.type === 'group' && userId) {
          const userMapping = group.whatsub_room_user_mappings.find(
            (mapping: GroupMember) => mapping.auth_fullname.id === userId
          );

          if (userMapping) {
            setCurrentUserMapping(userMapping);
            if (!userMapping.isGroupInfoRead) {
              setShowGroupInfoModal(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    } finally {
      setIsLoadingChatDetails(false);
    }
  };

  const handleDeleteConversation = async () => {
    setShowOptionsMenu(false);
    if (!userId || !roomId) return;
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
                    mutation MyMutation2($room_id: uuid = "", $user_id: uuid = "") {
                      __typename
                      deletePrivateAnonymousRoom(request: {room_id: $room_id, user_id: $user_id}) {
                        __typename
                        message
                      }
                    }
                  `,
          variables: {
            room_id: roomId,
            user_id: userId,
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error deleting conversation:', data.errors);
        showError('Failed to delete conversation');
        return;
      }

      const result = data.data?.deletePrivateAnonymousRoom;
      if (result?.message) {
        router.replace('/(tabs)/chat');
      } else {
        showError('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showError('Failed to delete conversation');
    }
  };

  const handleDeleteGroup = async () => {
    setShowOptionsMenu(false);
    if (!userId || !roomId || !chatDetails) return;

    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;

      const subscription = chatDetails.whatsub_users_subscriptions?.[0];
      if (!subscription) {
        showError('No subscription found for this group');
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
            mutation MyMutation($user_subscription_id: uuid, $room_id: uuid) {
              __typename
              update_whatsub_users_subscription(where: {id: {_eq: $user_subscription_id}}, _set: {status: "inactive"}) {
                __typename
                affected_rows
              }
              update_whatsub_rooms(where: {id: {_eq: $room_id}}, _set: {status: "inactive", is_public: false}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_subscription_id: chatDetails.whatsub_users_subscriptions[0].id,
            room_id: roomId,
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error deleting group:', data.errors);
        showError('Failed to delete group');
        return;
      }

      const subscriptionResult = data.data?.update_whatsub_users_subscription;
      const roomResult = data.data?.update_whatsub_rooms;

      if (subscriptionResult?.affected_rows > 0 && roomResult?.affected_rows > 0) {
        showSuccess('Group deleted successfully');
        router.replace('/(tabs)/chat');
      } else {
        showError('Failed to delete group');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      showError('Failed to delete group');
    }
  };

  const handleProfilePress = () => {
    setShowOptionsMenu(false);
    if (chatDetails?.type === 'private') {
      router.push({
        pathname: '/(tabs)/chat/profile',
        params: {
          friendId: chatDetails?.whatsub_room_user_mappings[1]?.id,
        },
      });
    }
    else if (chatDetails?.type === 'group') {
      router.push({
        pathname: '/(tabs)/chat/group-info',
        params: {
          roomId: roomId,
          adminId: chatDetails?.user_id,
        },
      });
    }
  };

  const handleMarkAsRead = async () => {
    if (!currentUserMapping || !userId) return;

    setIsMarkingAsRead(true);
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            mutation MyMutation($roomUserMappingId: uuid = "") {
              __typename
              update_whatsub_room_user_mapping(_set: {isGroupInfoRead: true}, where: {id: {_eq: $roomUserMappingId}}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            roomUserMappingId: currentUserMapping.id,
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error marking as read:', data.errors);
        showError('Failed to mark as read');
        return;
      }

      if (data.data?.update_whatsub_room_user_mapping?.affected_rows > 0) {
        setShowGroupInfoModal(false);
        setCurrentUserMapping(prev => prev ? { ...prev, isGroupInfoRead: true } : null);
        showSuccess('Group information marked as read');
      } else {
        showError('Failed to mark as read');
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      showError('Failed to mark as read');
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      .toLowerCase();
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
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const fetchQuickReplies = async () => {
    if (!userId) return;
    try {
      const authToken = await storage.getAuthToken();
      if (!authToken) return;

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            query getQuickReply($user_id: uuid) {
              whatsub_quick_reply(where: { user_id: { _eq: $user_id } }) {
                message
                shortcut
              }
            }        
          `,
          variables: {
            user_id: userId,
          },
        }),
      });

      const data = await response.json();
      setQuickReplies(data.data.whatsub_quick_reply);

      if (data.errors) {
        console.error('Error fetching quickReplies:', data.errors);
        return;
      }

    } catch (error) {
      console.error('Error fetching quick replies:', error);
    }
  };

  // Simple suggestion selection
  const handleSuggestionSelect = (selectedReply: QuickReply) => {
    setNewMessage(selectedReply.message);
    setSuggestions([]);
  };

  const handleBackPress = () => {
    if (isBlocked === 'true'){
      router.replace('/AccountBlockedScreen');
    }
    return router.back();
  }

  const isCurrentUser = (from_user_id: string) => from_user_id === userId;

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => handleBackPress()} // Add parentheses to call the function
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={()=>handleProfilePress()}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: chatDetails?.room_dp as string }}
              style={styles.headerAvatar}
              defaultSource={require('@/assets/images/icon.png')}
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {chatDetails?.type === "group"
                ? (chatDetails?.name || "Group")  
                : (
                  chatDetails?.type === "private"
                  ? (String(chatDetails?.whatsub_room_user_mappings?.[1]?.auth_fullname?.fullname)) 
                  : (String(chatDetails?.whatsub_room_user_mappings?.[0]?.auth_fullname?.fullname))
                )
              }

            </Text>
            <View style={styles.statusContainer}></View>
          </View>
        </TouchableOpacity>

        {chatDetails?.type === "private" ? (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton}
              onPress={() => setShowCallModal(true)}
            >
              <Phone size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton}
              onPress={() => setShowTextModal(true)}
            >
              <Image
                source={require('@/assets/images/download.png')}
                style={styles.whatsappIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        ) : null}
        {chatDetails?.type === "group" ? (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton}
              onPress={() => handleProfilePress()}
            >
              <Info size={20} color="#FFD700" />
            </TouchableOpacity>
          </View>
        ) : null}
        {chatDetails?.type !== 'group' ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => setShowOptionsMenu(true)}
            >
              <EllipsisVertical size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          {
            flexGrow: 1,
            paddingBottom: isKeyboardVisible ? 16 : 10,
          }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
        scrollEventThrottle={16}
      >
        {/* Load More Indicator */}
        {isLoadingMore && hasMoreMessages && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.loadMoreText}>Loading older messages...</Text>
          </View>
        )}

        {isLoadingMessages ? (
          <View style={styles.loadingContainer}>
            <Loader size={32} color="#6366F1" />
          </View>
        ) : (
          <>
            {messages.map((message, index) => {
              const fromMe = isCurrentUser(message.from_user_id);
              const showDate =
                index === 0 ||
                new Date(messages[index - 1].created_at).toDateString() !==
                new Date(message.created_at).toDateString();

              return (
                <View key={message.id}>
                  {showDate && (
                    <View style={styles.dateContainer}>
                      <Text style={styles.dateText}>
                        {formatDate(message.created_at)}
                      </Text>
                    </View>
                  )}

                  {/* Render based on message.type */}
                  {(() => {
                    switch (message.type) {
                      case "event":
                        return (
                          <View style={styles.eventMessageContainer}>
                            <Text style={styles.eventMessageText}>
                              {message.message}
                            </Text>
                          </View>
                        );

                      // case "spam":
                      //   return (
                      //     <View style={styles.spamMessageContainer}>
                      //       <Text style={styles.spamMessageText}>
                      //         🚫 This message was marked as spam
                      //       </Text>
                      //     </View>
                      //   );

                      case "image":
                        return (
                          <View
                            style={[
                              styles.messageContainer,
                              fromMe ? styles.sentMessage : styles.receivedMessage,
                            ]}
                          >
                            <View style={styles.messageBubbleContainer}>
                              <View
                                style={[
                                  styles.messageBubble,
                                  fromMe ? styles.sentBubble : styles.receivedBubble,
                                ]}
                              >
                                {message.from_user_id !== userId && (
                                  <Text style={styles.senderName}>
                                    {message.from_user_fullname.fullname}
                                  </Text>
                                )}
                                <Image
                                  source={{ uri: message.message }}
                                  style={styles.imageMessage}
                                  resizeMode="cover"
                                />
                              </View>

                              <View
                                style={[
                                  styles.messageTime,
                                  fromMe ? styles.sentTime : styles.receivedTime,
                                ]}
                              >
                                <Text style={styles.timeText}>
                                  {formatTime(message.created_at)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );

                      case "text":
                      default:
                        return (
                          <View
                            style={[
                              styles.messageContainer,
                              fromMe ? styles.sentMessage : styles.receivedMessage,
                            ]}
                          >
                            <View style={styles.messageBubbleContainer}>
                              <View
                                style={[
                                  styles.messageBubble,
                                  fromMe ? styles.sentBubble : styles.receivedBubble,
                                ]}
                              >
                                {message.from_user_id !== userId && (
                                  <Text style={styles.senderName}>
                                    {message.from_user_fullname.fullname}
                                  </Text>
                                )}
                                <Text
                                  style={[
                                    styles.messageText,
                                    fromMe ? styles.sentText : styles.receivedText,
                                  ]}
                                >
                                  {message.message}
                                </Text>
                              </View>

                              <View
                                style={[
                                  styles.messageTime,
                                  fromMe ? styles.sentTime : styles.receivedTime,
                                ]}
                              >
                                <Text style={styles.timeText}>
                                  {formatTime(message.created_at)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                    }
                  })()}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Make Group Public Button */}
      {chatDetails && chatDetails.type === 'group' && !chatDetails.is_public && chatDetails.user_id === userId && (
        <View style={styles.makePublicContainer}>
          <View style={styles.makePublicContent}>
            <View style={styles.makePublicIcon}>
              <View style={styles.chatBubble1} />
              <View style={styles.chatBubble2} />
            </View>
            <Text style={styles.makePublicText}>
              Making your group public will let others to join the group
            </Text>
            <TouchableOpacity
              style={styles.makePublicButton}
              onPress={() => router.push({
                pathname: '/expiry-verification',
                params: {
                  subscriptionId: chatDetails.whatsub_users_subscriptions[0]?.id,
                  roomId: roomId
                }
              })}
            >
              <Text style={styles.makePublicButtonText}>Make Your Group Public</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Simple Quick Reply Suggestions - appears above input */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.shortcut}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionSelect(item)}
              >
                <Text style={styles.suggestionShortcut}>{item.shortcut}</Text>
                <Text style={styles.suggestionMessage}>{item.message}</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputContainer,
      {
        paddingBottom: isKeyboardVisible ? 35 : 20,
        marginBottom: keyboardHeight > 0 ? keyboardHeight : 0,
      }
      ]}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity style={styles.emojiButton}>
            <Smile size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder={t('chat.typeMessage')}
            placeholderTextColor="#6B7280"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
            onFocus={() => {
              setTimeout(() => {
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollToEnd({ animated: true });
                }
              }, 300);
            }}
            onContentSizeChange={() => {
              if (isKeyboardVisible) {
                setTimeout(() => {
                  if (scrollViewRef.current) {
                    scrollViewRef.current.scrollToEnd({ animated: true });
                  }
                }, 100);
              }
            }}
          />
          <View style={styles.inputActions}>
            <TouchableOpacity style={styles.inputActionButton}
              onPress={() => handleSendMessage("image")}>
              <Paperclip size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sendActions}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              newMessage.trim()
                ? styles.sendButtonActive
                : styles.sendButtonInactive,
            ]}
            onPress={() => handleSendMessage("text")}
            disabled={!newMessage.trim() || isSending}
          >
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Options Menu */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenu}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={chatDetails?.type === 'group' ? handleDeleteGroup : handleDeleteConversation}
            >
              <Trash2 size={18} color="#EF4444" />
              <Text style={styles.deleteOptionText}>
                {chatDetails?.type === 'group' ? 'Delete Group' : 'Delete Conversation'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Group Info Modal */}
      <Modal
        visible={showGroupInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => { }}
      >
        <View style={styles.groupInfoModalOverlay}>
          <LinearGradient
            colors={['#1F2937', '#374151']}
            style={styles.groupInfoModalContainer}
          >
            <View style={styles.groupInfoModalHeader}>
              <View style={styles.groupInfoIndicator} />
              <Text style={styles.groupInfoModalTitle}>Group Information</Text>
            </View>

            <View style={styles.groupInfoModalContent}>
              <Text style={styles.groupInfoContent}>
                {chatDetails?.details || 'No group information available.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.groupInfoReadButton,
                isMarkingAsRead && styles.groupInfoReadButtonDisabled
              ]}
              onPress={handleMarkAsRead}
              disabled={isMarkingAsRead}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.groupInfoReadButtonGradient}
              >
                {isMarkingAsRead ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.groupInfoReadButtonText}>I HAVE READ IT</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      <CallUserModal
        visible={showCallModal}
        onClose={() => setShowCallModal(false)}
        userId={userId || ''}
        username={chatDetails?.whatsub_room_user_mappings[0]?.id || ''}
      />

      <WhatsappMessageModal
        visible={showTextModal}
        onClose={() => setShowTextModal(false)}
        userId={chatDetails?.user_id || ''}
        username={chatDetails?.whatsub_room_user_mappings[0]?.id || ''}
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
    paddingBottom: 20,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    fontWeight: '800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  headerText: { flex: 1 },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerActionButton: {
    width: 24,
    height: 24,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappIcon: {
    width: 16,
    height: 16,
  },
  eventMessageContainer: {
    alignItems: "center",
    marginVertical: 4,
  },
  eventMessageText: {
    backgroundColor: "#f5f7faff",
    color: "#374151",
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 2,
    borderRadius: 12,
    textAlign: "center",
  },
  senderName: {
    fontWeight: '600',
    fontSize: 12,
    color: '#40e0d0',
    marginBottom: 2,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatarContainer: {
    marginRight: 8,
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  messageBubbleContainer: {
    maxWidth: '75%',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 6,
  },
  receivedBubble: {
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  sentText: {
    color: 'white',
  },
  receivedText: {
    color: '#E5E7EB',
  },
  messageTime: {
    marginTop: 4,
  },
  sentTime: {
    alignItems: 'flex-end',
  },
  receivedTime: {
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  // Simple Quick Reply Styles
  suggestionsContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.3)',
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.2)',
  },
  suggestionShortcut: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 2,
  },
  suggestionMessage: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.3)',
    gap: 12,
    backgroundColor: '#0E0E0E',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 18,
    paddingRight: 8,
    paddingVertical: 4,
    minHeight: 10,
    maxHeight: 100,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: 'white',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  emojiButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  inputActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inputActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#6366F1',
  },
  sendButtonInactive: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  optionsMenu: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  deleteOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  groupInfoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  groupInfoModalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  groupInfoModalHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  groupInfoIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#6366F1',
    borderRadius: 2,
    marginBottom: 16,
  },
  groupInfoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  groupInfoModalContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  groupInfoContent: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
    textAlign: 'left',
  },
  groupInfoReadButton: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  groupInfoReadButtonDisabled: {
    opacity: 0.6,
  },
  groupInfoReadButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfoReadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  makePublicContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.3)',
  },
  makePublicContent: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 20,
    alignItems: 'center',
  },
  makePublicIcon: {
    position: 'relative',
    width: 60,
    height: 40,
    marginBottom: 16,
  },
  chatBubble1: {
    position: 'absolute',
    width: 32,
    height: 24,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    borderBottomLeftRadius: 4,
    top: 0,
    left: 0,
  },
  chatBubble2: {
    position: 'absolute',
    width: 32,
    height: 24,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    borderBottomRightRadius: 4,
    bottom: 0,
    right: 0,
  },
  makePublicText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  makePublicButton: {
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.5)',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  makePublicButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  spamMessageContainer: {
    alignItems: "center",
    marginVertical: 5,
  },
  spamMessageText: {
    fontSize: 12,
    color: "red",
    fontStyle: "italic",
  },
  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginTop: 5,
  },
});