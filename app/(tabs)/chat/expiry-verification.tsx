import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Upload, Camera, Image as ImageIcon, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width, height } = Dimensions.get('window');

export default function ExpiryVerificationScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const params = useLocalSearchParams();
  const { roomId, subscriptionId, expiryImage } = params;
  
  const [selectedImage, setSelectedImage] = useState<string>(expiryImage[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select an image',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Gallery',
          onPress: () => openGallery(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        showError('Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setUploadSuccess(false);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      showError('Failed to open camera');
    }
  };

  const openGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showError('Gallery permission is required to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setUploadSuccess(false);
      }
    } catch (error) {
      console.error('Error opening gallery:', error);
      showError('Failed to open gallery');
    }
  };

  const handleMakePublic = async () => {
    if (!selectedImage) {
      showError('Please upload an image first');
      return;
    }

    if (!roomId) {
      showError('Room ID is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();
      
      if (!userId || !authToken) {
        showError('Authentication required');
        return;
      }

      // Convert image to base64 if needed
      let base64Image = selectedImage;
      if (!selectedImage.startsWith('data:')) {
        // If it's a file URI, we need to convert it to base64
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const reader = new FileReader();
        
        base64Image = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation update_subscription_expiry($expiry_image: String!, $room_id: uuid!, $user_id: uuid!) {
              __typename
              w_update_subscription_expiry(request: {expiry_image: $expiry_image, room_id: $room_id, user_id: $user_id}) {
                __typename
                expiry_image
              }
            }
          `,
          variables: {
            expiry_image: base64Image,
            room_id: roomId,
            user_id: userId
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        showError(data.errors[0]?.message || 'Failed to update expiry verification');
        return;
      }

      if (data.data?.w_update_subscription_expiry?.expiry_image) {
        setUploadSuccess(true);
        showSuccess('Expiry verification submitted successfully');
        
        // Navigate back after success
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        showError('Failed to update expiry verification');
      }
      
    } catch (error) {
      console.error('Error submitting verification:', error);
      showError('Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/chat');
    }
  };

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expiry Verification</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Upload Section */}
        <View style={styles.uploadSection}>
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={handleImagePicker}
            disabled={isSubmitting}
          >
            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={handleImagePicker}
                    disabled={isSubmitting}
                  >
                    <Camera size={20} color="white" />
                    <Text style={styles.changeImageText}>Change Image</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.uploadIcon}>
                  <Upload size={32} color="#6366F1" />
                </View>
                <Text style={styles.uploadTitle}>Upload the image</Text>
                <Text style={styles.uploadSubtitle}>
                  Take a photo or select from gallery
                </Text>
                <View style={styles.uploadActions}>
                  <View style={styles.uploadActionItem}>
                    <Camera size={20} color="#9CA3AF" />
                    <Text style={styles.uploadActionText}>Camera</Text>
                  </View>
                  <View style={styles.uploadActionDivider} />
                  <View style={styles.uploadActionItem}>
                    <ImageIcon size={20} color="#9CA3AF" />
                    <Text style={styles.uploadActionText}>Gallery</Text>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Success Indicator */}
          {uploadSuccess && (
            <View style={styles.successIndicator}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.successText}>Image uploaded successfully</Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <View style={styles.instructionItem}>
            <View style={styles.instructionIcon}>
              <ImageIcon size={16} color="#6366F1" />
            </View>
            <Text style={styles.instructionText}>
              Upload a clear image of your subscription expiry details
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <View style={styles.instructionIcon}>
              <CheckCircle size={16} color="#10B981" />
            </View>
            <Text style={styles.instructionText}>
              Ensure the expiry date is clearly visible in the image
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <View style={styles.instructionIcon}>
              <AlertCircle size={16} color="#F59E0B" />
            </View>
            <Text style={styles.instructionText}>
              This will help verify your subscription status
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.makePublicButton,
            (!selectedImage || isSubmitting) && styles.makePublicButtonDisabled
          ]}
          onPress={handleMakePublic}
          disabled={!selectedImage || isSubmitting}
        >
          <LinearGradient
            colors={
              !selectedImage || isSubmitting 
                ? ['#6B7280', '#6B7280'] 
                : ['#6366F1', '#8B5CF6']
            }
            style={styles.makePublicButtonGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.makePublicButtonText}>Make it Public</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
  uploadSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  uploadArea: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    borderStyle: 'dashed',
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  uploadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  uploadActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadActionDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(75, 85, 99, 0.5)',
  },
  uploadActionText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
  },
  successText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  instructionsSection: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 20,
    padding: 20,
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  instructionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  instructionText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
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
  makePublicButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  makePublicButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  makePublicButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  makePublicButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
});