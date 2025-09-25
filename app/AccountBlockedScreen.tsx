import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, Phone, Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import { storage, STORAGE_KEYS } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function AccountBlockedScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [blockedTitle, setBlockedTitle] = useState<string|null>(null);

  useEffect(()=>{
    getDetails();
  },[]);

  const getDetails = async()=>{
    const blocked_title = await AsyncStorage.getItem(STORAGE_KEYS.blockedTitle);
    setBlockedTitle(blocked_title);
  }

  const handleContactSupport = async () => {
    setIsConnecting(true);
    
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        showError('Authentication required to contact support');
        setIsConnecting(false);
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
              createPrivateRoom(request: {other_id: $other_id, user_id: $user_id}) {
                __typename
                id
              }
            }
          `,
          variables: {
            user_id: userId,
            other_id: 'bcd435e5-7a58-4790-a01e-d6660dbaf3d3' // Support team ID
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('Error creating support chat:', data.errors);
        showError('Failed to connect to support');
        return;
      }

      const roomId = data.data?.createPrivateRoom?.id;
      if (roomId) {
        router.push({
          pathname: '/(tabs)/chat/conversation',
          params: {
            roomId: roomId,
            friendId: 'bcd435e5-7a58-4790-a01e-d6660dbaf3d3',
            friendName: 'Support Team',
            roomDp: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
            roomType: 'private'
          }
        });
      } else {
        showError('Failed to create support chat');
      }
    } catch (error) {
      console.error('Error contacting support:', error);
      showError('Failed to connect to support');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0E0E0E', '#1A1A1A', '#0E0E0E']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Blocked Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.blockedIcon}>
            <Text>🤡</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{blockedTitle}</Text>

        {/* Contact Support Button */}
        <TouchableOpacity
          style={[
            styles.supportButton,
            isConnecting && styles.supportButtonDisabled
          ]}
          onPress={handleContactSupport}
          disabled={isConnecting}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.supportButtonGradient}
          >
            {isConnecting ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.supportButtonText}>Connecting...</Text>
              </>
            ) : (
              <>
                <MessageSquare size={20} color="white" />
                <Text style={styles.supportButtonText}>Need Help?</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('@/assets/images/waiting.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>
      </View>

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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    marginBottom: 32,
  },
  blockedIcon: {
    width: 100,
    height: 100,
    // borderRadius: 50,
    // backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    // borderWidth: 3,
    // borderColor: 'rgba(239, 68, 68, 0.3)',
    // shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  supportButton: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  supportButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  supportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  supportButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  alternativeContact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 40,
    gap: 12,
  },
  alternativeText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    maxHeight: 300,
  },
  illustration: {
    width: width * 0.6,
    height: width * 0.6,
    maxWidth: 250,
    maxHeight: 250,
  },
});