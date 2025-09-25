import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Globe,
  Check,
  Search,
  X
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useLanguage } from '@/hooks/useLanguage';
import { languages } from '@/stores/languageStore';
import { useTranslation } from '@/hooks/useLanguage';
import { SearchBar } from '@/components/SearchBar';

const { width, height } = Dimensions.get('window');

export const unstable_settings = {
  // Hides this route from deep linking and tab navigation
  href: null,
};

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { selectedLanguage, setLanguage, isChangingLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedLanguage, setTempSelectedLanguage] = useState(selectedLanguage);

  // Filter languages based on search query
  const filteredLanguages = Object.entries(languages).filter(([code, language]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      language.nativeName.toLowerCase().includes(query) ||
      language.name.toLowerCase().includes(query) ||
      code.toLowerCase().includes(query)
    );
  });

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === selectedLanguage || isChangingLanguage) return;

    setTempSelectedLanguage(languageCode);
    await setLanguage(languageCode);
  };

  const getLanguageNativeName = (code: string) => {
    return languages[code as keyof typeof languages]?.nativeName || 'Unknown';
  };

  return (
    <LinearGradient
      colors={['#0E0E0E', '#0E0E0E', '#0E0E0E']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            try {
              router.back();
            } catch {
              router.push('/(tabs)/account');
            }
          }}

          disabled={isChangingLanguage}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('language.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Current Language */}
      <View style={styles.currentLanguageContainer}>
        <View style={styles.currentLanguageIcon}>
          <Globe size={24} color="#6366F1" />
        </View>
        <View style={styles.currentLanguageInfo}>
          <Text style={styles.currentLanguageLabel}>{t('language.current')}:
          </Text>
          <Text style={styles.currentLanguageValue}>
            {getLanguageNativeName(selectedLanguage)}
          </Text>
        </View>
      </View>

      <SearchBar
        placeholder={t('common.search')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {/* Language List */}
      <ScrollView
        style={styles.languageList}
        contentContainerStyle={styles.languageListContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredLanguages.length === 0 ? (
          <View style={styles.emptyState}>
            <Globe size={40} color="#6B7280" />
            <Text style={styles.emptyStateText}>
              {t('language.noResults')} "{searchQuery}"
            </Text>
          </View>
        ) : (
          <>
            {filteredLanguages.map(([code, language]) => {
              const isSelected = tempSelectedLanguage === code;
              const isLoading = isChangingLanguage && isSelected;

              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.languageItem,
                    isSelected && styles.selectedLanguageItem
                  ]}
                  onPress={() => handleLanguageSelect(code)}
                  disabled={isChangingLanguage}
                  activeOpacity={0.7}
                >
                  <View style={styles.languageItemContent}>
                    <View style={[
                      styles.radioButton,
                      isSelected && styles.selectedRadioButton
                    ]}>
                      {isSelected && (
                        <Check size={12} color="#6366F1" />
                      )}
                    </View>

                    <View style={styles.languageInfo}>
                      <Text style={[
                        styles.languageName,
                        isSelected && styles.selectedLanguageName
                      ]}>
                        {language.nativeName}
                      </Text>
                      {code !== 'en' && (
                        <Text style={[
                          styles.languageNameEnglish,
                          isSelected && styles.selectedLanguageNameEnglish
                        ]}>
                          {language.name}
                        </Text>
                      )}
                    </View>

                    {isLoading && (
                      <ActivityIndicator size="small" color="#6366F1" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Loading Overlay */}
      {isChangingLanguage && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>{t('language.changing')}</Text>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,

  },
  backButton: {
    width: 32,
    height: 32,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  currentLanguageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginHorizontal: 10,
    padding: 12,
    marginBottom: 20,
  },
  currentLanguageIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  currentLanguageInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },

  currentLanguageLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  currentLanguageValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
  },
  clearButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#374151cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageList: {
    flex: 1,
  },
  languageListContent: {
    padding: 10,
    paddingBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
  languageItem: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    marginBottom: 8,
    overflow: 'hidden',
  },
  selectedLanguageItem: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  languageItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  radioButton: {
    width: 16,
    height: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4B5563',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadioButton: {
    borderColor: '#6366F1',
    backgroundColor: 'white',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  selectedLanguageName: {
    color: '#6366F1',
  },
  languageNameEnglish: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedLanguageNameEnglish: {
    color: '#818CF8',
  },
  infoContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    marginTop: 16,
    fontWeight: '500',
  },
});