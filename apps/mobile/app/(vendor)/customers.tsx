import { useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

type Segment = 'all' | 'active' | 'pending' | 'inactive'

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'inactive', label: 'Inactive' },
]

function fmtDate(iso: string | null) {
  if (!iso) return 'never'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface Member {
  id: string
  status: string
  joined_at: string
  profiles: { display_name: string | null; email: string | null } | null
  loyalty_balances: Array<{ stamps_collected: number; total_visits: number; last_active_at: string | null }>
}

export default function Customers() {
  const { user } = useAuthStore()
  const [segment, setSegment] = useState<Segment>('active')

  const { data: vendor } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('id').eq('owner_id', user!.id).maybeSingle()
      return data
    },
    enabled: !!user,
  })

  const { data: members, isLoading } = useQuery({
    queryKey: ['vendor-members', vendor?.id, segment],
    queryFn: async () => {
      let query = supabase
        .from('customer_vendor_memberships')
        .select(`id, status, joined_at, profiles (display_name, email), loyalty_balances (stamps_collected, total_visits, last_active_at)`)
        .eq('vendor_id', vendor!.id)
        .order('joined_at', { ascending: false })
      if (segment !== 'all') query = query.eq('status', segment)
      const { data, error } = await query
      if (error) throw error
      return data as Member[]
    },
    enabled: !!vendor,
  })

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Customers</Text>
      <View style={styles.segments}>
        {SEGMENTS.map((s) => (
          <TouchableOpacity key={s.key} style={[styles.pill, segment === s.key && styles.pillActive]} onPress={() => setSegment(s.key)}>
            <Text style={[styles.pillText, segment === s.key && styles.pillTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.empty}>No customers in this segment yet.</Text>}
          renderItem={({ item }) => {
            const balance = item.loyalty_balances?.[0]
            const name = item.profiles?.display_name ?? item.profiles?.email ?? 'Anonymous'
            const stamps = balance?.stamps_collected ?? 0
            const visits = balance?.total_visits ?? 0
            const lastActive = balance?.last_active_at ?? null
            return (
              <View style={styles.customerRow}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerInitial}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{name}</Text>
                  <Text style={styles.customerMeta}>{stamps} stamps · {visits} visit{visits !== 1 ? 's' : ''} · last {fmtDate(lastActive)}</Text>
                </View>
                <View style={[styles.statusBadge, statusStyle(item.status)]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

function statusStyle(status: string) {
  switch (status) {
    case 'active': return { backgroundColor: 'rgba(52,211,153,0.15)' }
    case 'inactive': return { backgroundColor: 'rgba(248,113,113,0.15)' }
    default: return { backgroundColor: 'rgba(251,191,36,0.15)' }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { fontSize: 28, fontWeight: '800', color: Colors.text, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 16 },
  segments: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  customerAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  customerInitial: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  customerName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  customerMeta: { fontSize: 12, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', color: Colors.text, textTransform: 'capitalize' },
  empty: { color: Colors.textSecondary, textAlign: 'center', paddingTop: 40, fontSize: 15 },
})
