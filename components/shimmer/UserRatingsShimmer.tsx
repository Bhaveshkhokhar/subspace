import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width } = Dimensions.get('window');

const UserRatingsShimmer: React.FC = () => {
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

  const ShimmerBox = ({ style }: { style?: any }) => (
    <Animated.View style={[styles.shimmerBox, { opacity }, style]} />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ShimmerBox style={styles.backButtonShimmer} />
        <ShimmerBox style={styles.titleShimmer} />
        <View style={styles.headerRight} />
      </View>

      {/* Reviews List */}
      <View style={styles.reviewsContainer}>
        <View style={styles.reviewsHeader}>
          <ShimmerBox style={styles.reviewsIconShimmer} />
          <ShimmerBox style={styles.reviewsTitleShimmer} />
        </View>

        <View style={styles.reviewsList}>
          {[...Array(6)].map((_, index) => (
            <View key={index} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.userInfo}>
                  <ShimmerBox style={styles.avatarShimmer} />
                  <View style={styles.userDetails}>
                    <ShimmerBox style={styles.userNameShimmer} />
                    <ShimmerBox style={styles.reviewDateShimmer} />
                  </View>
                </View>
                <View style={styles.ratingStars}>
                  {[...Array(5)].map((_, starIndex) => (
                    <ShimmerBox key={starIndex} style={styles.starShimmer} />
                  ))}
                </View>
              </View>
              <View style={styles.reviewContent}>
                <ShimmerBox style={styles.reviewTextLine1Shimmer} />
                <ShimmerBox style={styles.reviewTextLine2Shimmer} />
                <ShimmerBox style={styles.reviewTextLine3Shimmer} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default UserRatingsShimmer;

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButtonShimmer: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  titleShimmer: {
    width: 180,
    height: 18,
    flex: 1,
    marginHorizontal: 16,
  },
  headerRight: {
    width: 32,
    height: 32,
  },
  reviewsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  reviewsIconShimmer: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  reviewsTitleShimmer: {
    width: 120,
    height: 18,
  },
  reviewsList: {
    gap: 6,
  },
  reviewCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarShimmer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameShimmer: {
    width: 120,
    height: 16,
    marginBottom: 4,
  },
  reviewDateShimmer: {
    width: 80,
    height: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  starShimmer: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  reviewContent: {
    marginTop: 4,
    gap: 8,
  },
  reviewTextLine1Shimmer: {
    width: '100%',
    height: 15,
  },
  reviewTextLine2Shimmer: {
    width: '85%',
    height: 15,
  },
  reviewTextLine3Shimmer: {
    width: '60%',
    height: 15,
  },
});
