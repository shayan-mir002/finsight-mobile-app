import Ionicons from 'react-native-vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { categoryColors, categoryIcons, colors, radius } from '../theme';

export default function CategoryIcon({
  category,
  size = 44,
}: {
  category: string;
  size?: number;
}) {
  const color = categoryColors[category] ?? categoryColors.Other;
  return (
    <View
      style={[
        styles.icon,
        { width: size, height: size, borderRadius: size / 2.4, backgroundColor: `${color}22` },
      ]}
    >
      <Ionicons name={categoryIcons[category] as never} size={size * 0.5} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
});
