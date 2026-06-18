import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

export default function VendorSettings() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('id, business_name, description, category, status').eq('owner_id', user!.id).maybeSingle()
      return data
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (vendor) {
      setBusinessName(vendor.business_name ?? '')
      setDescription(vendor.description ?? '')
    }
  }, [vendor])

  const save = useMutation({
    mutationFn: async () => {
      if (!businessName.trim()) throw new Error('Business name is required.')
      if (!vendor) {
        const { data: newVendor, error } = await supabase
          .from('vendors')
          .insert({ owner_id: user!.id, business_name: businessName.trim(), description: description.trim() || null, status: 'active' })
          .select().single()
        if (error || !newVendor) throw error ?? new Error('Failed to create vendor')
        await supabase.from('vendor_staff').insert({ vendor_id: newVendor.id, user_id: user!.id, role: 'owner' })
      } else {
        const { error } = await supabase.from('vendors').update({ business_name: businessName.trim(), description: description.trim() || null }).eq('id', vendor.id)
        if (error) throw error
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendor'] }); Alert.alert('Saved', 'Store settings updated.') },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  const signOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.header}>Settings</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Store profile</Text>
        <Text style={styles.label}>Business name</Text>
        <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="e.g. Patricia's Coffee" placeholderTextColor={Colors.textMuted} />
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.inputMultiline]} value={description} onChangeText={setDescription} placeholder="Tell customers about your store…" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />
        <TouchableOpacity style={[styles.saveBtn, save.isPending && styles.saveBtnDisabled]} onPress={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 28 },
  section: { backgroundColor: Colors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, marginBottom: 16 },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  signOutBtn: { paddingVertical: 14, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' },
  signOutText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
})
