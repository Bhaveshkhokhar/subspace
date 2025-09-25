import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategorySelect,
}: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryButton,
            selectedCategory === category && styles.selectedCategory,
          ]}
          onPress={() => onCategorySelect(category)}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === category && styles.selectedCategoryText,
            ]}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  selectedCategory: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  selectedCategoryText: {
    color: 'white',
  },
});