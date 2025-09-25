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
  Animated,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp,
  MessageSquare,
  ChevronRight
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface SupportSection {
  title: string;
  coursex_topics: Array<{
    id: string;
    title: string;
    url: string;
  }>;
}

interface SupportData {
  sections: SupportSection[];
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function HelpSupportScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  const [supportData, setSupportData] = useState<SupportData>({ sections: [] });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken) {
      fetchSupportData();
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

  const fetchSupportData = async () => {
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
            query MyQuery($query: String!, $user_id: uuid!) {
              __typename
              w_supportSearch(request: {query: $query, user_id: $user_id}) {
                __typename
                sections
              }
            }
          `,
          variables: {
            query: "",
            user_id: userId
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error fetching support data:', data.errors);
        showError('Failed to load help and support data');
        return;
      }
      
      setSupportData({ sections: data.data?.w_supportSearch?.sections || [] });
    } catch (error) {
      console.error('Error fetching support data:', error);
      showError('Failed to load help and support data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchSupportData();
    setIsRefreshing(false);
  };

  const handleTopicPress = async (topic: { id: string; title: string; url: string }) => {
    try {
      const topicUrl = `https://subspace.money/docs/${topic.url}`;
      await Linking.openURL(topicUrl);
    } catch (error) {
      console.error('Error opening topic URL:', error);
      showError('Failed to open help topic');
    }
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };

  const toggleItem = (itemKey: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  const isSectionExpanded = (sectionTitle: string) => {
    return expandedSections.has(sectionTitle);
  };

  const isItemExpanded = (itemKey: string) => {
    return expandedItems.has(itemKey);
  };

  const handleSupportChat = async () => {
    if (!userId || !authToken) {
      showError('Please log in to start a chat');
      return;
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
            mutation createPrivateRoom($user_id: uuid!, $other_id: uuid!) {
              __typename
              createPrivateRoom(request: {other_id: $other_id, user_id: $user_id}) {
                __typename
                id
              }
            }
          `,
          variables: {
            user_id: userId,
            other_id: 'bcd435e5-7a58-4790-a01e-d6660dbaf3d3'
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error creating support chat:', data.errors);
        showError('Failed to start chat with support');
        return;
      }

      const roomId = data.data?.createPrivateRoom?.id;
      if (roomId) {
        router.push({
          pathname: '/(tabs)/chat/conversation',
          params: {
            roomId: roomId,
          }
        });
      } else {
        showError('Failed to create chat room');
      }
    } catch (error) {
      console.error('Error starting support chat:', error);
      showError('Failed to start chat with support');
    }
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
          <Text style={styles.headerTitle}>Help And Support</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading help content...</Text>
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
          <Text style={styles.headerTitle}>Help And Support</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Support Sections */}
        <View style={styles.sectionsContainer}>
          {supportData.sections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No help content available</Text>
              <Text style={styles.emptySubtitle}>
                Please try again later or contact support
              </Text>
            </View>
          ) : (
            supportData.sections.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.sectionContainer}>
                {/* Section Header */}
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(section.title)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.sectionChevron}>
                    {isSectionExpanded(section.title) ? (
                      <ChevronUp size={20} color="#9CA3AF" />
                    ) : (
                      <ChevronDown size={20} color="#9CA3AF" />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Section Items */}
                {isSectionExpanded(section.title) && (
                  <View style={styles.sectionItems}>
                    {section?.coursex_topics?.map((topic, topicIndex) => {
                      const topicKey = `${topic.title}-${topicIndex}`;
                      
                      return (
                        <View key={topicIndex} style={styles.itemContainer}>
                          <TouchableOpacity
                            style={styles.itemHeader}
                            onPress={() => handleTopicPress(topic)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.itemTitle}>• {topic.title}</Text>
                            <View style={styles.itemChevron}>
                              <ChevronRight size={16} color="#9CA3AF" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Chat with us Button */}
        <View style={styles.chatButtonContainer}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleSupportChat}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.chatButtonGradient}
            >
              <MessageSquare size={20} color="white" />
              <Text style={styles.chatButtonText}>Chat with us (9 AM - 6 PM)</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    paddingBottom: 120,
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
    fontWeight:'800',
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
  sectionsContainer: {
    paddingHorizontal: 10,
    marginBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
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
  sectionContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  sectionChevron: {
    marginLeft: 12,
  },
  sectionItems: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingBottom: 8,
  },
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.3)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  itemTitle: {
    fontSize: 14,
    color: '#E5E7EB',
    flex: 1,
    lineHeight: 20,
  },
  itemChevron: {
    marginLeft: 12,
  },
  itemContent: {
    paddingHorizontal: 40,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  itemContentText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  chatButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  chatButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});