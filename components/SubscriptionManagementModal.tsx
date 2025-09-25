import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Switch,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { X, CircleStop as StopCircle, CirclePlay as PlayCircle, CreditCard as Edit, Trash2, Plus, ChevronDown, Calendar, Check } from 'lucide-react-native';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import { router } from 'expo-router';
import DatePicker from '@/components/DatePicker';

const { width, height } = Dimensions.get('window');

interface ServiceDetails {
    id: string;
    image_url: string;
    service_name: string;
    whatsub_plans: Array<{
        id: string;
        price: number;
        plan_name: string;
        display_data: string;
        accounts: number;
    }>;
}

interface UserSubscription {
    id: string;
    service_image_url: string;
    service_name: string;
    plan: string;
    plan_id: string;
    room_id: string | null;
    price: number;
    status: string;
    expiring_at: string;
    is_public: boolean;
    type: string;
    service_id?: string;
}

interface SubscriptionManagementModalProps {
    isVisible: boolean;
    onClose: () => void;
    subscription?: UserSubscription | null;
    serviceId?: string;
    onSuccess?: () => void;
    mode?: 'manage' | 'add';
}

export default function SubscriptionManagementModal({
    isVisible,
    onClose,
    subscription,
    serviceId,
    onSuccess,
    mode = subscription ? 'manage' : 'add'
}: SubscriptionManagementModalProps) {
    const { t } = useTranslation();
    const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState<Date>(new Date());
    const [expiryDateString, setExpiryDateString] = useState<string>('');
    const [isPublic, setIsPublic] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isStoppingSubscription, setIsStoppingSubscription] = useState(false);
    const [isRemovingSubscription, setIsRemovingSubscription] = useState(false);
    const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
    const [isContinuingSubscription, setIsContinuingSubscription] = useState(false);
    const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPlanSelector, setShowPlanSelector] = useState(false);

    useEffect(() => {
        if (isVisible) {
            if (mode === 'add' && serviceId) {
                fetchServiceDetails(serviceId);
                const futureDate = new Date();
                futureDate.setMonth(futureDate.getMonth() + 1);
                setSubscriptionExpiryDate(futureDate);
                setExpiryDateString(formatDateForDisplay(futureDate));
            } else if (mode === 'manage' && subscription) {
                setSelectedPlan(subscription.plan_id || '');
                setIsPublic(subscription.is_public || true);
                if (subscription.expiring_at) {
                    const expiryDate = new Date(subscription.expiring_at);
                    setSubscriptionExpiryDate(expiryDate);
                    setExpiryDateString(formatDateForDisplay(expiryDate));
                }
                const targetServiceId = serviceId || subscription.service_id;
                if (targetServiceId) {
                    fetchServiceDetails(targetServiceId);
                }
            }
        }
    }, [isVisible, mode, serviceId, subscription]);


    const hasChanges = useMemo(() => {
        return selectedPlan !== subscription?.plan_id ||
            subscriptionExpiryDate?.toISOString().slice(0, 10) !== subscription?.expiring_at ||
            isPublic !== subscription?.is_public;
    }, [selectedPlan, subscriptionExpiryDate, isPublic, subscription]);


    const formatDateForDisplay = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const fetchServiceDetails = async (serviceId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const authToken = await storage.getAuthToken();
            if (!authToken) {
                setError('Authentication required');
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
            query GetServiceDetails($serviceId: uuid = "") {
              __typename
              whatsub_services(where: {id: {_eq: $serviceId}}) {
                __typename
                id
                image_url
                service_name
                whatsub_plans(where: {status: {_eq: "active"}, is_plan: {_eq: true}}) {
                  __typename
                  id
                  price
                  plan_name
                  display_data
                  accounts
                }
              }
            }
          `,
                    variables: {
                        serviceId: serviceId
                    }
                })
            });

            const data = await response.json();

            if (data.errors) {
                setError('Failed to load service details');
                return;
            }

            const service = data.data?.whatsub_services?.[0];
            if (!service) {
                setError('Service not found');
                return;
            }

            setServiceDetails(service);
            if (service.whatsub_plans.length > 0 && mode === 'add') {
                setSelectedPlan(service.whatsub_plans[0].id);
            }
        } catch (error) {
            console.error('Error fetching service details:', error);
            setError('Failed to load service details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSubscription = async () => {
        if (!subscription) return;

        const selectedPlanDetails = serviceDetails?.whatsub_plans.find(plan => plan.id === selectedPlan);
        if (!selectedPlan || !selectedPlanDetails) {
            setError('Please select a plan');
            return;
        }

        setIsUpdatingSubscription(true);
        setError(null);

        try {
            const authToken = await storage.getAuthToken();
            if (!authToken) {
                setError('Authentication required');
                return;
            }

            const formattedExpiryDate = subscriptionExpiryDate.toISOString().split('T')[0];

            const response = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: `
            mutation updateUserSub($id: uuid, $plan_id: uuid, $plan: String, $price: numeric, $expiring_at: date, $is_public: Boolean) {
              __typename
              update_whatsub_users_subscription(where: {id: {_eq: $id}}, _set: {plan_id: $plan_id, plan: $plan, price: $price, expiring_at: $expiring_at, is_public: $is_public}) {
                __typename
                affected_rows
              }
            }
          `,
                    variables: {
                        id: subscription.id,
                        plan_id: selectedPlan,
                        plan: selectedPlanDetails.plan_name,
                        price: selectedPlanDetails.price,
                        expiring_at: formattedExpiryDate,
                        is_public: isPublic
                    }
                })
            });

            const data = await response.json();

            if (data.errors) {
                setError(data.errors[0]?.message || 'Failed to update subscription');
                return;
            }

            if (data.data?.update_whatsub_users_subscription?.affected_rows > 0) {
                onSuccess?.();
                onClose();
            } else {
                setError('Failed to update subscription');
            }
        } catch (error) {
            console.error('Error updating subscription:', error);
            setError('Failed to update subscription');
        } finally {
            setIsUpdatingSubscription(false);
        }
    };

    const handleContinueSubscription = async () => {
        if (!subscription) return;

        setIsContinuingSubscription(true);
        setError(null);

        try {
            const authToken = await storage.getAuthToken();
            if (!authToken) {
                setError('Authentication required');
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
            mutation MyMutation($user_subscription_id: uuid!) {
              __typename
              update_whatsub_users_subscription(where: {id: {_eq: $user_subscription_id}}, _set: {status: "active"}) {
                __typename
                affected_rows
              }
            }
          `,
                    variables: {
                        user_subscription_id: subscription.id
                    }
                })
            });

            const data = await response.json();

            if (data.errors) {
                setError(data.errors[0]?.message || 'Failed to continue subscription');
                return;
            }

            if (data.data?.update_whatsub_users_subscription?.affected_rows > 0) {
                onSuccess?.();
                onClose();

                // Navigate to home tab to see updated subscriptions
                router.replace('/(tabs)/home');
            } else {
                setError('Failed to continue subscription');
            }
        } catch (error) {
            console.error('Error continuing subscription:', error);
            setError('Failed to continue subscription');
        } finally {
            setIsContinuingSubscription(false);
        }
    };

    const handleStopSubscription = async () => {
        if (!subscription) return;

        setIsStoppingSubscription(true);
        setError(null);

        try {
            const authToken = await storage.getAuthToken();
            if (!authToken) {
                setError('Authentication required');
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
            mutation StopUserSub($subscription_id: uuid!) {
              __typename
              update_whatsub_users_subscription(where: {id: {_eq: $subscription_id}}, _set: {status: "stop"}) {
                __typename
                affected_rows
              }
            }
          `,
                    variables: {
                        subscription_id: subscription.id
                    }
                })
            });

            const data = await response.json();

            if (data.errors) {
                setError(data.errors[0]?.message || 'Failed to stop subscription');
                return;
            }

            if (data.data?.update_whatsub_users_subscription?.affected_rows > 0) {
                onSuccess?.();
                onClose();

                // Navigate to home tab to see updated subscriptions
                router.replace('/(tabs)/home');
            } else {
                setError('Failed to stop subscription');
            }
        } catch (error) {
            console.error('Error stopping subscription:', error);
            setError('Failed to stop subscription');
        } finally {
            setIsStoppingSubscription(false);
        }
    };

    const handleRemoveSubscription = async () => {
        if (!subscription) return;

        setIsRemovingSubscription(true);
        setError(null);

        try {
            const authToken = await storage.getAuthToken();
            if (!authToken) {
                setError('Authentication required');
                return;
            }

            // Use different mutation based on whether subscription has a room_id
            const mutation = subscription.room_id ? `
        mutation MyMutation($user_subscription_id: uuid, $room_id: uuid) {
          __typename
          update_whatsub_users_subscription(where: {id: {_eq: $user_subscription_id}}, _set: {status: "inactive"}) {
            __typename
            affected_rows
          }
          update_whatsub_rooms(where: {id: {_eq: $room_id}}, _set: {status: "inactive", is_public: false}) {
            __typename
            affected_rows
          }
        }
      ` : `
        mutation DeleteSubscription($subscription_id: uuid!) {
          __typename
          update_whatsub_users_subscription(where: {id: {_eq: $subscription_id}}, _set: {status: "inactive"}) {
            __typename
            affected_rows
          }
        }
      `;

            const variables = subscription.room_id ? {
                user_subscription_id: subscription.id,
                room_id: subscription.room_id
            } : {
                subscription_id: subscription.id
            };

            const response = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: mutation,
                    variables: variables
                })
            });

            const data = await response.json();

            if (data.errors) {
                setError(data.errors[0]?.message || 'Failed to delete subscription');
                return;
            }

            // Check success based on mutation type
            const subscriptionResult = data.data?.update_whatsub_users_subscription;
            const roomResult = subscription.room_id ? data.data?.update_whatsub_rooms : { affected_rows: 1 };

            if (subscriptionResult?.affected_rows > 0 && roomResult?.affected_rows > 0) {
                onSuccess?.();
                onClose();

                // Navigate to home tab to see updated subscriptions
                router.replace('/(tabs)/home');
            } else {
                setError('Failed to delete subscription');
            }
        } catch (error) {
            console.error('Error removing subscription:', error);
            setError('Failed to delete subscription');
        } finally {
            setIsRemovingSubscription(false);
        }
    };

    const handleCreateSubscription = async () => {
        if (!serviceDetails || !selectedPlan) {
            setError('Please select a plan');
            return;
        }

        const selectedPlanDetails = serviceDetails.whatsub_plans.find(plan => plan.id === selectedPlan);
        if (!selectedPlanDetails) {
            setError('Selected plan not found');
            return;
        }

        setIsCreatingSubscription(true);
        setError(null);

        try {
            const userId = await storage.getUserId();
            const authToken = await storage.getAuthToken();

            if (!userId || !authToken) {
                setError('Authentication required');
                return;
            }

            const formattedExpiryDate = subscriptionExpiryDate.toISOString().split('T')[0];

            const response = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: `
            mutation CreateSubscription($service_id: uuid, $expiring_at: date, $share_limit: Int, $plan: String, $plan_id: uuid, $price: numeric, $service_image_url: String, $user_id: uuid, $service_name: String, $is_public: Boolean, $is_assisted: Boolean, $type: String) {
              __typename
              insert_whatsub_users_subscription(objects: {plan: $plan, service_id: $service_id, plan_id: $plan_id, price: $price, service_image_url: $service_image_url, user_id: $user_id, expiring_at: $expiring_at, share_limit: $share_limit, service_name: $service_name, is_public: $is_public, is_assisted: $is_assisted, type: $type}) {
                __typename
                affected_rows
              }
            }
          `,
                    variables: {
                        service_id: serviceDetails.id,
                        expiring_at: formattedExpiryDate,
                        share_limit: selectedPlanDetails.accounts,
                        plan: selectedPlanDetails.plan_name,
                        plan_id: selectedPlan,
                        price: selectedPlanDetails.price,
                        service_image_url: serviceDetails.image_url,
                        user_id: userId,
                        service_name: serviceDetails.service_name,
                        is_public: isPublic,
                        is_assisted: false,
                        type: "admin"
                    }
                })
            });

            const data = await response.json();

            if (data.errors) {
                setError(data.errors[0]?.message || 'Failed to add subscription');
                return;
            }

            if (data.data?.insert_whatsub_users_subscription?.affected_rows > 0) {
                onSuccess?.();
                onClose();

                // Navigate to home tab and scroll to recurring expenses section
                router.replace('/(tabs)/home');
            } else {
                setError('Failed to add subscription');
            }

        } catch (error) {
            console.error('Error creating subscription:', error);
            setError('Failed to add subscription');
        } finally {
            setIsCreatingSubscription(false);
        }
    };

    const handleDateSelect = (date: Date) => {
        setSubscriptionExpiryDate(date);
        setExpiryDateString(formatDateForDisplay(date));
    };

    const getCurrentService = () => {
        if (mode === 'add') {
            return serviceDetails;
        } else {
            return {
                id: subscription?.id || '',
                image_url: subscription?.service_image_url || '',
                service_name: subscription?.service_name || '',
                whatsub_plans: serviceDetails?.whatsub_plans || []
            };
        }
    };

    const getCurrentPrice = () => {
        if (mode === 'add') {
            return serviceDetails?.whatsub_plans.find(plan => plan.id === selectedPlan)?.price || 0;
        } else {
            return subscription?.price || 0;
        }
    };

    const getCurrentPlanName = () => {
        if (mode === 'add') {
            return serviceDetails?.whatsub_plans.find(plan => plan.id === selectedPlan)?.plan_name;
        } else {
            return subscription?.plan;
        }
    };

    const getSelectedPlanDetails = () => {
        return serviceDetails?.whatsub_plans.find(plan => plan.id === selectedPlan);
    };

    if (!isVisible) return null;

    if (isLoading) {
        return (
            <Modal visible={isVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                </View>
            </Modal>
        );
    }

    const currentService = getCurrentService();

    return (
        <Modal visible={isVisible} transparent animationType="slide" >
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>
                                {mode === 'add' ? t('subscription.add') : t('subscription.manage')}
                            </Text>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                            <>
                                {/* Service Header */}
                                <View style={styles.serviceHeader}>
                                    <View style={styles.serviceLogoContainer}>
                                        <Image
                                            source={{ uri: currentService?.image_url || '' }}
                                            style={styles.serviceLogo}
                                            resizeMode="contain"
                                        />
                                    </View>

                                    <View style={styles.serviceInfo}>
                                        <Text style={styles.serviceName}>
                                            {currentService?.service_name}
                                        </Text>
                                        <Text style={styles.servicePlan}>
                                            {getCurrentPlanName()}
                                        </Text>

                                        {/* Status Badges for manage mode */}
                                        {mode === 'manage' && subscription && (
                                            <View style={styles.statusBadges}>
                                                <View style={[
                                                    styles.statusBadge,
                                                    subscription.status === 'stop' ? styles.stoppedBadge : styles.activeBadge
                                                ]}>
                                                    <Text style={styles.statusBadgeText}>
                                                        {subscription.status === 'stop' ? 'Stopped' : 'Active'}
                                                    </Text>
                                                </View>
                                                <View style={[
                                                    styles.statusBadge,
                                                    subscription.is_public ? styles.publicBadge : styles.privateBadge
                                                ]}>
                                                    <Text style={styles.statusBadgeText}>
                                                        {subscription.is_public ? 'Public' : 'Private'}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.priceContainer}>
                                        <Text style={styles.priceAmount}>₹{getCurrentPrice()}</Text>
                                        <Text style={styles.priceLabel}>{t('subscription.perMonth')}</Text>
                                    </View>
                                </View>

                                {/* Form Fields */}
                                {serviceDetails && (
                                    <View style={styles.formContainer}>
                                        {serviceDetails.whatsub_plans.length === 0 ? (
                                            /* No Plans Available */
                                            <View style={styles.noPlansContainer}>
                                                <Text style={styles.noPlansText}>
                                                    No Plans Available for this service
                                                </Text>
                                            </View>
                                        ) : (
                                            <>
                                                {/* Plan Selection */}
                                                <View style={styles.fieldContainer}>
                                                    <Text style={styles.fieldLabel}>{t('subscription.plan')}</Text>
                                                    <TouchableOpacity
                                                        style={styles.selectorContainer}
                                                        onPress={() => setShowPlanSelector(true)}
                                                    >
                                                        <Text style={styles.selectorText}>
                                                            {getSelectedPlanDetails()?.plan_name || t('subscription.choosePlan')}
                                                        </Text>
                                                        <ChevronDown size={20} color="#9CA3AF" />
                                                    </TouchableOpacity>

                                                    {/* Plan Selector Modal */}
                                                    <Modal
                                                        visible={showPlanSelector}
                                                        transparent
                                                        animationType="slide"
                                                        onRequestClose={() => setShowPlanSelector(false)}
                                                    >
                                                        <View style={styles.selectorModalOverlay}>
                                                            <View style={styles.selectorModalContainer}>
                                                                <View style={styles.selectorModalHeader}>
                                                                    <Text style={styles.selectorModalTitle}>{t('subscription.plan')}</Text>
                                                                    <TouchableOpacity
                                                                        style={styles.selectorModalClose}
                                                                        onPress={() => setShowPlanSelector(false)}
                                                                    >
                                                                        <X size={20} color="white" />
                                                                    </TouchableOpacity>
                                                                </View>

                                                                <ScrollView style={styles.selectorModalContent}>
                                                                    {serviceDetails.whatsub_plans.map((plan) => (
                                                                        <TouchableOpacity
                                                                            key={plan.id}
                                                                            style={[
                                                                                styles.planOption,
                                                                                selectedPlan === plan.id && styles.selectedPlanOption
                                                                            ]}
                                                                            onPress={() => {
                                                                                setSelectedPlan(plan.id);
                                                                                setShowPlanSelector(false);
                                                                            }}
                                                                        >
                                                                            <View style={styles.planOptionContent}>
                                                                                <View style={styles.planOptionHeader}>
                                                                                    <Text style={styles.planOptionName}>{plan.plan_name}</Text>
                                                                                    <Text style={styles.planOptionPrice}>₹{plan.price}</Text>
                                                                                </View>

                                                                                {plan.display_data && (
                                                                                    <Text style={styles.planOptionDescription}>{plan.display_data}</Text>
                                                                                )}

                                                                                <View style={styles.planOptionFeatures}>
                                                                                    <Text style={styles.planOptionFeature}>
                                                                                        {plan.accounts}{plan.accounts > 1 ? t('common.accounts') : t('common.account')}
                                                                                    </Text>
                                                                                </View>
                                                                            </View>
                                                                        </TouchableOpacity>
                                                                    ))}
                                                                </ScrollView>
                                                            </View>
                                                        </View>
                                                    </Modal>
                                                </View>

                                                {/* Expiry Date */}
                                                <View style={styles.fieldContainer}>
                                                    <Text style={styles.fieldLabel}>{t('subscription.expiryDate')}</Text>
                                                    <TouchableOpacity
                                                        style={styles.dateInput}
                                                        onPress={() => setShowDatePicker(true)}
                                                    >
                                                        <Text style={styles.dateText}>{expiryDateString}</Text>
                                                        <Calendar size={20} color="#9CA3AF" />
                                                    </TouchableOpacity>

                                                    {/* Date Picker */}
                                                    <DatePicker
                                                        isVisible={showDatePicker}
                                                        onClose={() => setShowDatePicker(false)}
                                                        onDateSelect={handleDateSelect}
                                                        selectedDate={subscriptionExpiryDate}
                                                        minDate={new Date()}
                                                        modalTitle={t('subscription.selectExpiryDate')}
                                                        quickSelectOptions={[
                                                            { label: 'Next Month', days: 30 },
                                                            { label: '3 Months', days: 90 },
                                                            { label: '6 Months', days: 180 },
                                                            { label: '1 Year', days: 365 },
                                                        ]}
                                                    />
                                                </View>

                                                {/* Make Public Toggle */}
                                                <View style={styles.fieldContainer}>
                                                    <View style={styles.toggleContainer}>
                                                        <View style={styles.toggleInfo}>
                                                            <Text style={styles.fieldLabel}>{t('subscription.makePublic')}</Text>
                                                            <Text style={styles.toggleWarning}>
                                                                {t('subscription.publicWarning')}
                                                            </Text>
                                                        </View>
                                                        <Switch
                                                            value={isPublic}
                                                            onValueChange={setIsPublic}
                                                            trackColor={{ false: '#374151', true: '#6366F1' }}
                                                            thumbColor={isPublic ? '#FFFFFF' : '#9CA3AF'}
                                                            ios_backgroundColor="#374151"
                                                        />
                                                    </View>
                                                </View>
                                            </>
                                        )}
                                    </View>
                                )}

                                {/* Action Buttons */}
                                {/* Only show action buttons if there are plans available or in manage mode */}
                                {mode === 'manage' || (mode === 'add' && serviceDetails && serviceDetails.whatsub_plans.length > 0) ? (
                                    <View style={styles.actionContainer}>
                                        {mode === 'add' ? (
                                            <TouchableOpacity
                                                style={[
                                                    styles.primaryButton,
                                                    styles.addButton,
                                                    isCreatingSubscription && styles.disabledButton
                                                ]}
                                                onPress={handleCreateSubscription}
                                                disabled={isCreatingSubscription}
                                            >
                                                {isCreatingSubscription ? (
                                                    <ActivityIndicator size="small" color="white" />
                                                ) : (
                                                    <>
                                                        <Plus size={20} color="white" />
                                                        <Text style={styles.primaryButtonText}>{t('subscription.addToTrack')}</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        ) : (
                                            <>
                                                <View style={styles.buttonCol}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.secondaryButton,
                                                            styles.continueButton,
                                                            (hasChanges && styles.updateButton),
                                                            (subscription?.status === 'active' && styles.stopButton),
                                                            (isStoppingSubscription || isContinuingSubscription || isUpdatingSubscription) && styles.disabledButton
                                                        ]}
                                                        onPress={() => {
                                                            if (hasChanges) {
                                                                handleUpdateSubscription();
                                                            } else if (subscription?.status === 'active') {
                                                                handleStopSubscription();
                                                            } else {
                                                                handleContinueSubscription(); // If not active
                                                            }
                                                        }}
                                                        disabled={(isStoppingSubscription || isContinuingSubscription || isUpdatingSubscription)}
                                                    >
                                                        {(isStoppingSubscription || isContinuingSubscription || isUpdatingSubscription) ? (
                                                            <ActivityIndicator size="small" color="white" />
                                                        ) : (
                                                            <>
                                                                {hasChanges ? (
                                                                    <>
                                                                        <Edit size={18} color="white" />
                                                                        <Text style={styles.primaryButtonText}>{t('subscription.update')}</Text>
                                                                    </>
                                                                ) : (subscription?.status === 'active') ? (
                                                                    <>
                                                                        <StopCircle size={18} color="white" />
                                                                        <Text style={styles.primaryButtonText}>{t('subscription.stop')}</Text>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <PlayCircle size={18} color="white" />
                                                                        <Text style={styles.primaryButtonText}>{t('subscription.continue')}</Text>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </TouchableOpacity>


                                                    <TouchableOpacity
                                                        style={[
                                                            styles.primaryButton,
                                                            styles.deleteButton,
                                                            isRemovingSubscription && styles.disabledButton
                                                        ]}
                                                        onPress={handleRemoveSubscription}
                                                        disabled={isRemovingSubscription}
                                                    >
                                                        {isRemovingSubscription ? (
                                                            <ActivityIndicator size="small" color="white" />
                                                        ) : (
                                                            <>
                                                                <Trash2 size={18} color="white" />
                                                                <Text style={styles.primaryButtonText}>{t('subscription.delete')}</Text>
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </>
                                        )}
                                    </View>
                                ) : null}

                                {/* Error Message */}
                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}
                            </>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#121212',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height:height*0.8,
        borderWidth: 1,
        borderColor: '#374151',
        marginHorizontal: 5
    },
    loadingContainer: {
        backgroundColor: '#121212',
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        margin: 20,
    },
    loadingText: {
        color: '#9CA3AF',
        marginTop: 16,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    serviceHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        gap: 8,
    },
    serviceLogoContainer: {
        width: 70,
        height: 70,
        borderRadius: 40,
        backgroundColor: 'transparent',
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceLogo: {
        width: '100%',
        height: '100%',
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    servicePlan: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 8,
    },
    statusBadges: {
        flexDirection: 'row',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    activeBadge: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    stoppedBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#EF4444',
    },
    publicBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10B981',
    },
    privateBadge: {
        backgroundColor: '#6B7280',
        borderColor: '#6B7280',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    priceAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#6366F1',
    },
    priceLabel: {
        fontSize: 12,
        color: '#6366F1',
    },
    formContainer: {
        padding: 24,
        gap: 24,
    },
    fieldContainer: {
        gap: 8,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    selectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#374151',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4B5563',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    selectorText: {
        fontSize: 16,
        color: 'white',
    },
    selectorModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    selectorModalContainer: {
        backgroundColor: '#1F2937',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    selectorModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    selectorModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    selectorModalClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(55, 65, 81, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectorModalContent: {
        padding: 20,
    },
    planOption: {
        backgroundColor: '#374151',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#4B5563',
        padding: 20,
        marginBottom: 12,
        position: 'relative',
    },
    selectedPlanOption: {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: '#6366F1',
    },
    planOptionContent: {
        gap: 8,
    },
    planOptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    planOptionName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    planOptionPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6366F1',
    },
    planOptionDescription: {
        fontSize: 14,
        color: '#9CA3AF',
        lineHeight: 20,
    },
    planOptionFeatures: {
        marginTop: 4,
    },
    planOptionFeature: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    selectedPlanIndicator: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#374151',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4B5563',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dateText: {
        fontSize: 16,
        color: 'white',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
    },
    toggleInfo: {
        flex: 1,
    },
    toggleWarning: {
        fontSize: 14,
        color: '#EF4444',
        marginTop: 4,
        lineHeight: 20,
    },
    actionContainer: {
        padding: 24,
        gap: 16,
    },
    buttonCol: {
        flexDirection: 'column',
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#6366F1',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 12,
        gap: 6,
    },
    addButton: {
        backgroundColor: '#6366F1',
    },
    stopButton: {
        backgroundColor: '#F59E0B',
    },
    continueButton: {
        backgroundColor: '#10B981',
    },
    updateButton: {
        backgroundColor: '#3B82F6',
    },
    deleteButton: {
        backgroundColor: '#EF4444',
    },
    disabledButton: {
        opacity: 0.6,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        padding: 16,
        marginHorizontal: 24,
        marginBottom: 24,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
    },
    noPlansContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    noPlansText: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 24,
    },
});