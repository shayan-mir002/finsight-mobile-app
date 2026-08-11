import { haptics } from '../utils/haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { colors, radius } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'ghost';
};

export default function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  style,
  variant = 'primary',
}: Props) {
  const inactive = disabled || loading;

  const content = (
    <Pressable
      disabled={inactive}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>{label}</Text>
      )}
    </Pressable>
  );

  if (variant === 'ghost') {
    return (
      <View style={[styles.base, styles.ghost, inactive && styles.disabled, style]}>{content}</View>
    );
  }

  return (
    <LinearGradient
      colors={['#8B5CF6', '#6D5BFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.base, inactive && styles.disabled, style]}
    >
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  press: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pressed: { opacity: 0.85 },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  ghost: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostLabel: { color: colors.text },
  disabled: { opacity: 0.5 },
});
