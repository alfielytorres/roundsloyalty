import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'

export default function Profile() {
  const { user, profile } = useAuthStore()

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await supabase.auth.signOut() } },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.header}>Profile</Text>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{(profile?.display_name ?? user?.email ?? 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.displayName}>{profile?.display_name ?? 'Customer'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>
      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
          <Text style={styles.rowText}>Sign out</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48 },
  header: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 32 },
  avatarSection: { alignItems: 'center', marginBottom: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: Colors.white },
  displayName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  email: { fontSize: 14, color: Colors.textSecondary },
  section: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  rowText: { flex: 1, fontSize: 16, color: Colors.danger },
  rowChevron: { fontSize: 20, color: Colors.textSecondary },
})
