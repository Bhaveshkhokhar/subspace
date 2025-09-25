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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Users
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface TeamMember {
  name: string;
  designation: string;
  image: string;
}

export default function TeamScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchTeamDetails();
    }
  }, [authToken]);

  const initializeAuth = async () => {
    try {
      const token = await storage.getAuthToken();
      setAuthToken(token);
    } catch (error) {
      console.error('Error getting auth token:', error);
      showError('Authentication required');
    }
  };

  const fetchTeamDetails = async () => {
    if (!authToken) return;

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
            query getTeamDetails {
              __typename
              our_team(order_by: {order: asc}) {
                __typename
                name
                designation
                image
              }
            }
          `
        })
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error fetching team details:', data.errors);
        showError('Failed to load team details');
        return;
      }

      setTeamMembers(data.data?.our_team || []);
    } catch (error) {
      console.error('Error fetching team details:', error);
      showError('Failed to load team details');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchTeamDetails();
    setIsRefreshing(false);
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/account/app-info');
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0]?.toUpperCase() || '';
    const last = parts[parts.length - 1]?.[0]?.toUpperCase() || '';
    return first + last;
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
          <Text style={styles.headerTitle}>Our Team</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading team details...</Text>
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
        <Text style={styles.headerTitle}>Our Team</Text>
        <View style={styles.headerRight} />
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

        {/* App Logo Section */}
        <View style={styles.appInfoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image
                source={require('@/assets/images/CatDanceClubbingGIF.gif')}
                style={styles.appLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.companyText}>© Subspace Technologies 2023</Text>
        </View>

        {/* Team Members Grid */}
        <View style={styles.teamContainer}>
          {teamMembers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Users size={48} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>No Team Members</Text>
              <Text style={styles.emptySubtitle}>
                Team information will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.teamGrid}>
              {teamMembers.map((member, index) => (
                <View key={index} style={styles.memberCard}>
                  <View style={styles.memberImageContainer}>
                    {member.image ? (
                      <Image
                        source={{ uri: member.image }}
                        style={styles.memberImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.memberImagePlaceholder}>
                        <Text style={styles.memberInitials}>
                          {getInitials(member.name)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName} numberOfLines={2}>
                      {member.name}
                    </Text>
                    <Text style={styles.memberDesignation} numberOfLines={2}>
                      {member.designation}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
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
  appInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBackground: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appLogo: {
    width: '100%',
    height: '100%',
  },
  companyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  teamContainer: {
    paddingHorizontal: 20,
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
    paddingHorizontal: 10,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  memberCard: {
    width: (width - 56) / 2, // Two columns with proper spacing
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  memberImageContainer: {
    marginBottom: 16,
  },
  memberImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  memberImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  memberInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  memberInfo: {
    alignItems: 'center',
    width: '100%',
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  memberDesignation: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});