import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageSquare, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width, height } = Dimensions.get('window');

export default function WelcomeMessageScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const params = useLocalSearchParams();
  const { roomId } = params;
  
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken && roomId) {
      fetchWelcomeMessage();
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

  const fetchWelcomeMessage = async () => {
    if (!authToken || !roomId) return;
    
    setIsLoading(true);
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
            query getRoomWelcomeMessage($room_id: uuid!) {
              __typename
              whatsub_rooms(where: {id: {_eq: $room_id}}) {
                __typename
                welcome_message
              }
            }
          `,
          variables: {
            room_id: roomId
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error fetching welcome message:', data.errors);
        setError('Failed to load welcome message');
        return;
      }
      
      const room = data.data?.whatsub_rooms?.[0];
      if (room) {
        setWelcomeMessage(room.welcome_message || '');
      }
    } catch (error) {
      console.error('Error fetching welcome message:', error);
      setError('Failed to load welcome message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!authToken || !roomId) {
      setError('Authentication required');
      return;
    }

    if (!welcomeMessage.trim()) {
      setError('Please enter a welcome message');
      return;
    }

    setIsSaving(true);
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
            mutation UpdateWelcomeMessage($id: uuid!, $welcome_message: String) {
              __typename
              update_whatsub_rooms(where: {id: {_eq: $id}}, _set: {welcome_message: $welcome_message}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            id: roomId,
            welcome_message: welcomeMessage.trim()
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error updating welcome message:', data.errors);
        setError('Failed to update welcome message');
        return;
      }
      
      if (data.data?.update_whatsub_rooms?.affected_rows > 0) {
        showSuccess('Welcome message updated successfully');
        
        // Navigate back after success
        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        setError('Failed to update welcome message');
      }
    } catch (error) {
      console.error('Error updating welcome message:', error);
      setError('Failed to update welcome message');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/chat');
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
          <Text style={styles.headerTitle}>Welcome Message</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading welcome message...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
            >
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Welcome Message</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Welcome Message Input */}
          <View style={styles.messageContainer}>
            <View style={[
              styles.messageInputContainer,
              isFocused && styles.messageInputContainerFocused
            ]}>
              <TextInput
                style={styles.messageInput}
                value={welcomeMessage}
                onChangeText={setWelcomeMessage}
                placeholder="Welcome Text"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                maxLength={1000}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!isSaving}
              />
              
              {/* Character count */}
              <View style={styles.characterCount}>
                <Text style={styles.characterCountText}>
                  {welcomeMessage.length}/1000
                </Text>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!welcomeMessage.trim() || isSaving) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!welcomeMessage.trim() || isSaving}
          >
            <LinearGradient
              colors={
                !welcomeMessage.trim() || isSaving 
                  ? ['#6B7280', '#6B7280'] 
                  : ['#6366F1', '#8B5CF6']
              }
              style={styles.saveButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
  keyboardView: {
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
  messageContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  messageInputContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    borderStyle: 'solid',
    padding: 20,
    minHeight: 300,
    position: 'relative',
    justifyContent: 'flex-start',
  },
  messageInputContainerFocused: {
    borderColor: '#6366F1',
  },
  messageInput: {
    color: 'white',
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: 'top',
    minHeight: 240,
    paddingBottom: 30,
    fontWeight: '400',
  },
  characterCount: {
    position: 'absolute',
    bottom: 12,
    right: 16,
  },
  characterCountText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(14, 14, 14, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
});