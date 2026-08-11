import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useState } from 'react';
import {
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

export default function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start tracking smarter in under a minute.</Text>

          <AppTextInput
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            icon={<Ionicons name="person-outline" size={18} color={colors.textMuted} />}
          />
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
            placeholder="Minimum 6 characters"
            icon={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Create Account"
            onPress={submit}
            loading={loading}
            disabled={!name || !email || password.length < 6}
            style={styles.button}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account?</Text>
            <Text style={styles.switchLink} onPress={() => navigation.goBack()}>
              Sign in
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
  form: { padding: 24, paddingBottom: 60 },
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
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  button: { marginTop: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: colors.textMuted, fontSize: 14 },
  switchLink: { color: colors.accent, fontSize: 14, fontWeight: '600', marginLeft: 4 },
});
