import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Switch,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CreditCard as Edit3, Shield, MessageSquare, Clock, CreditCard, Info, Mail, Star, Users, Globe, Eye, UserPlus, Link, Trash2, Phone } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { storage } from '@/utils/storage';
import { useTranslation } from '@/hooks/useLanguage';
import RatingModal from '@/components/RatingModal';
import LeaveRequestModal from '@/components/LeaveRequestModal';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const { width } = Dimensions.get('window');

interface GroupMember {
    id: string;
    isGroupInfoRead: boolean;
    created_at: string;
    type: string;
    auth_fullname: {
        id: string;
        dp: string;
        fullname: string;
    };
    rating: AverageRating;
}

interface GroupDetails {
    id: string;
    name: string;
    is_public: boolean;
    is_verified: boolean;
    user_id: string;
    room_dp: string;
    details: string;
    free_join_link: string;
    pay_join_link: string;
    short_mail_id: string;
    auth_fullname: {
        fullname: string;
        dp: string;
    }

    whatsub_users_subscriptions: Array<{
        id: string;
        expiry_image: string;
        whatsub_plan: {
            admin_conditions: string;
        };
    }>;
    whatsub_room_user_mappings: GroupMember[];
}

interface UserRating {
    rating: number;
    review: string;
}

interface AverageRating {
    average_rating: number;
    number_of_ratings: number;
}

export default function GroupInfoScreen() {
    const params = useLocalSearchParams();
    const { roomId, adminId } = params;
    const { t } = useTranslation();
    const { toast, showSuccess, showError, hideToast } = useToast();

    const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
    const [userRating, setUserRating] = useState<UserRating>({
        rating: 0,
        review: ''
    });
    const [averageRating, setAverageRating] = useState<AverageRating>({
        average_rating: 0,
        number_of_ratings: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false)
    const [isUpdatingPublic, setIsUpdatingPublic] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
    const [isLeavingGroup, setIsLeavingGroup] = useState(false);
    const [currentUserLeaveRequest, setCurrentUserLeaveRequest] = useState(false);

    useEffect(() => {
        initializeUser();
    }, []);

    useEffect(() => {
        if (userId && authToken && roomId) {
            fetchGroupDetails();
            fetchRatings();
            fetchLeaveRequest();
            isCurrentUserAdmin();
        }
    }, [userId, authToken, roomId, adminId]);

    const initializeUser = async () => {
        try {
            const id = await storage.getUserId();
            const token = await storage.getAuthToken();

            setUserId(id);
            setAuthToken(token);
        } catch (error) {
            console.error('Error initializing user:', error);
        }
    };

    const fetchGroupDetails = async () => {
        if (!authToken || !roomId) return;

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
                        query getRoomsDetails($room_id: uuid!) {
            __typename
            whatsub_rooms(where: {id: {_eq: $room_id}}) {
                __typename
                is_public
                is_verified
                room_dp
                name
                id
                user_id
                free_join_link
                pay_join_link
                details
                short_mail_id
                auth_fullname {
                __typename
                fullname
                dp
                }
                whatsub_users_subscriptions(where: {type: {_eq: "admin"}}) {
                __typename
                id
                expiry_image
                whatsub_plan {
                    __typename
                    admin_conditions
                }
                }
                whatsub_room_user_mappings(order_by: {created_at: asc_nulls_first}) {
                __typename
                id
                isGroupInfoRead
                auth_fullname {
                    __typename
                    id
                    dp
                    fullname
                }
                created_at
                type
                whatsub_admin_average_ratings {
                    __typename
                    average_rating
                    number_of_ratings
                }
                }
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
                showError('Failed to load group details');
                return;
            }

            const group = data.data?.whatsub_rooms?.[0];
            if (group) {
                setGroupDetails(group);

            }
        } catch (error) {
            console.error('Error fetching group details:', error);
            showError('Failed to load group details');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRatings = async () => {
        if (!authToken || !userId || !adminId) return;

        try {
            const response = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: `
            query getRatings($from_user_id: uuid!, $user_id: uuid!) {
              __typename
              whatsub_admin_ratings(where: {from_user_id: {_eq: $from_user_id}, user_id: {_eq: $user_id}}) {
                __typename
                rating
                review
              }
              whatsub_admin_average_ratings(where: {user_id: {_eq: $user_id}}) {
                __typename
                average_rating
                number_of_ratings
              }
            }
          `,
                    variables: {
                        from_user_id: userId,
                        user_id: adminId
                    }
                })
            });

            const data = await response.json();
            if (data.data) {
                setUserRating(data.data.whatsub_admin_ratings?.[0] ?? {
                    rating: 0,
                    review: ''

                });
                setAverageRating(data.data.whatsub_admin_average_ratings?.[0] ?? {
                    average_rating: 0,
                    number_of_ratings: 0
                });
            }
        } catch (error) {
            console.error('Error fetching ratings:', error);
        }
    };

    const fetchLeaveRequest = async () => {
        if (!authToken || !userId || !adminId) return;

        try {
            const response = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: `
                    query MyQuery($room_id: uuid, $user_id: uuid) { 
                        __typename 
                        whatsub_room_user_mapping(where: {room_id: {_eq: $room_id}, user_id: {_eq: $user_id}}) { 
                            __typename 
                            created_at 
                            leave_request 
                        } 
                    }
                `,
                    variables: {
                        room_id: roomId,
                        user_id: userId,
                    }
                })
            });

            const data = await response.json();
            setCurrentUserLeaveRequest(data.data.whatsub_room_user_mapping[0].leave_request);

        } catch (error) {
            console.error('Error fetching leave request status:', error);
        }
    }

    const handleTogglePublic = async (isPublic: boolean) => {
        if (!authToken || !roomId || !groupDetails) return;

        setIsUpdatingPublic(true);
        try {
            const response = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: `
            mutation UpdateRoomPublic($room_id: uuid!, $is_public: Boolean!) {
              __typename
              update_whatsub_rooms(where: {id: {_eq: $room_id}}, _set: {is_public: $is_public}) {
                __typename
                affected_rows
              }
            }
          `,
                    variables: {
                        room_id: roomId,
                        is_public: isPublic
                    }
                })
            });

            const data = await response.json();

            if (data.data?.update_whatsub_rooms?.affected_rows > 0) {
                setGroupDetails(prev => prev ? { ...prev, is_public: isPublic } : null);
                showSuccess(isPublic ? 'Group is now public' : 'Group is now private');
            } else {
                showError('Failed to update group visibility');
            }
        } catch (error) {
            console.error('Error updating group visibility:', error);
            showError('Failed to update group visibility');
        } finally {
            setIsUpdatingPublic(false);
        }
    };

    const formatDate = (isoString: string) => {
        console.log(isoString);
        const date = new Date(isoString);
        console.log(date);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };


    const isCurrentUserAdmin = () => {
        console.log('vnfiudvbidufv');
        console.log("adminId: ", adminId);
        console.log("userId: ", userId);
        return setIsAdmin(adminId === userId);
    };

    const handleDeleteGroup = async () => {
        if (!groupDetails) return;

        try {
            const authToken = await storage.getAuthToken();
            if (!authToken) return;

            // Get the subscription ID from group details
            const subscription = groupDetails.whatsub_users_subscriptions?.[0];
            if (!subscription) {
                showError('No subscription found for this group');
                return;
            }

            const response = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    query: `
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
            `,
                    variables: {
                        user_subscription_id: groupDetails.whatsub_users_subscriptions[0].id,
                        room_id: groupDetails.id,
                    },
                }),
            });

            const data = await response.json();

            if (data.errors) {
                console.error('Error deleting group:', data.errors);
                showError('Failed to delete group');
                return;
            }

            const subscriptionResult = data.data?.update_whatsub_users_subscription;
            const roomResult = data.data?.update_whatsub_rooms;

            if (subscriptionResult?.affected_rows > 0 && roomResult?.affected_rows > 0) {
                showSuccess('Group deleted successfully');
                router.replace('/(tabs)/chat');
            } else {
                showError('Failed to delete group');
            }
        } catch (error) {
            console.error('Error deleting group:', error);
            showError('Failed to delete group');
        }
    };

    const handleLeaveRequest = async () => {
        if (currentUserLeaveRequest) {
            // Cancel leave request
            handleCancelLeaveRequest();
        } else {
            // Show leave request modal
            setShowLeaveRequestModal(true);
        }
    };

    const handleCancelLeaveRequest = async () => {
        if (!authToken || !roomId || !userId) return;

        setIsLeavingGroup(true);
        try {
            // First mutation: Update room user mapping to cancel leave request
            const mappingResponse = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: `
                        mutation MyMutation($user_id: uuid, $room_id: uuid, $leave_request_reason: String) {
                            __typename
                            update_whatsub_room_user_mapping(
                                where: {user_id: {_eq: $user_id}, room_id: {_eq: $room_id}}, 
                                _set: {leave_request: false, leave_request_reason: $leave_request_reason}
                            ) {
                                __typename
                                affected_rows
                            }
                        }
                    `,
                    variables: {
                        user_id: userId,
                        room_id: roomId,
                        leave_request_reason: null
                    }
                })
            });

            const mappingData = await mappingResponse.json();

            if (mappingData.errors) {
                showError(mappingData.errors[0]?.message || 'Failed to cancel leave request');
                return;
            }

            // Second mutation: Update subscription status back to active
            const subscriptionResponse = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: `
                        mutation MyMutation($user_id: uuid = "", $room_id: uuid = "") {
                            __typename
                            update_whatsub_users_subscription(_set: {status: "active"}, where: {user_id: {_eq: $user_id}, room_id: {_eq: $room_id}}) {
                                __typename
                                affected_rows
                            }
                        }
                    `,
                    variables: {
                        user_id: userId,
                        room_id: roomId
                    }
                })
            });

            const subscriptionData = await subscriptionResponse.json();

            if (subscriptionData.errors) {
                showError(subscriptionData.errors[0]?.message || 'Failed to reactivate subscription');
                return;
            }

            // Third query: Verify the current state
            const verifyResponse = await fetch('https://db.subspace.money/v1/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: `
                        query MyQuery($room_id: uuid, $user_id: uuid) {
                            __typename
                            whatsub_room_user_mapping(where: {room_id: {_eq: $room_id}, user_id: {_eq: $user_id}}) {
                                __typename
                                created_at
                                leave_request
                            }
                        }
                    `,
                    variables: {
                        room_id: roomId,
                        user_id: userId
                    }
                })
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.errors) {
                console.error('Error verifying leave request status:', verifyData.errors);
            }

            // Update UI state based on verification
            const currentMapping = verifyData.data?.whatsub_room_user_mapping?.[0];
            if (currentMapping) {
                setCurrentUserLeaveRequest(currentMapping.leave_request || false);
                showSuccess('Leave request cancelled successfully');
            } else {
                // Fallback if verification fails but operations succeeded
                if (mappingData.data?.update_whatsub_room_user_mapping?.affected_rows > 0 &&
                    subscriptionData.data?.update_whatsub_users_subscription?.affected_rows > 0) {
                    setCurrentUserLeaveRequest(false);
                    showSuccess('Leave request cancelled successfully');
                } else {
                    showError('Failed to cancel leave request');
                }
            }
        } catch (error) {
            console.error('Error cancelling leave request:', error);
            showError('Failed to cancel leave request');
        } finally {
            setIsLeavingGroup(false);
        }
    };

    const handleLeaveRequestSuccess = () => {
        setCurrentUserLeaveRequest(true);
        showSuccess('Leave request submitted successfully');
        setShowLeaveRequestModal(false);
    };

    const handleTransactionPress = () => {
        router.push({
            pathname: '/(tabs)/chat/transactions',
            params: {
                roomId: roomId,
            }
        });
    };

    const handleWelcomeMessagePress = () => {
        router.push({
            pathname: '/(tabs)/chat/welcome-message',
            params: {
                roomId: roomId,
            }
        });
    };

    const handleExpiryVerificationPress = () => {
        router.push({
            pathname: '/(tabs)/chat/expiry-verification',
            params: {
                subscriptionId: groupDetails?.whatsub_users_subscriptions[0]?.id,
                roomId: roomId,
                expiryImage: groupDetails?.whatsub_users_subscriptions[0]?.expiry_image || '',
            }
        })
    };

    // const handleEditDetailsPress = () => {
    //     router.push('/(tabs)/chat/edit-details');
    // };

    const handleMailPress = () => {
        router.push({
            pathname: '/(tabs)/account/ai-mailbox',
            params: {
                short_mail: groupDetails?.short_mail_id
            }
        });
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
                    <Text style={styles.headerTitle}>Group Info</Text>
                    <View style={styles.headerRight} />
                </View>

                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>Loading group info...</Text>
                </View>
            </LinearGradient>
        );
    }

    if (!groupDetails) {
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
                    <Text style={styles.headerTitle}>Group Info</Text>
                    <View style={styles.headerRight} />
                </View>

                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Group not found</Text>
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
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <ArrowLeft size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Group Info</Text>
                    <View style={styles.headerRight} />
                </View>

                {/* Group Header */}
                <View style={styles.groupHeader}>
                    <View style={styles.groupLogoContainer}>
                        <Image
                            source={{ uri: groupDetails.room_dp }}
                            style={styles.groupLogo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.groupName}>{groupDetails.name}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    {isAdmin && (
                        <TouchableOpacity style={styles.actionButton}>
                            <Edit3 size={18} color="white" />
                            <Text style={styles.actionButtonText}>Edit Details</Text>
                        </TouchableOpacity>
                    )}

                    {/* <TouchableOpacity style={styles.actionButton}
                        onPress={() => handleCredentialsPress()}
                    >
                        <Shield size={18} color="white" />
                        <Text style={styles.actionButtonText}>Credentials</Text>
                    </TouchableOpacity> */}

                    <TouchableOpacity style={styles.actionButton}>
                        <Info size={18} color="white" />
                        <Text style={styles.actionButtonText}>Info</Text>
                    </TouchableOpacity>

                    {isAdmin && (
                        <TouchableOpacity style={styles.actionButton}
                            onPress={() => handleMailPress()}
                        >
                            <Mail size={18} color="white" />
                            <Text style={styles.actionButtonText}>Mail Box</Text>
                        </TouchableOpacity>
                    )}

                    {isAdmin && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleExpiryVerificationPress()}
                        >
                            <Clock size={18} color="white" />
                            <Text style={styles.actionButtonText}>Expiry</Text>
                        </TouchableOpacity>
                    )}

                    {isAdmin && (
                        <TouchableOpacity style={styles.actionButton}
                            onPress={() => handleWelcomeMessagePress()}
                        >
                            <MessageSquare size={18} color="white" />
                            <Text style={styles.actionButtonText}>Welcome Message</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.actionButton}
                        onPress={() => handleTransactionPress()}
                    >
                        <CreditCard size={18} color="white" />
                        <Text style={styles.actionButtonText}>Transactions</Text>
                    </TouchableOpacity>

                    
                </View>

                {/* Public Group Toggle */}
                {isAdmin && (
                    <View style={styles.publicGroupSection}>
                        <View style={styles.publicGroupHeader}>
                            <View style={styles.publicGroupIcon}>
                                <Globe size={20} color="white" />
                            </View>
                            <Text style={styles.publicGroupTitle}>Public Group</Text>
                            <Switch
                                value={groupDetails.is_public}
                                onValueChange={handleTogglePublic}
                                trackColor={{ false: '#374151', true: '#6366F1' }}
                                thumbColor={groupDetails.is_public ? '#FFFFFF' : '#9CA3AF'}
                                ios_backgroundColor="#374151"
                                disabled={isUpdatingPublic}
                            />
                        </View>
                        <View style={styles.publicGroupDescription}>
                            <Text style={styles.publicGroupDescText}>
                                Making it public will let others to join this group
                            </Text>
                        </View>
                    </View>
                )}

                {/* Rating Section */}

                <TouchableOpacity
                    style={styles.ratingSection}
                    onPress={() => !isAdmin && setShowRatingModal(true)}
                    activeOpacity={0.8}
                >
                    <View style={styles.ratingHeader}>
                        <Text style={styles.ratingSectionTitle}>Rating</Text>
                    </View>

                    <View style={styles.ratingCard}>
                        <View style={styles.ratingContent}>
                            <View style={styles.ratingLeft}>
                                <Text style={styles.ratingNumber}>
                                    {averageRating.average_rating}
                                </Text>
                                <Text style={styles.ratingLabel}>
                                    {averageRating.number_of_ratings}+ Ratings
                                </Text>
                            </View>

                            <View style={styles.starsContainer}>
                                <View style={styles.stars}>
                                    {[1, 2, 3, 4, 5].map((star) => {
                                        const filled = (isAdmin ? averageRating.average_rating : userRating.rating) - (star - 1);
                                        return (
                                            <View key={star} style={{ position: "relative" }}>
                                                {/* Empty star (background) */}
                                                <Star
                                                    size={30}
                                                    color="#374151"
                                                    fill="transparent"
                                                />
                                                {/* Filled star (foreground), clipped by width */}
                                                {filled > 0 && (
                                                    <View
                                                        style={{
                                                            position: "absolute",
                                                            left: 0,
                                                            top: 0,
                                                            bottom: 0,
                                                            width: `${Math.min(filled, 1) * 100}%`, // fill fraction
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        <Star
                                                            size={30}
                                                            color="#F59E0B"
                                                            fill="#F59E0B"
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                                {!isAdmin ? (<Text style={styles.ratingText}>Rate your Admin</Text>) : (<Text style={styles.ratingText}>Your Average Rating</Text>)}
                            </View>

                        </View>
                    </View>
                </TouchableOpacity>

                {/* Add Member Section */}
                {isAdmin && (
                    <View style={styles.addMemberSection}>
                        <TouchableOpacity style={styles.addMemberButton}>
                            <View style={styles.addMemberIcon}>
                                <UserPlus size={20} color="#6366F1" />
                            </View>
                            <Text style={styles.addMemberText}>Add Paid Member</Text>
                            <View style={styles.addMemberLinkIcon}>
                                <Link size={16} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.addMemberButton}>
                            <View style={styles.addMemberIcon}>
                                <UserPlus size={20} color="#6366F1" />
                            </View>
                            <Text style={styles.addMemberText}>Add Unpaid Member</Text>
                            <View style={styles.addMemberLinkIcon}>
                                <Link size={16} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Members Section */}
                <View style={styles.membersSection}>
                    <View style={styles.membersSectionHeader}>
                        <Text style={styles.membersSectionTitle}>Members</Text>
                    </View>

                    <View style={styles.membersList}>
                        {groupDetails.whatsub_room_user_mappings.map((member) => (
                            <View key={member.id} style={styles.memberCard}>
                                <View style={styles.memberAvatarContainer}>
                                    <Image
                                        source={{
                                            uri:
                                                member.auth_fullname.dp ||
                                                'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
                                        }}
                                        style={styles.memberAvatar}
                                        defaultSource={require('@/assets/images/icon.png')}
                                    />
                                    
                                </View>

                                <View style={styles.memberInfo}>
                                    <View style={styles.memberDetails}>
                                        <Text style={styles.memberName}>
                                            {member.auth_fullname.fullname}
                                        </Text>
                                        <Text style={styles.memberType}>{member.type === 'paid'? "Paid": "Admin"}</Text>
                                    </View>
                                    <Text style={styles.memberCreatedDate}>
                                        {isAdmin ? 'Created On' : 'Joined on'} {formatDate(member.created_at)}
                                    </Text>
                                </View>

                                <View style={styles.memberActions}>
                                    <TouchableOpacity style={styles.memberActionButton}>
                                        <MessageSquare size={16} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>


                {/* Delete Group Section */}
                {isAdmin && (
                    <View style={styles.deleteGroupSection}>
                        <TouchableOpacity
                            style={styles.deleteGroupButton}
                            onPress={handleDeleteGroup}
                        >
                            <Trash2 size={20} color="#EF4444" />
                            <Text style={styles.deleteGroupText}>Delete group</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Leave Group Section - Only for non-admin users */}
                {!isAdmin && (
                    <View style={styles.leaveGroupSection}>
                        <TouchableOpacity
                            style={[
                                styles.leaveGroupButton,
                                currentUserLeaveRequest && styles.cancelLeaveButton,
                                isLeavingGroup && styles.leaveGroupButtonDisabled
                            ]}
                            onPress={handleLeaveRequest}
                            disabled={isLeavingGroup}
                        >
                            {isLeavingGroup ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                                <Text style={[
                                    styles.leaveGroupText,
                                    currentUserLeaveRequest && styles.cancelLeaveText
                                ]}>
                                    {currentUserLeaveRequest ? 'Cancel Leave Request' : 'Leave Request'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Rating Modal */}
            {!isAdmin && <RatingModal
                isVisible={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                onSuccess={() => {
                    setShowRatingModal(false);
                    showSuccess('Rating submitted successfully');
                    // Refresh ratings data
                    fetchRatings();
                }}
                onError={(error) => {
                    showError(error);
                }}
                targetUserId={adminId as string}
                targetUserName={groupDetails?.whatsub_room_user_mappings.find(
                    member => member.auth_fullname.id === adminId
                )?.auth_fullname.fullname || 'Admin'}
                targetUserImage={groupDetails?.whatsub_room_user_mappings.find(
                    member => member.auth_fullname.id === adminId
                )?.auth_fullname.dp}
                type="admin"
            />
            }

            {/* Leave Request Modal */}
            <LeaveRequestModal
                isVisible={showLeaveRequestModal}
                onClose={() => setShowLeaveRequestModal(false)}
                onSuccess={handleLeaveRequestSuccess}
                onError={(error) => showError(error)}
                roomId={roomId as string}
                groupName={groupDetails?.name}
            />

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
        fontSize: 18,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
    },
    groupHeader: {
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 32,
    },
    groupLogoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    groupLogo: {
        width: 60,
        height: 60,
    },
    groupName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 8,
    },
    groupTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
    },
    groupTypeText: {
        fontSize: 12,
        color: '#6366F1',
        fontWeight: '500',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 10,
        marginBottom: 32,
        gap: 4,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(55, 65, 81, 0.5)',
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 8,
        maxWidth: (width - 64) / 2,
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: 'white',
    },
    publicGroupSection: {
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(55, 65, 81, 0.5)',
        marginHorizontal: 10,
        marginBottom: 16,
        overflow: 'hidden',
    },
    publicGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 12,
        gap: 12,
    },
    publicGroupIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    publicGroupTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        flex: 1,
    },
    publicGroupDescription: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(16, 185, 129, 0.2)',
        padding: 10,
    },
    publicGroupDescText: {
        fontSize: 14,
        color: '#10B981',
        lineHeight: 20,
        textAlign:'center',
    },
    ratingSection: {
        paddingHorizontal: 10,
        marginBottom: 32,
    },
    ratingHeader: {
        marginBottom: 16,
    },
    ratingSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    ratingCard: {
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(55, 65, 81, 0.5)',
        padding: 20,
    },
    ratingContent: {
        marginHorizontal:10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingLeft: {
        alignItems: 'center',
        marginRight: 32,
    },
    ratingNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    ratingLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    ratingRight: {
        flex: 1,
        alignItems: 'center',
    },
    starsContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems:'center',
        gap: 4,
        marginBottom: 8,
    },
    stars: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 8,
    },
    ratingText: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    averageRatingText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    addMemberSection: {
        paddingHorizontal: 10,
        marginBottom: 10,
        gap: 12,
    },
    addMemberButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(55, 65, 81, 0.5)',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    addMemberIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    addMemberText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        flex: 1,
    },
    addMemberLinkIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(55, 65, 81, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    membersSection: {
        marginHorizontal: 10,
        marginBottom: 24,
    },
    membersSectionHeader: {
        marginBottom: 16,
    },
    membersSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    membersList: {
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(55, 65, 81, 0.5)',
        overflow: 'hidden',
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(55, 65, 81, 0.3)',
    },
    memberAvatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    adminBadge: {
        position: 'absolute',
        bottom: -4,
        left: -8,
        backgroundColor: '#6366F1',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    adminBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: 'white',
    },
    memberInfo: {
        flex: 1,
    },
    memberDetails: {
        flexDirection: 'row',
        alignItems:'center',
        gap: 16,
    },
    memberType: {
        fontSize: 12,
        fontWeight: '700',
        color:'#00ee00',
        borderWidth: 2,
        borderColor: '#FFD700',
        borderRadius: 6,
        padding: 4,
        paddingHorizontal: 6,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginBottom: 4,
    },
    memberCreatedDate: {
        fontSize: 12,
        fontWeight: '800',
        color: '#b2bbcbff',
    },
    memberActions: {
        flexDirection: 'row',
        gap: 8,
    },
    memberActionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(55, 65, 81, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteGroupSection: {
        paddingHorizontal: 10,
        marginBottom: 12,
    },
    deleteGroupButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    deleteGroupText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
        textAlign:'center',
    },
    leaveGroupSection: {
        paddingHorizontal: 10,
        marginBottom: 32,
    },
    leaveGroupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 16,
        justifyContent: 'center',
        gap: 12,
    },
    cancelLeaveButton: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    leaveGroupButtonDisabled: {
        opacity: 0.6,
    },
    leaveGroupText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
    },
    cancelLeaveText: {
        color: '#F59E0B',
    },
    detailsSection: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    detailsSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
    },
    detailsCard: {
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(55, 65, 81, 0.5)',
        padding: 20,
    },
    detailsText: {
        fontSize: 14,
        color: '#E5E7EB',
        lineHeight: 20,
    },
});