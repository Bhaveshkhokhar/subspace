import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Globe, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { languages } from '@/stores/languageStore';
import { useTranslation } from '@/hooks/useLanguage';

const { width, height } = Dimensions.get('window');

export default function LanguageSelectionScreen() {
  const { t } = useTranslation();
  const { selectedLanguage, setLanguage, markLanguageAsSelected, isChangingLanguage } = useLanguage();
  const [tempSelectedLanguage, setTempSelectedLanguage] = useState(selectedLanguage);

  const handleLanguageSelect = (languageCode: string) => {
    setTempSelectedLanguage(languageCode);
  };

  const handleContinue = async () => {
    if (tempSelectedLanguage !== selectedLanguage) {
      await setLanguage(tempSelectedLanguage);
    }

    await markLanguageAsSelected();

    // Navigate to auth screen
    router.replace('/auth');
  };

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      {/* App Icon */}
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.appIcon}
        >
          <Globe size={32} color="white" />
        </LinearGradient>
      </View>

      {/* Header Text */}
      <Text style={styles.title}>{t('language.title')}</Text>
      <Text style={styles.subtitle}>{t('language.subtitle')}</Text>

      {/* Language Selection Container */}
      <View style={styles.selectionContainer}>
        <ScrollView
          style={styles.languageScrollView}
          contentContainerStyle={styles.languageList}
          showsVerticalScrollIndicator={false}
          indicatorStyle="white"
        >
          {Object.entries(languages).map(([code, language]) => {
            const isSelected = tempSelectedLanguage === code;

            return (
              <TouchableOpacity
                key={code}
                style={[
                  styles.languageOption,
                  isSelected && styles.selectedLanguageOption
                ]}
                onPress={() => handleLanguageSelect(code)}
                disabled={isChangingLanguage}
                activeOpacity={0.8}
              >
                <View style={styles.optionContent}>
                  <View style={styles.radioAndText}>
                    <View style={[
                      styles.radio,
                      isSelected && styles.selectedRadio
                    ]}>
                      {isSelected && (
                        <Check size={12} color="#6366F1" />
                      )}
                    </View>

                    <View style={styles.languageInfo}>
                      <Text style={[
                        styles.languageNative,
                        isSelected && styles.selectedLanguageText
                      ]}>
                        {language.nativeName}
                      </Text>
                      {code !== 'en' && (
                        <Text style={[
                          styles.languageName,
                          isSelected && styles.selectedLanguageSubtext
                        ]}>
                          {language.name}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>


        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleContinue}
            disabled={isChangingLanguage}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4F46E5', '#7E22CE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.continueButton,
                isChangingLanguage && styles.continueButtonDisabled
              ]}
            >
              {isChangingLanguage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>{t('common.continue')}</Text>
                  <ArrowRight size={20} color="white" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 40,
    paddingHorizontal: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  appIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 22,
  },
  selectionContainer: {
    backgroundColor: '#181818',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.3)',
    flex: 1,
    maxHeight: height,
    overflow: 'hidden',
    paddingTop: 8,
  },
  languageScrollView: {
    flex: 1,
  },
  languageList: {
    paddingVertical: 6,
  },
  languageOption: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#202020',
  },
  selectedLanguageOption: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  optionContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  radioAndText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedRadio: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  languageInfo: {
    flex: 1,
  },
  languageNative: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 2,
  },
  languageName: {
    fontSize: 14,
    color: '#9CA3AF',
    opacity: 0.75,
  },
  selectedLanguageText: {
    color: 'white',
  },
  selectedLanguageSubtext: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  buttonContainer: {
    padding: 10,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 14,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
  },
});