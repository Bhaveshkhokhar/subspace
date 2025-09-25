import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Pressable,
} from 'react-native';
import { Phone, X } from 'lucide-react-native';
import { storage } from '@/utils/storage';

interface CallUserModalProps {
    visible: boolean;
    onClose: () => void;
    userId: string;
    username: string; // friend you’re calling
}

export default function CallUserModal({
    visible,
    onClose,
    userId,
    username,
}: CallUserModalProps) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleCall = async () => {
        const authToken = await storage.getAuthToken();
        if (!userId || !authToken) return;

        setIsConnecting(true);
        setCallStatus('connecting');
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
            mutation CallUser($user_id: uuid!, $username: String!) {
              whatsubCallUserUsingPlivo(request: {user_id: $user_id, username: $username}) {
                affected_rows
              }
            }
          `,
                    variables: { user_id: userId, username },
                }),
            });

            const data = await response.json();

            if (data.errors) {
                setError(data.errors[0]?.message || 'Call failed');
                setCallStatus('failed');
                return;
            }

            if (data.data?.whatsubCallUserUsingPlivo?.affected_rows > 0) {
                setCallStatus('connected');
                setTimeout(() => {
                    onClose();
                    setCallStatus('idle');
                }, 2000);
            } else {
                setError('Call failed');
                setCallStatus('failed');
            }
        } catch (err) {
            console.error('Error initiating call:', err);
            setError('Network error');
            setCallStatus('failed');
        } finally {
            setIsConnecting(false);
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

                    <Phone size={28} color="#6366F1" style={{ marginBottom: 12 }} />
                    <Text style={styles.title}>Call User</Text>
                    <Text style={styles.subText}>Each minute will cost you ₹0.45</Text>

                    {error && <Text style={styles.error}>{error}</Text>}

                    <TouchableOpacity
                        style={[styles.button, isConnecting && { opacity: 0.7 }]}
                        onPress={handleCall}
                        disabled={isConnecting}
                    >
                        {isConnecting ? (
                            <>
                                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Connecting…</Text>
                            </>
                        ) : (
                            <Text style={styles.buttonText}>Call User</Text>
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
        width: '80%',
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
        marginBottom: 20,
    },
    error: {
        fontSize: 13,
        color: '#EF4444',
        marginBottom: 12,
    },
    button: {
        flexDirection: 'row',   // 👈 allow icon + text inline
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#6366F1',
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
