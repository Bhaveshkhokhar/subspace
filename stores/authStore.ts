import { storage } from '@/utils/storage';

interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  username?: string;
  dp?: string;
  auth_token?: string;
  fullname?: string;
  walletBalance?: number;
  locked_amount?: number;
  unlocked_amount?: number;
  kycStatus?: string;
  isBlocked?: boolean;
}

interface UpdateProfileData {
  fullname?: string;
  email?: string;
  username?: string;
}

export interface UserProfileData {
  blockedDetails?: string;
  blockedTitle?: string;
  dp?: string;
  fullname?: string;
  internal_amount?: number;
  isBlocked?: boolean;
  isMarketRandomOn?: boolean;
  isWhatsappAuthOn?: boolean;
  kycStatus?: string;
  locked_amount?: number;
  mailPrefix?: string;
  paymentErrorMessage?: string;
  paymentGateway?: string;
  pgintentType?: string;
  poolFeature?: boolean;
  referAmount?: number;
  referPercentage?: number;
  sharedFee?: number;
  showCollectionSection?: boolean;
  transactionChargesPercentage?: number;
  transactionChargesPrices?: any;
  whatsappAuthLink?: string;
  walletMultiplier?: number;
  updateTitle?: string;
  walletBalance?: number;
  updateMinBuildNumber?: number;
  updateDetails?: string;
  unlocked_amount?: number;
  showSpinMachine?: boolean;
  showGames?: boolean;
  showQuizzes?: boolean;
}

// Create a simple state management system
let state = {
  isAuthenticated: false,
  user: null as User | null,
  phoneNumber: '',
  requestId: null as string | null,
  isLoading: false,
  error: null as string | null,
};

// Create a list of listeners
const listeners = new Set<() => void>();

// Function to update state and notify listeners
const setState = (updates: Partial<typeof state>) => {
  state = { ...state, ...updates };
  listeners.forEach(listener => listener());
};

export const useAuthStore = {
  getState: () => state,
  
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  
  setPhoneNumber: (phone: string) => {
    setState({ phoneNumber: phone });
  },
  
  setRequestId: (id: string) => {
    setState({ requestId: id });
  },
  
  login: (user: User) => {
    setState({ isAuthenticated: true, user });
    // Store auth data in AsyncStorage
    if (user.auth_token) {
      storage.setAuthData(
        user.auth_token,
        user.auth_token, // Using auth_token as refresh_token for simplicity
        user.id,
        user.phone,
      );
    }
  },
  
  logout: async () => {
    // Clear auth data from AsyncStorage
    await storage.clearAuthData();
    setState({ isAuthenticated: false, user: null, phoneNumber: '', requestId: null });
  },
  
  updateUser: (data: Partial<User>) => {
    setState({ user: state.user ? { ...state.user, ...data } : null });
  },
  
  setLoading: (loading: boolean) => {
    setState({ isLoading: loading });
  },
  
  setError: (error: string | null) => {
    setState({ error });
  }
};

// Function to fetch user profile data after authentication
export const fetchUserProfile = async (authToken: string): Promise<UserProfileData | null> => {
  try {
    const response = await fetch('https://db.subspace.money/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        query: `
          query MyQuery($lang: String = "", $version: Int = 10) {
            __typename
            wGetInfoV3(request: {lang: $lang, version: $version}) {
              __typename
              blockedDetails
              blockedTitle
              dp
              fullname
              internal_amount
              isBlocked
              isMarketRandomOn
              isWhatsappAuthOn
              kycStatus
              locked_amount
              mailPrefix
              paymentErrorMessage
              paymentGateway
              pgintentType
              poolFeature
              referAmount
              referPercentage
              sharedFee
              showCollectionSection
              transactionChargesPercentage
              transactionChargesPrices
              whatsappAuthLink
              walletMultiplier
              updateTitle
              walletBalance
              updateMinBuildNumber
              updateDetails
              unlocked_amount
              showSpinMachine
              showGames
              showQuizzes
            }
          }
        `,
        variables: {
          lang: "en",
          version: 10
        }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return null;
    }
    
    return data.data?.wGetInfoV3 || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Function to update user profile
export const updateProfile = async (id: string, data: UpdateProfileData): Promise<boolean> => {
  const { user } = useAuthStore.getState();
  if (!user?.auth_token) return false;

  try {
    const response = await fetch('https://db.subspace.money/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.auth_token}`
      },
      body: JSON.stringify({
        query: `
          mutation UpdateProfileData($email: String, $fullname: String, $id: uuid, $username: String) {
            __typename
            update_auth(where: {id: {_eq: $id}}, _set: {email: $email, fullname: $fullname, username: $username}) {
              __typename
              affected_rows
            }
          }
        `,
        variables: {
          id,
          email: data.email,
          fullname: data.fullname,
          username: data.username
        },
      }),
    });

    const result = await response.json();
    return result.data?.update_auth?.affected_rows > 0;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
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

// Function to update profile picture
export const updateProfilePicture = async (userId: string, image: string): Promise<string | null> => {
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
          mutation MyMutation($image: String = "", $user_id: String = "") {
            changeDp(request: {image: $image, user_id: $user_id}) {
              dp
            }
          }
        `,
        variables: {
          user_id: userId,
          image
        },
      }),
    });

    const result = await response.json();
    return result.data?.changeDp?.dp;
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return null;
  }
};

// Function to handle phone authentication
export const initiatePhoneAuth = async (phone: string): Promise<boolean> => {
  const store = useAuthStore;
  
  store.setLoading(true);
  store.setError(null);
  
  try {
    const response = await fetch('https://db.subspace.money/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation MyMutation($phone: String = "") {
            __typename
            register_without_password(credentials: {phone: $phone}) {
              __typename
              request_id
              type
            }
          }
        `,
        variables: {
          phone,
        },
      }),
    });

    const data = await response.json();
    
    if (data.errors) {
      store.setError(data.errors[0]?.message || 'Authentication failed');
      return false;
    }
    
    if (data.data?.register_without_password?.request_id) {
      store.setRequestId(data.data.register_without_password.request_id);
      store.setPhoneNumber(phone);
      return true;
    } else {
      store.setError('Authentication failed');
      return false;
    }
  } catch (error) {
    store.setError('Network error. Please try again.');
    return false;
  } finally {
    store.setLoading(false);
  }
};

// Function to verify OTP
export const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
  const store = useAuthStore;
  
  store.setLoading(true);
  store.setError(null);

  try {
    // Generate a device ID for this session
    const deviceId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const response = await fetch('https://db.subspace.money/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation MyMutation($phone: String = "", $otp: String = "", $ip_address: String = "", $device_id: String = "", $device_data: jsonb = "", $lang: String = "en", $version: Int = 0) {
            __typename
            verify_otp(request: {otp: $otp, phone: $phone, ip_address: $ip_address, device_id: $device_id, device_data: $device_data, lang: $lang, version: $version}) {
              __typename
              auth_token
              id
              type
              refresh_token
              deviceInfoSaved
            }
          }
        `,
        variables: {
          phone,
          otp,
          ip_address: "127.0.0.1",
          device_id: deviceId,
          lang: "en",
          version: 10
        },
      }),
    });

    const data = await response.json();
    
    if (data.errors) {
      store.setError(data.errors[0]?.message || 'Verification failed');
      return false;
    }
    if (data.data?.verify_otp?.auth_token) {
      const { id, auth_token, refresh_token } = data.data.verify_otp;
      // Save auth data
      await storage.setAuthData(auth_token, refresh_token, id, phone);
      // Fetch profile & info
      const [profile, userInfo] = await Promise.all([
        fetchUserProfile(auth_token),
        fetchUserInfo(id),
      ]);
      
      // Save extra profile to storage
      if (profile) await storage.setUserProfile(profile);
      if (userInfo) await storage.setUserProfile(userInfo);
      
      store.login({
        id,
        phone,
        auth_token,
        name: profile?.fullname || userInfo?.fullname,
        fullname: profile?.fullname || userInfo?.fullname,
        dp: profile?.dp || userInfo?.dp,
        walletBalance: profile?.walletBalance,
        locked_amount: profile?.locked_amount,
        unlocked_amount: profile?.unlocked_amount,
        kycStatus: profile?.kycStatus,
        isBlocked: profile?.isBlocked
      });
      return true;
    } else {
      store.setError('Verification failed');
      return false;
    }
  } catch (error) {
    store.setError('Network error. Please try again.');
    return false;
  } finally {
    store.setLoading(false);
  }
};


export const checkAuthStatus = async (): Promise<boolean> => {
  const store = useAuthStore;
  try {
    // Step 1: Check if we have stored auth data
    const [isAuthenticated, userId, authToken, phoneNumber] = await Promise.all([
      storage.isAuthenticated(),
      storage.getUserId(),
      storage.getAuthToken(),
      storage.getPhoneNumber()
    ]);
    
    // Step 2: If no stored auth data, user is not logged in
    if (!isAuthenticated || !userId || !authToken || !phoneNumber) {
      return false;
    }
    
    // Step 3: Try to get stored profile data as fallback
    const storedProfile = await storage.getUserProfile();
    
    // Step 4: User has valid stored auth data - consider them logged in
    // Create user object with stored data
    const userData: User = {
      id: userId,
      phone: phoneNumber,
      auth_token: authToken,
      name: storedProfile?.fullname,
      fullname: storedProfile?.fullname,
      dp: storedProfile?.dp,
      walletBalance: storedProfile?.walletBalance,
      locked_amount: storedProfile?.locked_amount,
      unlocked_amount: storedProfile?.unlocked_amount,
      kycStatus: storedProfile?.kycStatus,
      isBlocked: storedProfile?.isBlocked
    };
    
    // Log the user in with stored data first
    store.login(userData);
    
    // Step 5: Try to fetch fresh profile data in background (optional)
    try {
      const freshProfile = await fetchUserProfile(authToken);
  
      if (freshProfile) {
        // Update user with fresh data
        store.updateUser({
          name: freshProfile.fullname,
          fullname: freshProfile.fullname,
          dp: freshProfile.dp,
          walletBalance: freshProfile.walletBalance,
          locked_amount: freshProfile.locked_amount,
          unlocked_amount: freshProfile.unlocked_amount,
          kycStatus: freshProfile.kycStatus,
          isBlocked: freshProfile.isBlocked
        });
        
        // Update stored profile data
        await storage.setUserProfile(freshProfile);
      } else {
        console.log('Fresh profile fetch returned null - keeping stored data');
      }
    } catch (profileError) {
      console.log('Profile fetch failed, continuing with stored data:', profileError);
      // This is fine - we already logged the user in with stored data
    }
    
    return true;
    
  } catch (error) {
    console.error('Error in auth check:', error);
    
    // Even if there's an error, try to check basic storage
    try {
      const hasToken = await storage.getAuthToken();
      if (hasToken) {
        return true;
      }
    } catch (storageError) {
      console.error('Storage completely failed:', storageError);
    }
    
    return false;
  }
};
