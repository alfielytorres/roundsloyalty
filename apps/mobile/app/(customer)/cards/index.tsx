import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

interface Membership {
  id: string
  membership_token: string
  status: string
  joined_at: string
  vendors: {
    id: string
    business_name: string
    category: string | null
  }
  loyalty_balances: Array<{
    stamps_collected: number
    points_accumulated: number
    total_visits: number
    last_active_at: string | null
  }>
}

export default function MyCards() {
  const router = useRouter()
  const { user } = useAuthStore()

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['memberships', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_vendor_memberships')
        .select(`
          id,
          membership_token,
          status,
          joined_at,
          vendors (id, business_name, category),
          loyalty_balances (stamps_collected, points_accumulated, total_visits, last_active_at)
        `)
        .eq('customer_id', user!.id)
        .order('joined_at', { ascending: false })

      if (error) throw error
      return data as Membership[]
    },
    enabled: !!user,
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!memberships?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>☕</Text>
        <Text style={styles.emptyTitle}>No memberships yet</Text>
        <Text style={styles.emptyText}>
          Show the My QR tab at a participating store to earn stamps and rewards.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Cards</Text>
      <FlatList
        data={memberships}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const balance = item.loyalty_balances?.[0]
          const stamps = balance?.stamps_collected ?? 0
          const visits = balance?.total_visits ?? 0
          const isPending = item.status === 'pending'

          return (
            <TouchableOpacity
              style={[styles.card, isPending && styles.cardPending]}
              onPress={() => router.push(`/(customer)/cards/${item.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoInitial}>
                    {item.vendors.business_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.businessName}>{item.vendors.business_name}</Text>
                  <Text style={styles.meta}>
                    {isPending ? 'Show your QR to activate' : `${visits} visit${visits !== 1 ? 's' : ''}`}
                  </Text>
                </View>
                {isPending && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                )}
              </View>

              {!isPending && (
                <View style={styles.stampRow}>
                  {Array.from({ length: Math.min(stamps + 3, 10) }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.stamp, i < stamps && styles.stampFilled]}
                    />
                  ))}
                  <Text style={styles.stampCount}>{stamps} stamps</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
  },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPending: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  businessName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  meta: { fontSize: 13, color: Colors.textSecondary },
  pendingBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.warning },
  stampRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stamp: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.stampEmpty,
    backgroundColor: 'transparent',
  },
  stampFilled: { backgroundColor: Colors.stampFilled, borderColor: Colors.stampFilled },
  stampCount: { fontSize: 13, color: Colors.textSecondary, marginLeft: 4 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
})
