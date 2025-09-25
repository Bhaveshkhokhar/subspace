import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle, Animated } from 'react-native';

const { width } = Dimensions.get('window');

interface ShimmerBoxProps {
  style?: ViewStyle;
}

const ExploreShimmer: React.FC = () => {
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
          <ShimmerBox style={styles.titleShimmer} />
          <ShimmerBox style={styles.cartShimmer} />
        </View>
        
        {/* Search Bar */}
        <ShimmerBox style={styles.searchBarShimmer} />
      </View>

      {/* Carousel Section */}
      <View style={styles.carouselSection}>
        <View style={styles.carouselContainer}>
          <ShimmerBox style={styles.carouselCardShimmer} />
        </View>
        
        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          {[...Array(3)].map((_, index: number) => (
            <ShimmerBox key={index} style={styles.paginationDotShimmer} />
          ))}
        </View>
      </View>

      {/* Favorite Brands Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ShimmerBox style={styles.sectionTitleShimmer} />
        </View>
        <View style={styles.brandsScroll}>
          {[...Array(5)].map((_, index: number) => (
            <View key={index} style={styles.brandItem}>
              <ShimmerBox style={styles.brandImageShimmer} />
              <ShimmerBox style={styles.brandDiscountShimmer} />
            </View>
          ))}
        </View>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ShimmerBox style={styles.sectionTitleShimmer} />
          <ShimmerBox style={styles.viewAllShimmer} />
        </View>
        <View style={styles.categoriesScroll}>
          {[...Array(3)].map((_, index: number) => (
            <View key={index} style={styles.categoryCard}>
              <ShimmerBox style={styles.categoryImageShimmer} />
              <View style={styles.categoryContent}>
                <ShimmerBox style={styles.categoryBadgeShimmer} />
                <View style={styles.categoryFooter}>
                  <ShimmerBox style={styles.categoryNameShimmer} />
                  <View style={styles.categoryIcons}>
                    {[...Array(3)].map((_, iconIndex: number) => (
                      <ShimmerBox key={iconIndex} style={styles.categoryIconShimmer} />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Shared Subscriptions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ShimmerBox style={styles.sectionTitleShimmer} />
          <ShimmerBox style={styles.viewAllShimmer} />
        </View>
        <View style={styles.groupsScroll}>
          {[...Array(2)].map((_, index: number) => (
            <View key={index} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <ShimmerBox style={styles.groupImageShimmer} />
                <View style={styles.groupInfo}>
                  <ShimmerBox style={styles.groupNameShimmer} />
                  <ShimmerBox style={styles.groupMetaShimmer} />
                </View>
              </View>
              <View style={styles.groupDetails}>
                <View style={styles.groupPricing}>
                  <ShimmerBox style={styles.groupPriceShimmer} />
                  <ShimmerBox style={styles.groupPriceLabelShimmer} />
                </View>
                <View style={styles.groupFooter}>
                  <ShimmerBox style={styles.groupDurationShimmer} />
                  <ShimmerBox style={styles.groupCountShimmer} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default ExploreShimmer;

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
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleShimmer: {
    width: 120,
    height: 20,
  },
  cartShimmer: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchBarShimmer: {
    height: 48,
    borderRadius: 16,
    marginHorizontal: 10,
  },
  carouselSection: {
    marginBottom: 32,
    paddingTop: 20,
  },
  carouselContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  carouselCardShimmer: {
    width: width * 0.8,
    height: 160,
    borderRadius: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  paginationDotShimmer: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  sectionTitleShimmer: {
    width: 150,
    height: 20,
  },
  viewAllShimmer: {
    width: 60,
    height: 14,
  },
  brandsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 16,
  },
  brandItem: {
    width: 80,
    alignItems: 'center',
  },
  brandImageShimmer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  brandDiscountShimmer: {
    width: 60,
    height: 20,
    borderRadius: 12,
  },
  categoriesScroll: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 16,
  },
  categoryCard: {
    width: 180,
    height: 105,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryImageShimmer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  categoryContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 12,
  },
  categoryBadgeShimmer: {
    width: 80,
    height: 20,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  categoryFooter: {
    gap: 6,
  },
  categoryNameShimmer: {
    width: 100,
    height: 16,
  },
  categoryIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconShimmer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: -12,
  },
  groupsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 16,
  },
  groupCard: {
    width: 240,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  groupImageShimmer: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  groupInfo: {
    flex: 1,
  },
  groupNameShimmer: {
    width: 120,
    height: 15,
    marginBottom: 4,
  },
  groupMetaShimmer: {
    width: 80,
    height: 12,
  },
  groupDetails: {
    gap: 16,
  },
  groupPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  groupPriceShimmer: {
    width: 60,
    height: 24,
  },
  groupPriceLabelShimmer: {
    width: 50,
    height: 14,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupDurationShimmer: {
    width: 70,
    height: 12,
  },
  groupCountShimmer: {
    width: 80,
    height: 20,
    borderRadius: 12,
  },
});