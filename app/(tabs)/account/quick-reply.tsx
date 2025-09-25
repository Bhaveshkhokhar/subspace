import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Plus,
  X,
  Trash2,
  MessageSquare,
  CircleAlert as AlertCircle
} from 'lucide-react-native';
import { router } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface QuickReply {
  message: string;
  shortcut: string;
}

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function QuickReplyScreen() {
  const { t } = useTranslation();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShortcut, setNewShortcut] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId && authToken) {
      fetchQuickReplies();
    }
  }, [userId, authToken]);

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

  const fetchQuickReplies = async () => {
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
            query getQuickReply($user_id: uuid) {
              __typename
              whatsub_quick_reply(where: {user_id: {_eq: $user_id}}) {
                __typename
                message
                shortcut
              }
            }
          `,
          variables: {
            user_id: userId
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error fetching quick replies:', data.errors);
        showError('Failed to load quick replies');
        return;
      }

      setQuickReplies(data.data?.whatsub_quick_reply || []);
    } catch (error) {
      console.error('Error fetching quick replies:', error);
      showError('Failed to load quick replies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQuickReply = async () => {
    if (!newShortcut.trim() || !newMessage.trim()) {
      setError('Please fill in both shortcut and message');
      return;
    }

    if (!userId || !authToken) {
      setError('Authentication required');
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
            mutation addQuickReply($user_id: uuid, $message: String, $shortcut: String) {
              __typename
              insert_whatsub_quick_reply_one(object: {user_id: $user_id, message: $message, shortcut: $shortcut}, on_conflict: {constraint: whatsub_quick_reply_user_id_shortcut_key, update_columns: [message]}) {
                __typename
                user_id
              }
            }
          `,
          variables: {
            user_id: userId,
            message: newMessage.trim(),
            shortcut: newShortcut.trim()
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error adding quick reply:', data.errors);
        setError('Failed to add quick reply');
        return;
      }

      if (data.data?.insert_whatsub_quick_reply_one?.user_id) {
        // Update local state
        const existingIndex = quickReplies.findIndex(reply => reply.shortcut === newShortcut.trim());
        if (existingIndex !== -1) {
          // Update existing
          const updatedReplies = [...quickReplies];
          updatedReplies[existingIndex] = { shortcut: newShortcut.trim(), message: newMessage.trim() };
          setQuickReplies(updatedReplies);
          showSuccess('Quick reply updated successfully');
        } else {
          // Add new
          setQuickReplies(prev => [...prev, { shortcut: newShortcut.trim(), message: newMessage.trim() }]);
          showSuccess('Quick reply added successfully');
        }

        // Reset form and close modal
        setNewShortcut('');
        setNewMessage('');
        setShowAddModal(false);
      } else {
        setError('Failed to add quick reply');
      }
    } catch (error) {
      console.error('Error adding quick reply:', error);
      setError('Failed to add quick reply');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuickReply = async (shortcut: string) => {
    if (!userId || !authToken) return;

    setIsDeleting(shortcut);
    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          query: `
            mutation deleteQuickReply($user_id: uuid, $shortcut: String) {
              __typename
              delete_whatsub_quick_reply(where: {user_id: {_eq: $user_id}, shortcut: {_eq: $shortcut}}) {
                __typename
                affected_rows
              }
            }
          `,
          variables: {
            user_id: userId,
            shortcut: shortcut
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Error deleting quick reply:', data.errors);
        showError('Failed to delete quick reply');
        return;
      }

      if (data.data?.delete_whatsub_quick_reply?.affected_rows > 0) {
        setQuickReplies(prev => prev.filter(reply => reply.shortcut !== shortcut));
        showSuccess('Quick reply deleted successfully');
      } else {
        showError('Failed to delete quick reply');
      }
    } catch (error) {
      console.error('Error deleting quick reply:', error);
      showError('Failed to delete quick reply');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setNewShortcut('');
    setNewMessage('');
    setError(null);
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
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Reply</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading quick replies...</Text>
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
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Reply</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Quick Replies List */}
        <View style={styles.repliesContainer}>
          {quickReplies.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MessageSquare size={48} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>No Quick Replies</Text>
              <Text style={styles.emptySubtitle}>
                Create quick replies to send messages faster
              </Text>
            </View>
          ) : (
            quickReplies.map((reply, index) => (
              <View key={reply.shortcut} style={styles.replyItem}>
                <View style={styles.replyContent}>
                  <Text style={styles.replyShortcut}>{reply.shortcut}</Text>
                  <Text style={styles.replyMessage} numberOfLines={2}>
                    {reply.message}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteQuickReply(reply.shortcut)}
                  disabled={isDeleting === reply.shortcut}
                >
                  {isDeleting === reply.shortcut ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Trash2 size={16} color="#EF4444" />
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>

      {/* Add Quick Reply Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <LinearGradient
              colors={['#374151cc', '#374151cc']}
              style={styles.modalContainer}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={handleCloseModal}
                >
                  <X size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add Quick Reply</Text>
                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    (!newShortcut.trim() || !newMessage.trim() || isSaving) && styles.modalSaveButtonDisabled
                  ]}
                  onPress={handleAddQuickReply}
                  disabled={!newShortcut.trim() || !newMessage.trim() || isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#6366F1" />
                  ) : (
                    <Text style={[
                      styles.modalSaveText,
                      (!newShortcut.trim() || !newMessage.trim()) && styles.modalSaveTextDisabled
                    ]}>
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Modal Content */}
              <View style={styles.modalContent}>
                {error && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Shortcut Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>shortcut</Text>
                  <TextInput
                    style={styles.input}
                    value={newShortcut}
                    onChangeText={setNewShortcut}
                    placeholder="Enter shortcut"
                    placeholderTextColor="#6B7280"
                    autoCapitalize="none"
                    maxLength={20}
                  />
                  <Text style={styles.helperText}>
                    A word that will quickly retrieve this reply
                  </Text>
                </View>

                {/* Message Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reply message</Text>
                  <TextInput
                    style={[styles.input, styles.messageInput]}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Enter text or select media"
                    placeholderTextColor="#6B7280"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>
              </View>
            </LinearGradient>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
    paddingBottom: 10,
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
  repliesContainer: {
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
  },
  replyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    padding: 16,
    marginBottom: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyShortcut: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  replyMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    fontWeight: '800',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  modalSaveTextDisabled: {
    color: '#6B7280',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
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
  messageInput: {
    minHeight: 100,
    maxHeight: 150,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    lineHeight: 16,
  },
});