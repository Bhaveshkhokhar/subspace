import AsyncStorage from '@react-native-async-storage/async-storage';

// --------------------
// Keys
// --------------------
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  PHONE_NUMBER: 'phone_number',
  blockedDetails: 'blocked_details',
  blockedTitle: 'blocked_title',
  dp: 'dp',
  fullname: 'fullname',
  username: 'username',
  email: 'email',
  internal_amount: 'internal_amount',
  isBlocked: 'is_blocked',
  isMarketRandomOn: 'is_market_random_on',
  isWhatsappAuthOn: 'is_whatsapp_auth_on',
  kycStatus: 'kyc_status',
  locked_amount: 'locked_amount',
  mailPrefix: 'mail_prefix',
  paymentErrorMessage: 'payment_error_message',
  paymentGateway: 'payment_gateway',
  pgintentType: 'pg_intent_type',
  poolFeature: 'pool_feature',
  referAmount: 'refer_amount',
  referPercentage: 'refer_percentage',
  sharedFee: 'shared_fee',
  showCollectionSection: 'show_collection_section',
  transactionChargesPercentage: 'transaction_charges_percentage',
  transactionChargesPrices: 'transaction_charges_prices',
  whatsappAuthLink: 'whatsapp_auth_link',
  walletMultiplier: 'wallet_multiplier',
  updateTitle: 'update_title',
  walletBalance: 'wallet_balance',
  updateMinBuildNumber: 'update_min_build_number',
  updateDetails: 'update_details',
  unlocked_amount: 'unlocked_amount',
  showSpinMachine: 'show_spin_machine',
  showGames: 'show_games',
  showQuizzes: 'show_quizzes',
} as const;

type StorageKey = keyof typeof STORAGE_KEYS;

// --------------------
// Storage Functions
// --------------------
export const storage = {
  // Save tokens & core identifiers
  setAuthData: async (authToken: string, refreshToken: string|null, userId: string, phone: string) => {
    const r_token = refreshToken || authToken;
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.AUTH_TOKEN, authToken],
      [STORAGE_KEYS.REFRESH_TOKEN, r_token],
      [STORAGE_KEYS.USER_ID, userId],
      [STORAGE_KEYS.PHONE_NUMBER, phone],
    ]);
  },

  // Save *all* user profile values that match STORAGE_KEYS
  setUserProfile: async (profile: Record<string, any>) => {
  const entries: [string, string][] = Object.entries(profile)
    .filter(([key, value]) => value !== undefined && (STORAGE_KEYS as any)[key] !== undefined)
    .map(([key, value]) => {
      // Directly match key with STORAGE_KEYS
      const storageKey = (STORAGE_KEYS as any)[key];
      return [storageKey, String(value)];
    });

  if (entries.length > 0) {
    await AsyncStorage.multiSet(entries);
  }
},

  // Getters
  getAuthToken: async () => AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
  getRefreshToken: async () => AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
  getUserId: async () => AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
  getPhoneNumber: async () => AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBER),

  // Load everything
  getUserProfile: async () => {
    const keys = Object.values(STORAGE_KEYS);
    const values = await AsyncStorage.multiGet(keys);
    return values.reduce((acc, [key, value]) => {
      if (value !== null) acc[key] = value;
      return acc;
    }, {} as Record<string, any>);
  },

  // Clear all
  clearAuthData: async () => {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  },

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

};