import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';
import AppTextInput from '../components/AppTextInput';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false}>
      <LinearGradient
        colors={['#161A3A', '#0B0F19']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.logoWrap}>
          <Ionicons name="sparkles" size={24} color={colors.white} />
        </View>
        <Text style={styles.logo}>FinSight</Text>
        <Text style={styles.tagline}>Your AI-powered money coach</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to manage your finances.</Text>

          <AppTextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
            icon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
          />
          <AppTextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            icon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Sign In"
            onPress={submit}
            loading={loading}
            disabled={!email || !password}
            style={styles.button}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>New to FinSight?</Text>
            <Text style={styles.switchLink} onPress={() => navigation.navigate('Register')}>
              Create an account
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    paddingTop: 70,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: radius.lg * 2,
    borderBottomRightRadius: radius.lg * 2,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logo: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    color: '#B8C0D4',
    fontSize: 14,
    marginTop: 6,
  },
  form: {
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 28,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  button: { marginTop: 8 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: { color: colors.textMuted, fontSize: 14 },
  switchLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
