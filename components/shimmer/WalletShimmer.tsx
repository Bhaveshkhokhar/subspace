import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width } = Dimensions.get('window');

const WalletShimmer: React.FC = () => {
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
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <ShimmerBox style={styles.balanceLabelShimmer} />
          <ShimmerBox style={styles.balanceIconShimmer} />
        </View>

        <ShimmerBox style={styles.balanceAmountShimmer} />

        <View style={styles.balanceBreakdown}>
          <View style={styles.balanceItem}>
            <ShimmerBox style={styles.balanceItemLabelShimmer} />
            <ShimmerBox style={styles.balanceItemValueShimmer} />
          </View>
          <View style={styles.balanceItem}>
            <ShimmerBox style={styles.balanceItemLabelShimmer} />
            <ShimmerBox style={styles.balanceItemValueShimmer} />
          </View>
        </View>
      </View>

      {/* Add Money Card */}
      <View style={styles.addMoneyCard}>
        <ShimmerBox style={styles.addMoneyTitleShimmer} />
        <ShimmerBox style={styles.amountInputShimmer} />

        <View style={styles.quickAmountContainer}>
          {[...Array(4)].map((_, index) => (
            <ShimmerBox key={index} style={styles.quickAmountButtonShimmer} />
          ))}
        </View>

        <ShimmerBox style={styles.proceedButtonShimmer} />
      </View>

      {/* Transactions Card */}
      <View style={styles.transactionsCard}>
        <View style={styles.transactionsHeader}>
          <ShimmerBox style={styles.transactionsTitleShimmer} />
          <ShimmerBox style={styles.transactionsIconShimmer} />
        </View>

        <View style={styles.transactionsList}>
          {[...Array(6)].map((_, index) => (
            <View key={index} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <ShimmerBox style={styles.transactionIconShimmer} />
                <View style={styles.transactionDetails}>
                  <ShimmerBox style={styles.transactionPurposeShimmer} />
                  <ShimmerBox style={styles.transactionDateShimmer} />
                </View>
              </View>
              <View style={styles.transactionRight}>
                <ShimmerBox style={styles.transactionAmountShimmer} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default WalletShimmer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
    paddingTop: 40,
    paddingBottom: 10,
  },
  shimmerBox: {
    backgroundColor: '#374151',
    borderRadius: 8,
    overflow: 'hidden',
  },
  balanceCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    padding: 20,
    marginBottom: 20,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabelShimmer: {
    width: 80,
    height: 20,
  },
  balanceIconShimmer: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  balanceAmountShimmer: {
    width: 150,
    height: 36,
    marginBottom: 20,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceItem: {
    flex: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  balanceItemLabelShimmer: {
    width: 60,
    height: 14,
    marginBottom: 8,
  },
  balanceItemValueShimmer: {
    width: 70,
    height: 16,
  },
  addMoneyCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginHorizontal: 10,
    padding: 20,
    marginBottom: 20,
  },
  addMoneyTitleShimmer: {
    width: 120,
    height: 18,
    marginBottom: 20,
  },
  amountInputShimmer: {
    height: 48,
    borderRadius: 12,
    marginBottom: 16,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  quickAmountButtonShimmer: {
    flex: 1,
    height: 40,
    borderRadius: 12,
  },
  proceedButtonShimmer: {
    height: 48,
    borderRadius: 12,
  },
  transactionsCard: {
    marginHorizontal: 10,
    padding: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitleShimmer: {
    width: 150,
    height: 18,
  },
  transactionsIconShimmer: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.3)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconShimmer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionPurposeShimmer: {
    width: 140,
    height: 14,
    marginBottom: 4,
  },
  transactionDateShimmer: {
    width: 100,
    height: 11,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmountShimmer: {
    width: 80,
    height: 14,
  },
});
