import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { checkAuthStatus } from '@/stores/authStore';
import { useLanguage, useTranslation } from '@/hooks/useLanguage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/storage';

// Keep splash visible until we decide
// SplashScreen.preventAutoHideAsync();

export default function IndexScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const { isLanguageSelected, loadLanguage } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Small delay for smooth init
      await new Promise(resolve => setTimeout(resolve, 400));

      await loadLanguage();
      const authenticated = await checkAuthStatus();

      await SplashScreen.hideAsync();
      const isBlocked = await AsyncStorage.getItem(STORAGE_KEYS.isBlocked);

      if(isBlocked === 'true'){
        router.replace('/AccountBlockedScreen');
      }
      else if (authenticated) {
        router.replace('/(tabs)/home');
      } else if (!isLanguageSelected) {
        router.replace('/language-selection');
      } else {
        router.replace('/auth');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      await SplashScreen.hideAsync();
      router.replace('/language-selection');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return null; // never reached because router replaces
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
