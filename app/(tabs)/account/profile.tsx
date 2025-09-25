import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, CreditCard as Edit, Mail, Phone, Camera, CreditCard, Ban as Bank, Smartphone, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useAuthStore, updateProfile, updateProfilePicture } from '@/stores/authStore';
import { useTranslation } from '@/hooks/useLanguage';
import * as ImagePicker from 'expo-image-picker';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export const fetchUserInfo = async (id: string) => {
  const { user } = useAuthStore.getState();
  if (!user?.auth_token) return null;

  try {
    const response = await fetch('https://db.subspace.money/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.auth_token}`
      },
      body: JSON.stringify({
        query: `
          query MyQuery($id: uuid = "") {
            auth(where: {id: {_eq: $id}}) {
              dp
              fullname
              email
              blurhash
              username
            }
          }
        `,
        variables: { id },
      }),
    });

    const result = await response.json();
    return result.data?.auth[0];
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const [profileData, setProfileData] = useState({
    fullname: '',
    email: '',
    username: '',
    dp: '',
    phone: ''
  });
 
  useEffect(() => {
    initializeUser();
  }, []);

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
      const phone = await storage.getPhoneNumber();
      
      setUserId(id);
      setAuthToken(token);
      
      if (id && token) {
        const profile = await fetchUserInfo(id);
        if (profile) {
          setProfileData({
            fullname: profile.fullname || '',
            email: profile.email || '',
            username: profile.username || '',
            dp: profile.dp || '',
            phone: phone || ''
          });
        }
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const success = await updateProfile(userId, {
        fullname: profileData.fullname,
        email: profileData.email,
        username: profileData.username
      });
      
      if (success) {
        useAuthStore.updateUser({
          fullname: profileData.fullname,
          name: profileData.fullname,
          email: profileData.email,
          username: profileData.username
        });
        setIsEditing(false);
        showSuccess('Profile updated successfully');
      } else {
        setError('Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred while updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    initializeUser(); // Reset form data
  };

  const handlePickImage = async () => {
    if (!userId) return;
    
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showError('Please grant camera roll permissions to change your profile picture');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        const newDpUrl = await updateProfilePicture(userId, base64Image);
        if (newDpUrl) {
          setProfileData(prev => ({ ...prev, dp: newDpUrl }));
          useAuthStore.updateUser({ dp: newDpUrl });
          showSuccess('Profile picture updated successfully');
        } else {
          showError('Failed to update profile picture');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showError('Failed to update profile picture');
    }
  };

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
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
             onPress={handleBackPress}
            >
              <ArrowLeft size={18} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('profile.title')}</Text>
            <View style={styles.headerRight}>
              
            </View>
          </View>

          {/* Profile Picture */}
          <View style={styles.profilePictureContainer}>
            <View style={styles.profilePictureWrapper}>
              {profileData.dp ? (
                <Image
                  source={{ uri: profileData.dp }}
                  style={styles.profilePicture}
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <User size={40} color="#6366F1" />
                </View>
              )}
              {isEditing && (
                <TouchableOpacity
                  style={styles.changePictureButton}
                  onPress={handlePickImage}
                >
                  <Camera size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.userName}>{profileData.fullname || 'User'}</Text>
            <Text style={styles.userPhone}>{profileData.phone}</Text>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <View style={styles.profileContent}>
              {error && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.fullname')}</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, isFocused && styles.inputFocused]}
                    value={profileData.fullname}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, fullname: text }))}
                    placeholder={t('profile.fullname')}
                    placeholderTextColor="#6B7280"
                    editable={isEditing}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                ) : (
                  <Text style={styles.value}>{profileData.fullname || 'Not set'}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.username')}</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, isFocused && styles.inputFocused]}
                    value={profileData.username}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, username: text }))}
                    placeholder={t('profile.username')}
                    placeholderTextColor="#6B7280"
                    editable={isEditing}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                ) : (
                  <Text style={styles.value}>{profileData.username || 'Not set'}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.email')}</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, isFocused && styles.inputFocused]}
                    value={profileData.email}
                    onChangeText={(text) => setProfileData(prev => ({ ...prev, email: text }))}
                    placeholder={t('profile.email')}
                    placeholderTextColor="#6B7280"
                    keyboardType="email-address"
                    editable={isEditing}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                ) : (
                  <Text style={styles.value}>{profileData.email || 'Not set'}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('profile.phone')}</Text>
                <Text style={styles.value}>{profileData.phone || 'Not set'}</Text>
              </View>

                <View style={styles.actionButtons}>
                {isEditing ? (
                  <>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                    )}
                  </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <Edit size={16} color="#6366F1" />
                    <Text style={styles.editButtonText}>{t('profile.edit')}</Text>
                  </TouchableOpacity>
                )}
                </View>
            </View>
          </View>
        </ScrollView>
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
    fontWeight: '600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 4,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePictureWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  changePictureButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0E0E0E',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileContent: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#6366F1',
  },
  value: {
    fontSize: 16,
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.5)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});