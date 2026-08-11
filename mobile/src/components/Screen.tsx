import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme';

type Props = ViewProps & { padded?: boolean };

export default function Screen({ style, padded = true, children, ...rest }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.content, padded && styles.padded, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  padded: { paddingHorizontal: 20 },
});
