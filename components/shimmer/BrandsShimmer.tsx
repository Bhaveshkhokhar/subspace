import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle, Animated } from 'react-native';

const { width } = Dimensions.get('window');

interface ShimmerBoxProps {
  style?: ViewStyle;
}

const BrandsShimmer: React.FC = () => {
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
          <ShimmerBox style={styles.titleShimmer} />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <ShimmerBox style={styles.searchBarShimmer} />
      </View>

      {/* Category Filter */}
      <View style={styles.categoriesSection}>
        <View style={styles.categoriesContainer}>
          {[...Array(4)].map((_, index: number) => (
            <ShimmerBox key={index} style={styles.categoryButtonShimmer} />
          ))}
        </View>
      </View>

      {/* Brands List */}
      <View style={styles.brandsContainer}>
        {[...Array(6)].map((_, index: number) => (
          <View key={index} style={styles.brandCard}>
            {/* Upper Section - Background Image */}
            <View style={styles.brandImageContainer}>
              <ShimmerBox style={styles.brandBackgroundImageShimmer} />
              
              {/* Discount Badge */}
              <View style={styles.discountBadgePosition}>
                <ShimmerBox style={styles.discountBadgeShimmer} />
              </View>
              
              {/* Brand Logo */}
              <View style={styles.brandLogoPosition}>
                <ShimmerBox style={styles.brandLogoShimmer} />
              </View>
            </View>

            {/* Lower Section - Content */}
            <View style={styles.brandContent}>
              <View style={styles.brandInfo}>
                <ShimmerBox style={styles.brandNameShimmer} />
                <ShimmerBox style={styles.brandCategoryShimmer} />
              </View>

              {/* Pricing */}
              <View style={styles.pricingContainer}>
                <View style={styles.priceRow}>
                  <ShimmerBox style={styles.currentPriceShimmer} />
                  <ShimmerBox style={styles.originalPriceShimmer} />
                </View>
                <View style={styles.savingsContainer}>
                  <ShimmerBox style={styles.savingsShimmer} />
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default BrandsShimmer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  shimmerBox: {
    backgroundColor: '#374151',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButtonShimmer: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  titleShimmer: {
    width: 120,
    height: 20,
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBarShimmer: {
    height: 48,
    borderRadius: 16,
  },
  categoriesSection: {
    marginVertical: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButtonShimmer: {
    width: 80,
    height: 36,
    borderRadius: 18,
  },
  brandsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  brandCard: {
    width: width - 40,
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    alignSelf: 'center',
  },
  brandImageContainer: {
    height: 120,
    position: 'relative',
  },
  brandBackgroundImageShimmer: {
    width: '100%',
    height: '100%',
  },
  discountBadgePosition: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  discountBadgeShimmer: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
  brandLogoPosition: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  brandLogoShimmer: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  brandContent: {
    padding: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
  },
  brandInfo: {
    marginBottom: 16,
  },
  brandNameShimmer: {
    width: 140,
    height: 18,
    marginBottom: 8,
  },
  brandCategoryShimmer: {
    width: 100,
    height: 14,
  },
  pricingContainer: {
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentPriceShimmer: {
    width: 60,
    height: 20,
  },
  originalPriceShimmer: {
    width: 50,
    height: 16,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsShimmer: {
    width: 80,
    height: 14,
  },
});