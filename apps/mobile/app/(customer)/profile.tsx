import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'
import type { DataConsent, Business } from '@regulars/types'

interface ConsentWithBusiness extends DataConsent {
  businesses: Pick<Business, 'id' | 'name'>
}

export default function Profile() {
  const { user, profile } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: consents, isLoading } = useQuery({
    queryKey: ['consents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_consents')
        .select('*, businesses(id, name)')
        .eq('customer_id', user!.id)
        .is('withdrawn_at', null)

      if (error) throw error
      return data as ConsentWithBusiness[]
    },
    enabled: !!user,
  })

  const withdrawConsent = useMutation({
    mutationFn: async ({ consentId, businessName }: { consentId: string; businessName: string }) => {
      return new Promise<void>((resolve, reject) => {
        Alert.alert(
          'Withdraw consent',
          `Remove your data from ${businessName}? You'll no longer appear in their customer list.`,
          [
            { text: 'Cancel', onPress: () => reject(new Error('cancelled')), style: 'cancel' },
            {
              text: 'Withdraw',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase
                  .from('data_consents')
                  .update({ withdrawn_at: new Date().toISOString() })
                  .eq('id', consentId)
                if (error) reject(error)
                else resolve()
              },
            },
          ],
        )
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consents'] }),
  })

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Avatar */}
      <View style={styles.avatarArea}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.display_name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.display_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* My data section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage my data</Text>
        <Text style={styles.sectionDesc}>
          Businesses you've shared your visit data with. Withdraw consent to remove yourself from their records.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
        ) : consents?.length ? (
          consents.map((consent) => (
            <View key={consent.id} style={styles.consentRow}>
              <View style={styles.consentLogo}>
                <Text style={styles.consentLogoText}>
                  {consent.businesses.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.consentName}>{consent.businesses.name}</Text>
              <TouchableOpacity
                onPress={() =>
                  withdrawConsent.mutate({
                    consentId: consent.id,
                    businessName: consent.businesses.name,
                  })
                }
              >
                <Text style={styles.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noConsents}>No active data sharing agreements.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 48,
  },
  avatarArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  consentLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consentLogoText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  consentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  withdrawText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '600',
  },
  noConsents: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  signOutButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.taupe,
  },
  signOutText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
})
