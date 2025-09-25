import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Star } from 'lucide-react-native';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';

const { width, height } = Dimensions.get('window');

interface RatingModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  targetUserId: string;
  targetUserName: string;
  targetUserImage?: string;
  type?: string;
}

export default function RatingModal({
  isVisible,
  onClose,
  onSuccess,
  onError,
  targetUserId,
  targetUserName,
  targetUserImage,
  type = 'admin'
}: RatingModalProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setRating(0);
      setReview('');
      setIsSubmitting(false);
      setIsFocused(false);
    }
  }, [isVisible]);

  const handleStarPress = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      onError?.('Please select a rating');
      return;
    }

    if (!review.trim()) {
      onError?.('Please write a review');
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = await storage.getUserId();
      const authToken = await storage.getAuthToken();

      if (!userId || !authToken) {
        onError?.('Authentication required');
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
            mutation MyMutation($user_id: uuid, $review: String, $rating: Int, $from_user_id: uuid, $type: String) {
              __typename
              insert_whatsub_admin_ratings(objects: {user_id: $user_id, from_user_id: $from_user_id, rating: $rating, review: $review, type: $type}, on_conflict: {constraint: whatsub_admin_rating_user_id_from_user_id_key, update_columns: [rating, review, type]}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_id: targetUserId,
            from_user_id: userId,
            rating: rating,
            review: review.trim(),
            type: type
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        onError?.(data.errors[0]?.message || 'Failed to submit rating');
        return;
      }

      if (data.data?.insert_whatsub_admin_ratings?.affected_rows > 0) {
        onSuccess?.();
        onClose();
      } else {
        onError?.('Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      onError?.('Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0]?.toUpperCase() || '';
    const last = parts[parts.length - 1]?.[0]?.toUpperCase() || '';
    return first + last;
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <LinearGradient
            colors={['#1F2937', '#374151']}
            style={styles.modalContainer}
          >
            {/* Header Indicator */}
            <View style={styles.headerIndicator} />

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* User Profile */}
              <View style={styles.userProfile}>
                <View style={styles.avatarContainer}>
                  {targetUserImage ? (
                    <Image
                      source={{ uri: targetUserImage }}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {getInitials(targetUserName)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userName}>{targetUserName}</Text>
              </View>

              {/* Star Rating */}
              <View style={styles.ratingSection}>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      style={styles.starButton}
                      onPress={() => handleStarPress(star)}
                      disabled={isSubmitting}
                      activeOpacity={0.7}
                    >
                      <Star
                        size={32}
                        color={star <= rating ? "#6366F1" : "#4B5563"}
                        fill={star <= rating ? "#6366F1" : "transparent"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                
                {rating > 0 && (
                  <View style={styles.ratingDisplay}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {rating}.0 ({rating === 1 ? '1 star' : `${rating} stars`})
                    </Text>
                  </View>
                )}
              </View>

              {/* Review Section */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewTitle}>
                  Share More About Your Experience
                </Text>
                
                <View style={[
                  styles.reviewInputContainer,
                  isFocused && styles.reviewInputContainerFocused
                ]}>
                  <TextInput
                    style={styles.reviewInput}
                    value={review}
                    onChangeText={setReview}
                    placeholder="Nice Experience."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    editable={!isSubmitting}
                  />
                  
                  {/* Character count */}
                  <View style={styles.characterCount}>
                    <Text style={styles.characterCountText}>
                      {review.length}/500
                    </Text>
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (rating === 0 || !review.trim() || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || !review.trim() || isSubmitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    rating === 0 || !review.trim() || isSubmitting
                      ? ['#6B7280', '#6B7280']
                      : ['#6366F1', '#8B5CF6']
                  }
                  style={styles.submitButtonGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Post</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    minHeight: height * 0.6,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    position: 'relative',
  },
  headerIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#6366F1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  userProfile: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  ratingText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  reviewSection: {
    marginBottom: 32,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  reviewInputContainer: {
    backgroundColor: 'rgba(55, 65, 81, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(75, 85, 99, 0.5)',
    padding: 16,
    minHeight: 120,
    position: 'relative',
  },
  reviewInputContainerFocused: {
    borderColor: '#6366F1',
  },
  reviewInput: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
    minHeight: 80,
    paddingBottom: 24,
  },
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  characterCountText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  submitButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
});