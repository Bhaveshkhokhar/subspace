import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, StyleProp, ViewStyle, Platform } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChangeText,
  onSubmit,
  onClear,
  autoFocus = false,
  onFocus,
  onBlur,
  style,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText('');
    if (onClear) onClear();
  };

  return (
    <View style={[styles.searchSection, style]}>
      <View style={[
        styles.searchContainer,
        isFocused && styles.searchContainerFocused
      ]}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          style={[
            styles.searchInput,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null, // ✅ TS-safe
          ]}
          underlineColorAndroid="transparent"
          selectionColor="#6366F1"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          autoFocus={autoFocus}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <X size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    gap: 8,
  },
  searchContainerFocused: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  searchInput: {
    flex:1,
    color: 'white',
    fontSize: 14,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 2,
  },
});