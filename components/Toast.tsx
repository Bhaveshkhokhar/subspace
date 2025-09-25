  import React, { useState, useEffect } from 'react';
  import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    ColorValue,
  } from 'react-native';
  import { LinearGradient } from 'expo-linear-gradient';
  import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, Info, X } from 'lucide-react-native';

  const { width } = Dimensions.get('window');

  export type ToastType = 'success' | 'error' | 'info' | 'warning';

  interface ToastProps {
    visible: boolean;
    message: string;
    type: ToastType;
    duration?: number;
    onHide: () => void;
  }

interface ToastConfig {
  icon: React.ComponentType<any>;
  colors: [ColorValue, ColorValue, ...ColorValue[]]; 
  iconColor: string;
}


  const toastConfigs: Record<ToastType, ToastConfig> = {
    success: {
      icon: CheckCircle,
      colors: ['rgba(16, 185, 129, 0.9)', 'rgba(5, 150, 105, 0.9)'],
      iconColor: '#FFFFFF',
    },
    error: {
      icon: AlertCircle,
      colors: ['rgba(239, 68, 68, 0.9)', 'rgba(220, 38, 38, 0.9)'],
      iconColor: '#FFFFFF',
    },
    warning: {
      icon: AlertCircle,
      colors: ['rgba(245, 158, 11, 0.9)', 'rgba(217, 119, 6, 0.9)'],
      iconColor: '#FFFFFF',
    },
    info: {
      icon: Info,
      colors: ['rgba(59, 130, 246, 0.9)', 'rgba(37, 99, 235, 0.9)'],
      iconColor: '#FFFFFF',
    },
  };

  export default function Toast({ 
    visible, 
    message, 
    type, 
    duration = 3000, 
    onHide 
  }: ToastProps) {
    const [fadeAnim] = useState(new Animated.Value(0));
    const [translateY] = useState(new Animated.Value(-100));

    useEffect(() => {
      if (visible) {
        // Show animation
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();

        // Auto hide after duration
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      } else {
        hideToast();
      }
    }, [visible]);

    const hideToast = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    };

    if (!visible) return null;

    const config = toastConfigs[type];
    const IconComponent = config.icon;

    return (
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
          },
        ]}
      >
        <LinearGradient
          colors={config.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.toast}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <IconComponent size={20} color={config.iconColor} />
            </View>
            <Text style={styles.message} numberOfLines={3}>
              {message}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={hideToast}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 60,
      left: 16,
      right: 16,
      zIndex: 9999,
      elevation: 9999,
    },
    toast: {
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    message: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: '#FFFFFF',
      lineHeight: 20,
    },
    closeButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });