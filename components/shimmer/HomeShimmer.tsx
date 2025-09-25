import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ShimmerPlaceholderProps {
  width: number;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const ShimmerPlaceholder: React.FC<ShimmerPlaceholderProps> = ({ 
  width, 
  height, 
  borderRadius = 8, 
  style 
}) => {
  const animatedValue = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#374151',
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

const HomeShimmer: React.FC = () => {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section Shimmer */}
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.1)', 'rgba(168, 85, 247, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          {/* User Section Shimmer */}
          <View style={styles.userSection}>
            <View style={styles.userInfo}>
              <ShimmerPlaceholder
                width={56}
                height={56}
                borderRadius={28}
                style={styles.avatar}
              />
              <View style={styles.welcomeContainer}>
                <ShimmerPlaceholder
                  width={100}
                  height={14}
                  borderRadius={4}
                  style={styles.welcomeShimmer}
                />
                <ShimmerPlaceholder
                  width={140}
                  height={18}
                  borderRadius={4}
                  style={styles.nameShimmer}
                />
              </View>
            </View>
          </View>

          {/* Title Shimmer */}
          <View style={styles.titleContainer}>
            <ShimmerPlaceholder
              width={200}
              height={24}
              borderRadius={6}
              style={styles.titleShimmer}
            />
            <ShimmerPlaceholder
              width={160}
              height={14}
              borderRadius={4}
              style={styles.subtitleShimmer}
            />
          </View>

          {/* Action Buttons Shimmer */}
          <View style={styles.actionButtons}>
            <ShimmerPlaceholder
              width={width - 32}
              height={48}
              borderRadius={12}
              style={styles.buttonShimmer}
            />
            <ShimmerPlaceholder
              width={width - 32}
              height={48}
              borderRadius={12}
              style={styles.buttonShimmer}
            />
          </View>
        </LinearGradient>

        {/* Quick Actions Section Shimmer */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <ShimmerPlaceholder
              width={width - 20}
              height={72}
              borderRadius={16}
              style={styles.actionCardShimmer}
            />
            <ShimmerPlaceholder
              width={width - 20}
              height={72}
              borderRadius={16}
              style={styles.actionCardShimmer}
            />
          </View>
        </View>

        {/* Payment Options Section Shimmer */}
        <View style={styles.section}>
          {/* Section Header Shimmer */}
          <View style={styles.sectionHeader}>
            <View>
              <ShimmerPlaceholder
                width={140}
                height={20}
                borderRadius={4}
                style={styles.sectionTitleShimmer}
              />
              <ShimmerPlaceholder
                width={180}
                height={13}
                borderRadius={4}
                style={styles.sectionSubtitleShimmer}
              />
            </View>
            <ShimmerPlaceholder
              width={60}
              height={16}
              borderRadius={4}
            />
          </View>

          {/* Payment Options Horizontal Scroll Shimmer */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.paymentsScroll}
          >
            {[...Array(6)].map((_, index: number) => (
              <View key={index} style={styles.paymentOption}>
                <ShimmerPlaceholder
                  width={48}
                  height={48}
                  borderRadius={12}
                  style={styles.paymentIconShimmer}
                />
                <ShimmerPlaceholder
                  width={60}
                  height={14}
                  borderRadius={4}
                  style={styles.paymentNameShimmer}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Subscriptions Section Shimmer */}
        <View style={styles.section}>
          {/* Section Header Shimmer */}
          <View style={styles.sectionHeader}>
            <View>
              <ShimmerPlaceholder
                width={160}
                height={20}
                borderRadius={4}
                style={styles.sectionTitleShimmer}
              />
              <ShimmerPlaceholder
                width={200}
                height={13}
                borderRadius={4}
                style={styles.sectionSubtitleShimmer}
              />
            </View>
            <ShimmerPlaceholder
              width={60}
              height={16}
              borderRadius={4}
            />
          </View>

          {/* Subscriptions Horizontal Scroll Shimmer */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subscriptionsScroll}
          >
            {[...Array(3)].map((_, index: number) => (
              <View key={index} style={styles.subscriptionCard}>
                {/* Subscription Header Shimmer */}
                <View style={styles.subscriptionHeader}>
                  <ShimmerPlaceholder
                    width={48}
                    height={48}
                    borderRadius={12}
                    style={styles.logoShimmer}
                  />
                  <View style={styles.subscriptionInfo}>
                    <ShimmerPlaceholder
                      width={120}
                      height={18}
                      borderRadius={4}
                      style={styles.subscriptionNameShimmer}
                    />
                    <ShimmerPlaceholder
                      width={80}
                      height={14}
                      borderRadius={4}
                      style={styles.subscriptionPlanShimmer}
                    />
                  </View>
                </View>

                {/* Subscription Details Shimmer */}
                <View style={styles.subscriptionDetails}>
                  <View style={styles.priceRowShimmer}>
                    <ShimmerPlaceholder
                      width={80}
                      height={16}
                      borderRadius={4}
                    />
                    <ShimmerPlaceholder
                      width={60}
                      height={18}
                      borderRadius={4}
                    />
                  </View>

                  <ShimmerPlaceholder
                    width={width * 0.88 - 16}
                    height={32}
                    borderRadius={8}
                    style={styles.expiryRowShimmer}
                  />

                  <View style={styles.subscriptionFooter}>
                    <ShimmerPlaceholder
                      width={100}
                      height={14}
                      borderRadius={4}
                    />
                    <ShimmerPlaceholder
                      width={60}
                      height={14}
                      borderRadius={4}
                    />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions Grid Shimmer */}
        <View style={styles.section}>
          <View style={styles.quickActionsGrid}>
            {[...Array(3)].map((_, index: number) => (
              <ShimmerPlaceholder
                key={index}
                width={width - 20}
                height={64}
                borderRadius={16}
                style={styles.gridCardShimmer}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeShimmer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  scrollView: {
    marginTop: 30,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeShimmer: {
    marginBottom: 8,
  },
  nameShimmer: {
    marginBottom: 4,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleShimmer: {
    marginBottom: 8,
  },
  subtitleShimmer: {
    marginBottom: 6,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  buttonShimmer: {
    marginBottom: 0,
  },
  section: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  sectionTitleShimmer: {
    marginBottom: 4,
  },
  sectionSubtitleShimmer: {
    marginBottom: 1,
  },
  quickActions: {
    flexDirection: 'column',
    paddingHorizontal: 10,
    gap: 12,
  },
  actionCardShimmer: {
    marginBottom: 0,
  },
  paymentsScroll: {
    paddingHorizontal: 10,
    gap: 8,
  },
  paymentOption: {
    width: 96,
    alignItems: 'center',
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.5)',
    padding: 8,
  },
  paymentIconShimmer: {
    marginBottom: 10,
  },
  paymentNameShimmer: {
    marginBottom: 8,
  },
  subscriptionsScroll: {
    paddingHorizontal: 10,
    gap: 8,
  },
  subscriptionCard: {
    width: width * 0.88,
    backgroundColor: 'rgba(31, 31, 31, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 55, 55, 0.9)',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoShimmer: {
    marginRight: 8,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionNameShimmer: {
    marginBottom: 8,
  },
  subscriptionPlanShimmer: {
    marginBottom: 4,
  },
  subscriptionDetails: {
    gap: 12,
  },
  priceRowShimmer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiryRowShimmer: {
    marginBottom: 0,
  },
  subscriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 55, 55, 0.5)',
    paddingTop: 12,
  },
  quickActionsGrid: {
    paddingHorizontal: 10,
    gap: 4,
    paddingBottom: 0,
  },
  gridCardShimmer: {
    marginBottom: 4,
  },
});