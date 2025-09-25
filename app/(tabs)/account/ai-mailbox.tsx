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
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ArrowLeft,
    Mail,
    Bot,
    Clock,
    Star,
    MessageSquare,
    Sparkles,
    ChevronRight,
    Inbox,
    Send,
    Archive,
    Play,
    Copy,
    Shield,
    Lock
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

interface HelpWidgetData {
    title: string;
    details: string;
    anim_url: string;
    type: string;
    data: any;
}

export const unstable_settings = {
    // Hides this route from deep linking and tab navigation
    href: null,
};

export default function AIMailboxScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const { short_mail } = params;
    const { toast, showSuccess, showError, hideToast } = useToast();
    const [emailData, setEmailData] = useState<string>('');
    const [emailData2, setEmailData2] = useState<string>('');
    const [helpWidgetData, setHelpWidgetData] = useState<HelpWidgetData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(null);

    useEffect(() => {
        initializeUser();
        loadEmailData();
    }, []);

    useEffect(() => {
        if (userId && authToken) {
            fetchHelpWidgetData();
        }
    }, [userId, authToken]);

    const handleBackPress = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/account');
        }
    };

    const loadEmailData = async () => {
        try {
            // const phoneNumber = await AsyncStorage.getItem('phone_number');
            const mailPrefix = await AsyncStorage.getItem('mail_prefix');
            const id = await storage.getUserId();
            if (id && mailPrefix) {
                setEmailData(`${id}@${mailPrefix}`);
            }
            if(short_mail && mailPrefix){
                setEmailData2(`${short_mail}@${mailPrefix}`)
            }
        } catch (error) {
            console.error('Error loading email data:', error);
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

    const fetchHelpWidgetData = async () => {
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
            query GetHelpWidgetDetails($key: String) {
              whatsub_help_widget(where: {key: {_eq: $key}}) {
                __typename
                title
                details
                anim_url
                type
                data
              }
            }
          `,
                    variables: {
                        key: "mailbox"
                    }
                })
            });

            const data = await response.json();

            if (data.errors) {
                console.error('Error fetching help widget data:', data.errors);
                showError('Failed to load mailbox data');
                return;
            }

            const widgetData = data.data?.whatsub_help_widget?.[0];
            setHelpWidgetData(widgetData || null);
        } catch (error) {
            console.error('Error fetching help widget data:', error);
            showError('Failed to load mailbox data');
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = async () => {
        setIsRefreshing(true);
        await fetchHelpWidgetData();
        setIsRefreshing(false);
    };

    const handleVideoPress = async () => {
        if (!helpWidgetData?.anim_url) {
            showError('Video not available');
            return;
        }

        try {
            const videoUrl = `https://www.youtube.com/watch?v=${helpWidgetData.data.url}`;
            await Linking.openURL(videoUrl);
        } catch (error) {
            console.error('Error opening video:', error);
            showError('Failed to open video');
        }
    };

    const handleCopyEmail = async () => {
        if (!emailData) {
            showError('Email not available');
            return;
        }

        try {
            if (Platform.OS === 'web') {
                // For web, use the Clipboard API
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    await navigator.clipboard.writeText(emailData);
                    showSuccess('Email copied to clipboard');
                } else {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = emailData;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    showSuccess('Email copied to clipboard');
                }
            } else {
                // For mobile platforms, use Expo Clipboard
                await Clipboard.setStringAsync(emailData);
                showSuccess('Email copied to clipboard');
            }
        } catch (error) {
            console.error('Error copying email:', error);
            showError('Failed to copy email');
        }

    };
    const handleCopyEmail2 = async () => {
        if (!emailData2) {
            showError('Email not available');
            return;
        }

        try {
            if (Platform.OS === 'web') {
                // For web, use the Clipboard API
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    await navigator.clipboard.writeText(emailData2);
                    showSuccess('Email copied to clipboard');
                } else {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = emailData2;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    showSuccess('Email copied to clipboard');
                }
            } else {
                // For mobile platforms, use Expo Clipboard
                await Clipboard.setStringAsync(emailData2);
                showSuccess('Email copied to clipboard');
            }
        } catch (error) {
            console.error('Error copying email:', error);
            showError('Failed to copy email');
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
                    <Text style={styles.headerTitle}>AI-powered Mailbox</Text>
                    <View style={styles.headerRight} />
                </View>

                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>Loading your AI mailbox...</Text>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
            style={styles.container}
        >
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBackPress}
                    >
                        <ArrowLeft size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>AI-powered Mailbox</Text>
                    <View style={styles.headerRight} />
                </View>

                {/* Main Mailbox Card */}
                <View style={styles.mailboxContainer}>
                    <View style={styles.mailboxCard}>
                        {/* Mail Icon */}
                        <View style={styles.mailIconContainer}>
                            <LinearGradient
                                colors={['#3B82F6', '#1D4ED8']}
                                style={styles.mailIcon}
                            >
                                <View style={styles.mailEnvelope}>
                                    <View style={styles.mailLines}>
                                        <View style={styles.mailLine} />
                                        <View style={styles.mailLine} />
                                        <View style={styles.mailLine} />
                                        <View style={styles.mailLine} />
                                    </View>
                                </View>
                                <View style={styles.mailNotification}>
                                    <View style={styles.notificationDot} />
                                </View>
                            </LinearGradient>
                        </View>

                        {/* Features List */}
                        <View style={styles.featuresList}>
                            <View style={styles.featureItem}>
                                <Shield size={16} color="#9CA3AF" />
                                <Text style={styles.featureText}>
                                    {helpWidgetData?.data?.effectiveness || '99%'} effective in blocking marketing and spam.
                                </Text>
                            </View>

                            <View style={styles.featureItem}>
                                <Lock size={16} color="#9CA3AF" />
                                <Text style={styles.featureText}>
                                    Only permitting transactional emails.
                                </Text>
                            </View>

                            <View style={styles.featureItem}>
                                <MessageSquare size={16} color="#9CA3AF" />
                                <Text style={styles.featureText}>
                                    Your mail will arrive in the group chat.
                                </Text>
                            </View>
                        </View>

                        {/* How to use Section */}
                        <TouchableOpacity
                            style={styles.howToUseCard}
                            onPress={handleVideoPress}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#1E3A8A', '#3730A3']}
                                style={styles.howToUseGradient}
                            >
                                <View style={styles.howToUseContent}>
                                    <View style={styles.howToUseText}>
                                        <Text style={styles.howToUseTitle}>
                                            {helpWidgetData?.title || 'How to use Subspace Mail?'}
                                        </Text>
                                        <Text style={styles.howToUseSubtitle}>
                                            {helpWidgetData?.details || 'Takes a minute to understand how it works.'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.videoButton}
                                        onPress={handleVideoPress}
                                    >
                                        <Play size={20} color="white" fill="white" />
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.emailContainer}>
                            <TouchableOpacity
                                style={styles.emailCard}
                                onPress={handleCopyEmail}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.emailText}>
                                    {emailData}
                                </Text>
                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={handleCopyEmail}
                                >
                                    <Copy size={16} color="#6366F1" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.emailContainer}>
                            <TouchableOpacity
                                style={styles.emailCard}
                                onPress={handleCopyEmail2}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.emailText}>
                                    {emailData2}
                                </Text>
                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={handleCopyEmail2}
                                >
                                    <Copy size={16} color="#6366F1" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </View>
                    </View>
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
    mailboxContainer: {
        paddingHorizontal: 10,
        marginBottom: 32,
    },
    mailboxCard: {
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(55, 65, 81, 0.5)',
        padding: 24,
        alignItems: 'center',
    },
    mailIconContainer: {
        marginBottom: 32,
    },
    mailIcon: {
        width: 120,
        height: 90,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    mailEnvelope: {
        width: 80,
        height: 60,
        backgroundColor: 'white',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    mailLines: {
        gap: 4,
    },
    mailLine: {
        width: 40,
        height: 3,
        backgroundColor: '#EF4444',
        borderRadius: 2,
    },
    mailNotification: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#3B82F6',
    },
    notificationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    featuresList: {
        width: '100%',
        marginBottom: 24,
        gap: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 14,
        color: '#9CA3AF',
        flex: 1,
        lineHeight: 20,
    },
    howToUseCard: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
    },
    howToUseGradient: {
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderRadius: 16,
    },
    howToUseContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    howToUseText: {
        flex: 1,
    },
    howToUseTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    howToUseSubtitle: {
        fontSize: 12,
        color: '#F59E0B',
        lineHeight: 16,
    },
    videoButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#8B5CF6',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    emailContainer: {
        width: '100%',
    },
    emailCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(55, 65, 81, 0.5)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderStyle: 'dashed',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    emailText: {
        fontSize: 14,
        fontWeight: '500',
        color: 'white',
        flex: 1,
        fontFamily: 'monospace',
    },
    copyButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(55, 65, 81, 0.5)',
        marginHorizontal: 20,
        padding: 20,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    infoContent: {
        gap: 16,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoItemIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 14,
        color: '#9CA3AF',
        lineHeight: 20,
        flex: 1,
    },
});