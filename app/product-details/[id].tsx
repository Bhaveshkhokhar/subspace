import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ProductDetailScreen from '../product-details';

export default function ProductDetailRoute() {
  const params = useLocalSearchParams();
  
  return <ProductDetailScreen />;
}