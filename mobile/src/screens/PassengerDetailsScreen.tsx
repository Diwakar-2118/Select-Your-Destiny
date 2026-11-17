// Per-seat passenger forms + contact, emergency contact, optional GST, save passenger; validated.
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Card, Chip, GradientButton, GradientHeader, Input } from '../components';
import { colors } from '../theme';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { PassengerInput } from '../types';
import { isEmail, isGstin, isMobile } from '../utils';
import { RootScreenProps } from '../navigation/types';

type Gender = PassengerInput['gender'];
interface Form { name: string; age: string; gender: Gender; save: boolean; }

export default function PassengerDetailsScreen({ navigation }: RootScreenProps<'PassengerDetails'>) {
  const { user } = useAuth();
  const { selectedSeats, passengers, setPassengers, contact, setContact } = useBooking();
  const [forms, setForms] = useState<Form[]>(() => selectedSeats.map((s, i) => {
    const p = passengers.find((x) => x.seatNumber === s.seatNumber);
    return { name: p?.name ?? '', age: p ? String(p.age) : '', gender: p?.gender ?? (s.isLadies ? 'FEMALE' : i === 0 ? 'MALE' : 'MALE'), save: false };
  }));
  const [mobile, setMobile] = useState(contact.mobile || user?.mobile || '');
  const [email, setEmail] = useState(contact.email || user?.email || '');
  const [emergency, setEmergency] = useState(contact.emergencyContact ?? '');
  const [gstOn, setGstOn] = useState(!!contact.gstNumber);
  const [gstNumber, setGstNumber] = useState(contact.gstNumber ?? '');
  const [gstCompany, setGstCompany] = useState(contact.gstCompany ?? '');
  const [saved, setSaved] = useState<PassengerInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { api.passengers().then(setSaved).catch(() => undefined); }, []);

  const update = (i: number, patch: Partial<Form>) => setForms((f) => f.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const submit = async () => {
    const e: Record<string, string> = {};
    forms.forEach((f, i) => {
      if (f.name.trim().length < 2) e[`name${i}`] = 'Enter passenger name';
      const age = Number(f.age);
      if (!Number.isInteger(age) || age < 1 || age > 120) e[`age${i}`] = 'Age 1–120';
      if (selectedSeats[i].isLadies && f.gender !== 'FEMALE') e[`gender${i}`] = 'Ladies seat: female passenger only';
    });
    if (!isMobile(mobile)) e.mobile = 'Enter a valid 10-digit mobile';
    if (!isEmail(email)) e.email = 'Enter a valid email';
    if (emergency && !isMobile(emergency)) e.emergency = 'Enter a valid 10-digit mobile';
    if (gstOn && !isGstin(gstNumber)) e.gst = 'Enter a valid 15-character GSTIN';
    if (gstOn && !gstCompany.trim()) e.gstCompany = 'Company name required';
    setErrors(e);
    if (Object.keys(e).length) return;

    const list: PassengerInput[] = forms.map((f, i) => ({ name: f.name.trim(), age: Number(f.age), gender: f.gender, seatNumber: selectedSeats[i].seatNumber }));
    setPassengers(list);
    setContact({ mobile, email: email.trim(), emergencyContact: emergency || undefined, gstNumber: gstOn ? gstNumber.toUpperCase() : undefined, gstCompany: gstOn ? gstCompany : undefined });
    forms.forEach((f, i) => { if (f.save) api.savePassenger({ ...list[i], seatNumber: '' }).catch(() => undefined); });
    navigation.navigate('BookingSummary');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientHeader title="Passenger details" subtitle={`${selectedSeats.length} seat(s): ${selectedSeats.map((s) => s.seatNumber).join(', ')}`} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {forms.map((f, i) => (
          <Card key={selectedSeats[i].seatNumber} style={{ marginBottom: 12 }}>
            <Text style={styles.h} accessibilityRole="header">
              Passenger {i + 1} · Seat {selectedSeats[i].seatNumber}{selectedSeats[i].isLadies ? ' (Ladies)' : ''}
            </Text>
            {saved.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                {saved.map((p, k) => (
                  <Chip key={`${p.name}-${k}`} label={p.name} icon="person-add-outline"
                    onPress={() => update(i, { name: p.name, age: String(p.age), gender: p.gender })} />
                ))}
              </ScrollView>
            )}
            <Input label="Full name" value={f.name} onChangeText={(v) => update(i, { name: v })} error={errors[`name${i}`]} />
            <Input label="Age" value={f.age} onChangeText={(v) => update(i, { age: v.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={3} error={errors[`age${i}`]} />
            <Text style={styles.label}>Gender</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {(['MALE', 'FEMALE', 'OTHER'] as Gender[]).map((g) => (
                <Chip key={g} label={g[0] + g.slice(1).toLowerCase()} selected={f.gender === g} onPress={() => update(i, { gender: g })} />
              ))}
            </View>
            {!!errors[`gender${i}`] && <Text style={styles.err}>{errors[`gender${i}`]}</Text>}
            <View style={styles.switchRow}>
              <Text style={{ color: colors.text }}>Save to my passengers</Text>
              <Switch value={f.save} onValueChange={(v) => update(i, { save: v })} accessibilityLabel={`Save passenger ${i + 1}`} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
          </Card>
        ))}

        <Card style={{ marginBottom: 12 }}>
          <Text style={styles.h} accessibilityRole="header">Contact details</Text>
          <Text style={styles.note}>Ticket and updates will be sent here.</Text>
          <Input label="Mobile" icon="call-outline" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={10} error={errors.mobile} />
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
          <Input label="Emergency contact (optional)" icon="medkit-outline" value={emergency} onChangeText={setEmergency} keyboardType="phone-pad" maxLength={10} error={errors.emergency} />
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text }}>I have a GST number (optional)</Text>
            <Switch value={gstOn} onValueChange={setGstOn} accessibilityLabel="Add GST details" trackColor={{ true: colors.primary, false: colors.border }} />
          </View>
          {gstOn && (
            <>
              <Input label="GSTIN" value={gstNumber} onChangeText={setGstNumber} autoCapitalize="characters" maxLength={15} error={errors.gst} />
              <Input label="Company name" value={gstCompany} onChangeText={setGstCompany} error={errors.gstCompany} />
            </>
          )}
        </Card>

        <GradientButton title="Continue to summary" icon="arrow-forward" onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  err: { color: colors.danger, fontSize: 12 },
  note: { color: colors.muted, fontSize: 12, marginBottom: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
});
