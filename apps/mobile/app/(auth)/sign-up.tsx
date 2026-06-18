import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import type { UserRole } from '@rounds/types'

export default function SignUp() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name, role } },
    })
    setLoading(false)

    if (error) {
      Alert.alert('Sign up failed', error.message)
    } else {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Click it to activate your account.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }],
      )
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join thousands of loyal customers</Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity style={[styles.roleCard, role === 'customer' && styles.roleCardActive]} onPress={() => setRole('customer')}>
            <Text style={styles.roleEmoji}>☕</Text>
            <Text style={[styles.roleTitle, role === 'customer' && styles.roleTitleActive]}>I'm a Customer</Text>
            <Text style={styles.roleDesc}>Earn stamps & rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roleCard, role === 'vendor' && styles.roleCardActive]} onPress={() => setRole('vendor')}>
            <Text style={styles.roleEmoji}>🏪</Text>
            <Text style={[styles.roleTitle, role === 'vendor' && styles.roleTitleActive]}>I run a Business</Text>
            <Text style={styles.roleDesc}>Reward your customers</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Your name</Text>
        <TextInput style={styles.input} placeholder="Jane Smith" placeholderTextColor={Colors.taupe} value={name} onChangeText={setName} />
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={Colors.taupe} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="At least 8 characters" placeholderTextColor={Colors.taupe} secureTextEntry value={password} onChangeText={setPassword} />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create account'}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" style={styles.footerLink}>Sign in</Link>
        </View>
        <Text style={styles.terms}>By signing up, you agree to our Terms of Service and Privacy Policy.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { paddingHorizontal: 28, paddingTop: 72, paddingBottom: 48 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.primaryDark, marginBottom: 6 },
  subtitle: { fontSize: 16, color: Colors.taupe, marginBottom: 32 },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  roleEmoji: { fontSize: 28, marginBottom: 8 },
  roleTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  roleTitleActive: { color: Colors.primaryDark },
  roleDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.primaryDark, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.primaryDark, borderWidth: 1.5, borderColor: Colors.border },
  button: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  footerText: { color: Colors.textSecondary, fontSize: 15 },
  footerLink: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  terms: { fontSize: 12, color: Colors.taupe, textAlign: 'center', marginTop: 20, lineHeight: 18 },
})
