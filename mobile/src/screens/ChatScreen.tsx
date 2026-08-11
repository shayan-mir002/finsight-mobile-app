import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { aiApi } from '../api';
import Screen from '../components/Screen';
import { colors, radius } from '../theme';
import type { ChatMessage } from '../types';

const SUGGESTIONS = [
  'Where did I spend the most this month?',
  'What expenses should I reduce?',
  'How much did I spend on food?',
  'Can I afford to save ₹10,000 this month?',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your AI finance coach. Ask me anything about your spending, budgets and goals — I'll answer using your real data.",
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const { reply } = await aiApi.chat(next);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I couldn't reach the AI service right now. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Coach</Text>
        <View style={styles.online}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      {messages.length <= 1 ? (
        <View style={styles.suggestions}>
          <Text style={styles.suggestTitle}>Try asking</Text>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.suggestionChip} onPress={() => send(s)}>
              <Ionicons name="sparkles" size={14} color={colors.accent} />
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) =>
            item.role === 'user' ? (
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{item.content}</Text>
              </View>
            ) : (
              <View style={styles.assistantRow}>
                <LinearGradient
                  colors={['#8B5CF6', '#6D5BFF']}
                  style={styles.botAvatar}
                >
                  <Ionicons name="sparkles" size={14} color={colors.white} />
                </LinearGradient>
                <View style={styles.assistantBubble}>
                  <Text style={styles.assistantText}>{item.content}</Text>
                </View>
              </View>
            )
          }
          ListFooterComponent={
            sending ? (
              <View style={styles.typing}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.typingText}>FinSight is thinking…</Text>
              </View>
            ) : null
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your money…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  online: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  onlineText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  suggestions: { paddingHorizontal: 20, marginBottom: 10 },
  suggestTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  suggestionText: { color: colors.text, fontSize: 13, flex: 1 },
  messages: { padding: 20, gap: 14, paddingBottom: 20 },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  userText: { color: colors.white, fontSize: 14, lineHeight: 20 },
  assistantRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '88%' },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexShrink: 1,
  },
  assistantText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typingText: { color: colors.textMuted, fontSize: 12 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 110,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
