import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface Claim {
  id: string
  amount: number | null
  description: string | null
  status: string
  created_at: string
  profiles: { display_name: string | null; email: string | null } | null
}

export default function Claims() {
  const { user } = useAuthStore()

  const { data: vendor } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('id').eq('owner_id', user!.id).maybeSingle()
      return data
    },
    enabled: !!user,
  })

  const { data: claims, isLoading } = useQuery({
    queryKey: ['vendor-claims', vendor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proof_of_purchase_claims')
        .select(`id, amount, description, status, created_at, profiles (display_name, email)`)
        .eq('vendor_id', vendor!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Claim[]
    },
    enabled: !!vendor,
  })

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>

  if (!claims?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>No claims yet</Text>
        <Text style={styles.emptyText}>When customers submit proof-of-purchase claims they'll appear here.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Claims</Text>
      <FlatList
        data={claims}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const name = item.profiles?.display_name ?? item.profiles?.email ?? 'Anonymous'
          return (
            <View style={[styles.claimCard, statusCardStyle(item.status)]}>
              <View style={styles.claimHeader}>
                <Text style={styles.claimName}>{name}</Text>
                <View style={[styles.statusBadge, statusBadgeStyle(item.status)]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              {item.description && <Text style={styles.claimDesc}>{item.description}</Text>}
              <Text style={styles.claimMeta}>{item.amount != null ? `$${item.amount.toFixed(2)} · ` : ''}{fmtDate(item.created_at)}</Text>
            </View>
          )
        }}
      />
    </View>
  )
}

function statusCardStyle(status: string) {
  if (status === 'pending') return { borderColor: 'rgba(251,191,36,0.3)' }
  if (status === 'approved') return { borderColor: 'rgba(52,211,153,0.3)' }
  return {}
}

function statusBadgeStyle(status: string) {
  if (status === 'pending') return { backgroundColor: 'rgba(251,191,36,0.15)' }
  if (status === 'approved') return { backgroundColor: 'rgba(52,211,153,0.15)' }
  return { backgroundColor: 'rgba(248,113,113,0.15)' }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { fontSize: 28, fontWeight: '800', color: Colors.text, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 16 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  claimCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.border },
  claimHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  claimName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', color: Colors.text, textTransform: 'capitalize' },
  claimDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8, lineHeight: 20 },
  claimMeta: { fontSize: 12, color: Colors.textMuted },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
})
