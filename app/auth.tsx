import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';


const DEFAULT_ZONES = ['deep-focus', 'builder', 'wind-down', 'movement', 'stillness'];

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>(
    params.mode === 'login' ? 'login' : 'signup'
  );
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authed, setAuthed] = useState(false);

  async function handleSignUp() {
    if (!firstName.trim() || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: firstName.trim(),
        suggested_zones: [],
        walkthrough_done: false,
      });
    }
    setLoading(false);
    setAuthed(true);
  }

  async function handleLogIn() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    router.replace('/dashboard' as any);
  }

  // ── POST SIGNUP CHOICE ──
  if (authed) {
    return (
      <View style={styles.container}>
        <View style={styles.choiceContent}>
          <Text style={styles.bolt}>⚡</Text>
          <Text style={styles.choiceTitle}>WELCOME{'\n'}TO VOLT.</Text>
          <Text style={styles.choiceSubtitle}>How do you want to get started?</Text>

          <TouchableOpacity
            style={styles.choiceCardPrimary}
            onPress={() => router.push({ pathname: '/planday' as any, params: { newAccount: 'true' } })}>
            <Text style={styles.choiceCardEmoji}>⚡</Text>
            <View style={styles.choiceCardInfo}>
              <Text style={styles.choiceCardTitle}>PLAN MY DAY WITH AI</Text>
              <Text style={styles.choiceCardDesc}>
                Dump your tasks — AI assigns the right zones for you
              </Text>
            </View>
            <Text style={styles.choiceArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.choiceCardSecondary}
            onPress={() => router.push({ pathname: '/dashboard' as any, params: { newAccount: 'true' } })}>
            <Text style={styles.choiceCardEmoji}>⚡</Text>
            <View style={styles.choiceCardInfo}>
              <Text style={[styles.choiceCardTitle, { color: '#5050a0' }]}>JUMP STRAIGHT IN</Text>
              <Text style={styles.choiceCardDesc}>
                Start with a default set of zones — customize later
              </Text>
            </View>
            <Text style={[styles.choiceArrow, { color: '#5050a0' }]}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── AUTH FORM ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        <Text style={styles.bolt}>⚡</Text>
        <Text style={styles.wordmark}>VOLT</Text>
        <Text style={styles.tagline}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </Text>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
            onPress={() => { setMode('signup'); setError(''); }}>
            <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>
              SIGN UP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
            onPress={() => { setMode('login'); setError(''); }}>
            <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
              LOG IN
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="First name"
            placeholderTextColor="#5050a0"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#5050a0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#5050a0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error.length > 0 && (
          <Text style={styles.error}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.btn, !loading && styles.btnEnabled]}
          onPress={mode === 'signup' ? handleSignUp : handleLogIn}
          disabled={loading}>
          <Text style={styles.btnText}>
            {loading ? 'LOADING...' : mode === 'signup' ? 'CREATE ACCOUNT →' : 'LOG IN →'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1e' },
  content: { padding: 32, paddingTop: 80, paddingBottom: 60 },
  bolt: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  wordmark: { fontWeight: '900', fontSize: 48, letterSpacing: 8, color: '#a0a2ff', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 13, color: '#5050a0', textAlign: 'center', letterSpacing: 1, marginBottom: 40 },
  modeRow: { flexDirection: 'row', backgroundColor: '#13132e', borderRadius: 10, padding: 4, marginBottom: 28 },
  modeBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: '#4f52ff' },
  modeBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: '#5050a0' },
  modeBtnTextActive: { color: '#ffffff' },
  input: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 12, padding: 16, fontSize: 14, color: '#e8e8ff', marginBottom: 12 },
  error: { fontSize: 12, color: '#f07a7a', marginBottom: 12, textAlign: 'center', lineHeight: 18 },
  btn: { backgroundColor: '#2a2a5a', borderRadius: 12, padding: 16, alignItems: 'center', opacity: 0.4, marginBottom: 12 },
  btnEnabled: { backgroundColor: '#4f52ff', opacity: 1 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  choiceContent: { flex: 1, padding: 32, paddingTop: 80, justifyContent: 'center' },
  choiceTitle: { fontWeight: '900', fontSize: 40, letterSpacing: 1, color: '#e8e8ff', lineHeight: 44, marginBottom: 12, textAlign: 'center' },
  choiceSubtitle: { fontSize: 14, fontWeight: '300', color: '#5050a0', textAlign: 'center', marginBottom: 40 },
  choiceCardPrimary: { backgroundColor: 'rgba(79,82,255,0.1)', borderWidth: 1, borderColor: '#4f52ff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  choiceCardSecondary: { backgroundColor: '#13132e', borderWidth: 1, borderColor: '#2a2a5a', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  choiceCardEmoji: { fontSize: 28, flexShrink: 0 },
  choiceCardInfo: { flex: 1 },
  choiceCardTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: '#a0a2ff', marginBottom: 4 },
  choiceCardDesc: { fontSize: 12, fontWeight: '300', color: '#5050a0', lineHeight: 18 },
  choiceArrow: { fontSize: 18, color: '#4f52ff', flexShrink: 0 },
});