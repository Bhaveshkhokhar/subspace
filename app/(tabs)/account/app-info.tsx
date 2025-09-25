import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Users,
  FileText,
  Shield,
  ScrollText,
  RotateCcw,
  ChevronRight
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from '@/hooks/useLanguage';

const { width } = Dimensions.get('window');

export default function AppInfoScreen() {
  const { t } = useTranslation();

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/account');
    }
  };

  const handleTeamPress = () => {
    router.push('/(tabs)/account/team');
  };

  const handleLicensesPress = async () => {
    try {
      await Linking.openURL('https://subspace.money/docs/whatsub-single-docs-subspace-policies-licences');
    } catch (error) {
      console.error('Error opening licenses URL:', error);
    }
  };

  const handlePrivacyPolicyPress = async () => {
    try {
      await Linking.openURL('https://subspace.money/docs/whatsub-single-docs-subspace-policies-privacy-policy');
    } catch (error) {
      console.error('Error opening privacy policy URL:', error);
    }
  };

  const handleTermsConditionsPress = async () => {
    try {
      await Linking.openURL('https://subspace.money/docs/whatsub-single-docs-subspace-policies-terms-and-conditions');
    } catch (error) {
      console.error('Error opening terms & conditions URL:', error);
    }
  };

  const handleReturnRefundPress = async () => {
    try {
      await Linking.openURL('https://subspace.money/docs/whatsub-single-docs-subspace-policies-return-and-refund-policy');
    } catch (error) {
      console.error('Error opening return & refund policy URL:', error);
    }
  };

  const infoItems = [
    {
      icon: Users,
      title: 'Team',
      color: '#6366F1',
      onPress: handleTeamPress,
    },
    {
      icon: FileText,
      title: 'Licenses',
      color: '#8B5CF6',
      onPress: handleLicensesPress,
    },
    {
      icon: Shield,
      title: 'Privacy Policy',
      color: '#10B981',
      onPress: handlePrivacyPolicyPress,
    },
    {
      icon: ScrollText,
      title: 'Terms & Conditions',
      color: '#F59E0B',
      onPress: handleTermsConditionsPress,
    },
    {
      icon: RotateCcw,
      title: 'Return and Refund Policy',
      color: '#EF4444',
      onPress: handleReturnRefundPress,
    },
  ];

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Info</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* App Logo and Version */}
        <View style={styles.appInfoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image
                source={require('@/assets/images/subspace.png')}
                // source={require(`https://app.subspace.money/assets/assets/logo.gif`)}
                style={styles.appLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.versionText}>Version 2.4.67</Text>
          <Text style={styles.copyrightText}>© 2023</Text>
          <Text style={styles.companyText}>Subspace Technologies Private Limited</Text>
        </View>

        {/* Info Items */}
        <View style={styles.infoItemsContainer}>
          {infoItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.infoItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.infoItemContent}>
                <View style={[
                  styles.infoIcon,
                  { backgroundColor: `${item.color}20` }
                ]}>
                  <item.icon size={20} color={item.color} />
                </View>
                <Text style={styles.infoTitle}>{item.title}</Text>
              </View>
              <ChevronRight size={20} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    fontWeight: '800',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 32,
    height: 32,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 10,
    marginBottom: 12,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appLogo: {
    width: '100%',
    height: '100%',
  },
  versionText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  copyrightText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  companyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoItemsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  infoItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
});  