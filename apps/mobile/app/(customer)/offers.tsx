import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

const EVENT_EMOJI: Record<string, string> = {
  stamp_added: '📮', points_added: '⭐', reward_redeemed: '🎁',
  transaction_voided: '↩️', joined: '👋', activated: '✅', new_customer_reward: '🎉',
}
const EVENT_LABEL: Record<string, (delta: number) => string> = {
  stamp_added: (d) => `+${d} stamp${d !== 1 ? 's' : ''}`,
  points_added: (d) => `+${d} pts`,
  reward_redeemed: () => 'Reward redeemed',
  transaction_voided: () => 'Transaction voided',
  joined: () => 'Joined',
  activated: () => 'Activated',
  new_customer_reward: () => 'New customer reward',
}

interface LedgerEntry {
  id: string
  event_type: string
  delta: number
  balance_after: number
  notes: string | null
  created_at: string
  customer_vendor_memberships: { vendors: { business_name: string } }
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Activity() {
  const { user } = useAuthStore()

  const { data: entries, isLoading } = useQuery({
    queryKey: ['ledger', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_ledger')
        .select(`id, event_type, delta, balance_after, notes, created_at, customer_vendor_memberships (vendors (business_name))`)
        .eq('customer_vendor_memberships.customer_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as LedgerEntry[]
    },
    enabled: !!user,
  })

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>

  if (!entries?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>No activity yet</Text>
        <Text style={styles.emptyText}>Your stamp and reward history will appear here.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Activity</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const emoji = EVENT_EMOJI[item.event_type] ?? '•'
          const label = (EVENT_LABEL[item.event_type] ?? (() => item.event_type))(item.delta ?? 0)
          const business = item.customer_vendor_memberships?.vendors?.business_name ?? ''
          return (
            <View style={styles.row}>
              <View style={styles.iconWrap}><Text style={styles.icon}>{emoji}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowBusiness}>{business}</Text></View>
              <Text style={styles.rowDate}>{fmtDate(item.created_at)}</Text>
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { fontSize: 28, fontWeight: '800', color: Colors.text, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 16 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 18 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  rowBusiness: { fontSize: 12, color: Colors.textSecondary },
  rowDate: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
})
