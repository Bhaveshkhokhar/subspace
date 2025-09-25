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
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Search,
  BookOpen,
  ExternalLink,
  Clock,
  Info
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { SearchBar } from '@/components/SearchBar';

const { width } = Dimensions.get('window');

interface BlogSection {
  id: string;
  title: string;
  section_title: string;
  image_url: string;
  blurhash: string;
  url: string;
  created_at: string;
}

interface SectionClass {
  title: string;
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function BlogsAndArticlesScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const [sections, setSections] = useState<BlogSection[]>([]);
  const [sectionClasses, setSectionClasses] = useState<SectionClass[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken) {
      fetchAllBlogsData();
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

  const fetchAllBlogsData = async () => {
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
            query getSections($id: uuid!, $title: String!) {
              __typename
              getSections(request: {id: $id, title: $title}) {
                __typename
                blurhash
                created_at
                id
                image_url
                section_title
                title
                url
              }
              getSectionClasses(request: {id: $id}) {
                __typename
                title
              }
            }
          `,
          variables: {
            id: "42b0ee58-2303-4178-a1f7-f2786298f68d",
            title: '' // Empty title to fetch all sections
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error fetching blogs data:', data.errors);
        showError('Failed to load blogs and articles');
        return;
      }

      // Set both categories and sections from single response
      setSectionClasses(data.data?.getSectionClasses || []);
      setSections(data.data?.getSections || []);
    } catch (error) {
      console.error('Error fetching blogs data:', error);
      showError('Failed to load blogs and articles');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllBlogsData();
    setIsRefreshing(false);
  };

  const handleArticlePress = async (article: BlogSection) => {
    try {
      const blogUrl = `https://subspace.money/blog/${article.url}`;
      await Linking.openURL(blogUrl);
    } catch (error) {
      console.error('Error opening blog URL:', error);
      showError('Failed to open article');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFilteredSections = () => {
    let filtered = sections;

    // Apply category filter
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(section =>
        section.section_title === selectedCategory
      );
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.section_title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredSections = getFilteredSections();

  // Create categories array with ALL as first item
  const categories = ['ALL', ...sectionClasses.map(cls => cls.title)];



  if (isLoading && sections.length === 0) {
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
          <Text style={styles.headerTitle}>Blogs and Articles</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading articles...</Text>
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
        <Text style={styles.headerTitle}>Blogs and Articles</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setShowSearch(!showSearch)}
        >
          <Search size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <SearchBar
          placeholder="Search articles..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ flex: 1 }}
        />
      )}

      {/* Category Tabs */}
      {sectionClasses.length > 0 && (
        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  selectedCategory === category && styles.activeCategoryTab
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category && styles.activeCategoryTabText
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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


        {/* Articles List */}
        <View style={styles.articlesContainer}>
          {filteredSections.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <BookOpen size={48} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>No Articles Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Articles and blogs will appear here'
                }
              </Text>
            </View>
          ) : (
            filteredSections.map((article) => (
              <TouchableOpacity
                key={article.id}
                style={styles.articleCard}
                onPress={() => handleArticlePress(article)}
                activeOpacity={0.8}
              >
                <View style={styles.articleImageSection}>
                  <Image
                    source={{ uri: article.image_url }}
                    style={styles.articleImage}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.articleTitleSection}>
                  <Text style={styles.articleTitle} numberOfLines={2}>
                    {article.title}
                  </Text>
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
    paddingBottom: 20,
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
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
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
  categorySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  categoryContainer: {
    gap: 0,
  },
  categoryTab: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeCategoryTab: {
    borderBottomColor: '#6366F1',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  activeCategoryTabText: {
    color: 'white',
  },
  articlesContainer: {
    paddingHorizontal: 10,
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
  articleCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  articleImageSection: {
    height: 180,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleImage: {
    width: '100%',
    height: '100%',
  },
  articleTitleSection: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    lineHeight: 22,
    textAlign: 'center',
  },
});