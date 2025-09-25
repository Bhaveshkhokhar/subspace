import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { MessageCircle, X } from 'lucide-react-native';
import { storage } from '@/utils/storage';

interface WhatsappMessageModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string; // friend you're messaging
}

const MAX_CHARACTERS = 512;

export default function WhatsappMessageModal({
  visible,
  onClose,
  userId,
  username,
}: WhatsappMessageModalProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async () => {
    const authToken = await storage.getAuthToken();
    if (!message.trim() || !userId || !authToken) return;

    if (message.length > MAX_CHARACTERS) {
      setError(`Message cannot exceed ${MAX_CHARACTERS} characters`);
      return;
    }

    setIsSending(true);
    setSendStatus('sending');
    setError(null);

    try {
      const response = await fetch('https://db.subspace.money/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            mutation sendWhatsappMessage($user_id: uuid!, $username: String!, $message: String!) {
              whatsubSendMessageFromUser(request: {user_id: $user_id, username: $username, message: $message}) {
                affected_rows
              }
            }
          `,
          variables: { user_id: userId, username, message: message.trim() },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0]?.message || 'Failed to send WhatsApp message');
        setSendStatus('failed');
        return;
      }

      if (data.data?.whatsubSendMessageFromUser?.affected_rows > 0) {
        setSendStatus('success');
        setMessage('');
        setTimeout(() => {
          onClose();
          setSendStatus('idle');
        }, 2000);
      } else {
        setError('Failed to send WhatsApp message');
        setSendStatus('failed');
      }
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      setError('Network error. Please try again.');
      setSendStatus('failed');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#fff" />
          </TouchableOpacity>

          <MessageCircle size={28} color="#25D366" style={{ marginBottom: 12 }} />
          <Text style={styles.title}>Send WhatsApp Message</Text>
          <Text style={styles.subText}>Your message will be sent via WhatsApp</Text>

          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={MAX_CHARACTERS}
          />

          {/* Character counter */}
          <View style={styles.counterContainer}>
            <Text
              style={[
                styles.counter,
                message.length > MAX_CHARACTERS * 0.9 && { color: '#F59E0B' }, // yellow warning
                message.length >= MAX_CHARACTERS && { color: '#EF4444' }, // red if limit reached
              ]}
            >
              {message.length}/{MAX_CHARACTERS}
            </Text>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, isSending && { opacity: 0.7 }]}
            onPress={handleSendMessage}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Sending…</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  subText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    minHeight: 80,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  counterContainer: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  counter: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  error: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
