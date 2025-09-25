import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle, Animated } from 'react-native';

const { width } = Dimensions.get('window');

interface ShimmerBoxProps {
  style?: ViewStyle;
}

const PublicGroupsShimmer: React.FC = () => {
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
        <View style={styles.headerTop}>
          <ShimmerBox style={styles.backButtonShimmer} />
          <View style={styles.headerContent}>
            <ShimmerBox style={styles.titleShimmer} />
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <ShimmerBox style={styles.searchBarShimmer} />
      </View>

      {/* Groups Grid */}
      <View style={styles.groupsGrid}>
        {[...Array(8)].map((_, index: number) => (
          <View key={index} style={styles.groupCard}>
            {/* Header with Service Image */}
            <View style={styles.groupHeader}>
              <View style={styles.groupHeaderContent}>
                <View style={styles.serviceInfo}>
                  <ShimmerBox style={styles.serviceImageShimmer} />
                  <View style={styles.serviceDetails}>
                    <ShimmerBox style={styles.serviceNameShimmer} />
                    <View style={styles.durationContainer}>
                      <ShimmerBox style={styles.durationIconShimmer} />
                      <ShimmerBox style={styles.durationTextShimmer} />
                    </View>
                  </View>
                </View>

                {/* Popularity Badge */}
                <ShimmerBox style={styles.popularityBadgeShimmer} />
              </View>
            </View>

            {/* Content */}
            <View style={styles.groupContent}>
              {/* Pricing */}
              <View style={styles.pricingSection}>
                <View style={styles.priceContainer}>
                  <View style={styles.userPrice}>
                    <ShimmerBox style={styles.priceAmountShimmer} />
                    <ShimmerBox style={styles.priceLabelShimmer} />
                  </View>
                </View>

                <View style={styles.groupCount}>
                  <ShimmerBox style={styles.groupCountLabelShimmer} />
                  <ShimmerBox style={styles.groupCountValueShimmer} />
                </View>
              </View>

              {/* Action Button */}
              <ShimmerBox style={styles.joinButtonShimmer} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default PublicGroupsShimmer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
    marginBottom: 40,
  },
  shimmerBox: {
    backgroundColor: '#374151',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 10,
    paddingTop: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButtonShimmer: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  titleShimmer: {
    width: 150,
    height: 22,
  },
  searchSection: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  searchBarShimmer: {
    height: 40,
    borderRadius: 16,
  },
  groupsGrid: {
    paddingHorizontal: 10,
    gap: 5,
    marginTop: 8,
  },
  groupCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgb(55, 65, 81)',
    marginBottom: 5,
  },
  groupHeader: {
    height: 90,
    justifyContent: 'center',
    padding: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  groupHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  serviceImageShimmer: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceNameShimmer: {
    width: 140,
    height: 16,
    marginBottom: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationIconShimmer: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  durationTextShimmer: {
    width: 80,
    height: 14,
  },
  popularityBadgeShimmer: {
    width: 80,
    height: 24,
    borderRadius: 12,
    marginBottom: 18,
  },
  groupContent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pricingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  priceContainer: {
    flex: 1,
  },
  userPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  priceAmountShimmer: {
    width: 60,
    height: 20,
  },
  priceLabelShimmer: {
    width: 50,
    height: 14,
  },
  groupCount: {
    flexDirection: 'row',
  },
  groupCountLabelShimmer: {
    width: 50,
    height: 14,
    marginTop: 4,
    marginRight: 4,
  },
  groupCountValueShimmer: {
    width: 40,
    height: 18,
  },
  joinButtonShimmer: {
    height: 36,
    borderRadius: 12,
    marginBottom: 4,
  },
});