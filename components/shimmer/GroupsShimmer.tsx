import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle, Animated } from 'react-native';

const { width } = Dimensions.get('window');

interface ShimmerBoxProps {
  style?: ViewStyle;
}

const GroupsShimmer: React.FC = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;

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

  const ShimmerBox: React.FC<ShimmerBoxProps> = ({ style }) => (
    <Animated.View
      style={[
        styles.shimmerBox,
        {
          opacity,
        },
        style,
      ]}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ShimmerBox style={styles.backButtonShimmer} />
        <View style={styles.searchBarContainer}>
          <ShimmerBox style={styles.searchBarShimmer} />
        </View>
      </View>

      {/* Sort Section */}
      <View style={styles.sortSection}>
        <ShimmerBox style={styles.sortLabelShimmer} />
        <View style={styles.sortButtons}>
          {[...Array(3)].map((_, index: number) => (
            <ShimmerBox key={index} style={styles.sortButtonShimmer} />
          ))}
        </View>
      </View>

      {/* Groups List */}
      <View style={styles.groupsList}>
        {[...Array(5)].map((_, index: number) => (
          <View key={index} style={styles.groupCard}>
            {/* Group Header */}
            <View style={styles.groupHeader}>
              <View style={styles.ownerSection}>
                <ShimmerBox style={styles.avatarShimmer} />
                <View style={styles.ownerInfo}>
                  <ShimmerBox style={styles.ownerNameShimmer} />
                  <ShimmerBox style={styles.lastActiveShimmer} />
                </View>
              </View>
              <View style={styles.ratingContainer}>
                <ShimmerBox style={styles.ratingStarShimmer} />
                <ShimmerBox style={styles.ratingTextShimmer} />
                <ShimmerBox style={styles.ratingCountShimmer} />
              </View>
            </View>

            {/* Group Content */}
            <View style={styles.groupContent}>
              {/* Pricing Section */}
              <View style={styles.pricingSection}>
                <View style={styles.priceInfo}>
                  <ShimmerBox style={styles.priceAmountShimmer} />
                  <ShimmerBox style={styles.priceLabelShimmer} />
                </View>
                <View style={styles.availabilityStatus}>
                  <ShimmerBox style={styles.statusIndicatorShimmer} />
                  <ShimmerBox style={styles.statusTextShimmer} />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <ShimmerBox style={styles.joinButtonShimmer} />
                <ShimmerBox style={styles.chatButtonShimmer} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default GroupsShimmer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
    marginBottom: 20,
    marginTop: 20,
  },
  shimmerBox: {
    backgroundColor: '#374151',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 10,
    paddingTop: 30,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonShimmer: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  searchBarContainer: {
    flex: 1,
    marginLeft: 5,
  },
  searchBarShimmer: {
    height: 40,
    borderRadius: 16,
  },
  sortSection: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    marginBottom: 16,
  },
  sortLabelShimmer: {
    width: 60,
    height: 16,
    marginTop: 4,
    marginRight: 6,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButtonShimmer: {
    width: 70,
    height: 24,
    borderRadius: 12,
  },
  groupsList: {
    paddingHorizontal: 10,
    gap: 5,
  },
  groupCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
    marginBottom: 5,
  },
  groupHeader: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  ownerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  avatarShimmer: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerNameShimmer: {
    width: 120,
    height: 18,
    marginBottom: 4,
  },
  lastActiveShimmer: {
    width: 80,
    height: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  ratingStarShimmer: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  ratingTextShimmer: {
    width: 30,
    height: 14,
  },
  ratingCountShimmer: {
    width: 25,
    height: 14,
  },
  groupContent: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pricingSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceAmountShimmer: {
    width: 60,
    height: 24,
  },
  priceLabelShimmer: {
    width: 50,
    height: 16,
  },
  availabilityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  statusIndicatorShimmer: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTextShimmer: {
    width: 80,
    height: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  joinButtonShimmer: {
    flex: 1,
    height: 36,
    borderRadius: 12,
  },
  chatButtonShimmer: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});