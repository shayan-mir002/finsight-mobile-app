import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { colors, radius } from '../theme';

type Props = {
  progress: number;
  color?: string;
  height?: number;
  label?: string;
};

export default function ProgressBar({
  progress,
  color = colors.accent,
  height = 8,
  label,
}: Props) {
  const pct = Math.min(Math.max(progress, 0), 1);
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.track, { height }]}>
        <LinearGradient
          colors={[color, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${pct * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: { borderRadius: radius.full, height: '100%' },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
});
