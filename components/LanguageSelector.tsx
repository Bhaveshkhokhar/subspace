import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Globe, X } from 'lucide-react-native';
import { useLanguage } from '@/hooks/useLanguage';
import { languages, getLanguageNativeName } from '@/stores/languageStore';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  onLanguageSelect?: (language: string) => void;
}

export default function LanguageSelector({ 
  visible, 
  onClose, 
  onLanguageSelect 
}: LanguageSelectorProps) {
  const { selectedLanguage, setLanguage, isChangingLanguage, t } = useLanguage();
  const [tempSelectedLanguage, setTempSelectedLanguage] = useState(selectedLanguage);

  const handleLanguageSelect = async (languageCode: string) => {
    setTempSelectedLanguage(languageCode);
    await setLanguage(languageCode);
    
    if (onLanguageSelect) {
      onLanguageSelect(languageCode);
    }
    
    // Close modal after language change
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          style={styles.modalContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Globe size={24} color="#6366F1" />
              <Text style={styles.title}>{t('language.title')}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isChangingLanguage}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{t('language.subtitle')}</Text>

          {/* Language List */}
          <ScrollView 
            style={styles.languageList}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(languages).map(([code, language]) => {
              const isSelected = tempSelectedLanguage === code;
              const isCurrentlyChanging = isChangingLanguage && isSelected;
              
              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.languageItem,
                    isSelected && styles.selectedLanguageItem
                  ]}
                  onPress={() => handleLanguageSelect(code)}
                  disabled={isChangingLanguage}
                >
                  <View style={styles.languageInfo}>
                    <Text style={[
                      styles.languageName,
                      isSelected && styles.selectedLanguageName
                    ]}>
                      {language.name}
                    </Text>
                    <Text style={[
                      styles.languageNative,
                      isSelected && styles.selectedLanguageNative
                    ]}>
                      {language.nativeName}
                    </Text>
                  </View>
                  
                  <View style={styles.languageAction}>
                    {isCurrentlyChanging ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : isSelected ? (
                      <View style={styles.checkContainer}>
                        <Check size={20} color="#6366F1" />
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Current Language Info */}
          <View style={styles.currentLanguageInfo}>
            <Text style={styles.currentLanguageLabel}>
              {t('language.current')}:
            </Text>
            <Text style={styles.currentLanguageValue}>
              {getLanguageNativeName(selectedLanguage)}
            </Text>
          </View>

          {/* Loading State */}
          {isChangingLanguage && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>
                  {t('language.changing')}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
    lineHeight: 20,
  },
  languageList: {
    flex: 1,
    marginBottom: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  selectedLanguageItem: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  selectedLanguageName: {
    color: '#E0E7FF',
  },
  languageNative: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedLanguageNative: {
    color: '#C7D2FE',
  },
  languageAction: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLanguageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  currentLanguageLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  currentLanguageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
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
    borderRadius: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});