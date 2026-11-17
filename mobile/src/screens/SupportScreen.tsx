// Support: chat (local bot), call, raise ticket, FAQs accordion, my tickets.
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, Card, Chip, GradientButton, GradientHeader, IconButton, Input, SectionTitle } from '../components';
import { colors, radius, touch } from '../theme';
import { api } from '../api/client';
import { Faq, SupportTicket } from '../types';

interface Msg { from: 'me' | 'bot'; text: string; }
const SUPPORT_PHONE = '+918000000000';

export default function SupportScreen() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [chat, setChat] = useState(false);
  const [ticketSheet, setTicketSheet] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: 'Hi! I am Destiny Assist. How can I help with your trip today?' }]);
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [err, setErr] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    api.faqs().then(setFaqs).catch(() => undefined);
    api.tickets().then(setTickets).catch(() => undefined);
  }, []);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMsgs((m) => [...m, { from: 'me', text }]);
    // Simple keyword bot — falls back to FAQ answers
    const hit = faqs.find((f) => text.toLowerCase().split(/\s+/).some((w) => w.length > 3 && f.question.toLowerCase().includes(w)));
    setTimeout(() => {
      setMsgs((m) => [...m, { from: 'bot', text: hit ? hit.answer : 'Thanks! An agent will reply shortly. You can also raise a ticket or call us 24x7.' }]);
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 600);
  };

  const raise = async () => {
    if (subject.trim().length < 3 || desc.trim().length < 10) return setErr('Add a subject and at least 10 characters of detail');
    const t = await api.createTicket(subject.trim(), desc.trim());
    setTickets((x) => [t, ...x.filter((y) => y.id !== t.id)]);
    setTicketSheet(false); setSubject(''); setDesc(''); setErr('');
    Alert.alert('Ticket raised', `Ticket #${t.id} created. We'll get back within 24 hours.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <GradientHeader title="Help & Support" subtitle="We're here 24x7" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.quick}>
          <Quick icon="chatbubbles-outline" label="Chat" onPress={() => setChat(true)} />
          <Quick icon="call-outline" label="Call" onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)} />
          <Quick icon="document-text-outline" label="Raise ticket" onPress={() => setTicketSheet(true)} />
        </View>

        {tickets.length > 0 && (
          <>
            <SectionTitle title="My tickets" />
            {tickets.map((t) => (
              <Card key={t.id} style={{ marginBottom: 8 }} flat>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.q}>#{t.id} {t.subject}</Text>
                  <Text style={{ color: t.status === 'RESOLVED' ? colors.success : colors.warning, fontWeight: '800', fontSize: 12 }}>{t.status}</Text>
                </View>
                <Text style={styles.a} numberOfLines={2}>{t.description}</Text>
              </Card>
            ))}
          </>
        )}

        <SectionTitle title="FAQs" />
        {faqs.map((f, i) => (
          <Pressable key={i} onPress={() => setOpen(open === i ? null : i)} style={styles.faq}
            accessibilityRole="button" accessibilityState={{ expanded: open === i }} accessibilityLabel={f.question}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.q, { flex: 1 }]}>{f.question}</Text>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </View>
            {open === i && <Text style={styles.a}>{f.answer}</Text>}
          </Pressable>
        ))}
      </ScrollView>

      <BottomSheet visible={ticketSheet} onClose={() => setTicketSheet(false)} title="Raise a ticket" footer={<GradientButton title="Submit ticket" onPress={raise} />}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['Refund', 'Payment issue', 'Bus delayed', 'Other'].map((s) => <Chip key={s} label={s} selected={subject === s} onPress={() => setSubject(s)} />)}
        </View>
        <Input label="Subject" value={subject} onChangeText={setSubject} />
        <Input label="Describe the issue" value={desc} onChangeText={setDesc} multiline style={{ minHeight: 96, textAlignVertical: 'top' }} />
        {!!err && <Text style={{ color: colors.danger }}>{err}</Text>}
      </BottomSheet>

      <BottomSheet visible={chat} onClose={() => setChat(false)} title="Chat with us">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scrollRef} style={{ maxHeight: 340 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd()}>
            {msgs.map((m, i) => (
              <View key={i} style={[styles.bubble, m.from === 'me' ? styles.me : styles.bot]}>
                <Text style={{ color: m.from === 'me' ? '#fff' : colors.text }}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.chatInput}>
            <TextInput value={draft} onChangeText={setDraft} placeholder="Type a message" onSubmitEditing={send} returnKeyType="send"
              style={styles.input} accessibilityLabel="Chat message" placeholderTextColor={colors.muted} />
            <IconButton icon="send" label="Send message" color={colors.primary} onPress={send} />
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
}

function Quick({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.qBtn, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={28} color={colors.primary} />
      <Text style={{ fontWeight: '700', color: colors.text, marginTop: 6 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', gap: 10 },
  qBtn: { flex: 1, minHeight: touch.min + 40, backgroundColor: '#fff', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  faq: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginBottom: 8, minHeight: touch.min },
  q: { fontWeight: '700', color: colors.text },
  a: { color: colors.muted, marginTop: 8, lineHeight: 20 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 14, marginVertical: 4 },
  me: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  chatInput: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  input: { flex: 1, minHeight: touch.min, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 16, color: colors.text },
});
