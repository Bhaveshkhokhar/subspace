import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storage } from '@/utils/storage';
import { router } from 'expo-router';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await storage.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (!authenticated) {
        router.replace('/auth');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      router.replace('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#0e0e0e', '#0e0e0e']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </LinearGradient>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});