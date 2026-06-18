import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const EVENT_LABEL: Record<string, (delta: number) => string> = {
  stamp_added: (d) => `+${d} stamp${d !== 1 ? 's' : ''}`,
  points_added: (d) => `+${d} pts`,
  reward_redeemed: () => 'Reward redeemed',
  transaction_voided: () => 'Voided',
  joined: () => 'New member',
  activated: () => 'Activated',
  new_customer_reward: () => 'New customer reward',
}

interface LedgerEntry {
  id: string
  event_type: string
  delta: number
  created_at: string
  customer_vendor_memberships: {
    profiles: { display_name: string | null }
  }
}

export default function VendorDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  const { data: vendor } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('owner_id', user!.id)
        .maybeSingle()
      return data
    },
    enabled: !!user,
  })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['vendor-stats', vendor?.id],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [membersRes, weekLedgerRes] = await Promise.all([
        supabase
          .from('customer_vendor_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor!.id)
          .eq('status', 'active'),
        supabase
          .from('loyalty_ledger')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor!.id)
          .gte('created_at', weekAgo),
      ])

      return {
        totalMembers: membersRes.count ?? 0,
        activityThisWeek: weekLedgerRes.count ?? 0,
      }
    },
    enabled: !!vendor,
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['vendor-recent', vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('loyalty_ledger')
        .select(`
          id,
          event_type,
          delta,
          created_at,
          customer_vendor_memberships (
            profiles (display_name)
          )
        `)
        .eq('vendor_id', vendor!.id)
        .order('created_at', { ascending: false })
        .limit(8)

      return (data ?? []) as LedgerEntry[]
    },
    enabled: !!vendor,
  })

  if (!vendor) {
    return (
      <View style={styles.noVendorContainer}>
        <Text style={styles.noVendorTitle}>Set up your store</Text>
        <Text style={styles.noVendorText}>
          Complete your store profile to start rewarding your customers.
        </Text>
        <TouchableOpacity
          style={styles.setupButton}
          onPress={() => router.push('/(vendor)/settings')}
        >
          <Text style={styles.setupButtonText}>Set up store</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey 👋</Text>
        <Text style={styles.businessName}>{vendor.business_name}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label="Active members" value={stats?.totalMembers ?? 0} />
          <StatCard label="Activity this week" value={stats?.activityThisWeek ?? 0} />
        </View>
      )}

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/(vendor)/qr')}
      >
        <Text style={styles.scanButtonText}>📱 Scan Customer QR</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent activity</Text>
      {recentActivity?.length ? (
        recentActivity.map((entry) => {
          const label = (EVENT_LABEL[entry.event_type] ?? (() => entry.event_type))(entry.delta ?? 0)
          const name = entry.customer_vendor_memberships?.profiles?.display_name ?? 'Someone'
          return (
            <View key={entry.id} style={styles.activityRow}>
              <View style={styles.activityDot} />
              <Text style={styles.activityText}>
                <Text style={{ fontWeight: '700' }}>{name}</Text>{' — '}{label}
              </Text>
              <Text style={styles.activityTime}>{fmtDate(entry.created_at)}</Text>
            </View>
          )
        })
      ) : (
        <Text style={styles.noActivity}>No activity yet. Scan a customer QR to get started!</Text>
      )}
    </ScrollView>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48 },
  noVendorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 40,
  },
  noVendorTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 12, textAlign: 'center' },
  noVendorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  setupButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  setupButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  header: { marginBottom: 28 },
  greeting: { fontSize: 16, color: Colors.textSecondary, marginBottom: 4 },
  businessName: { fontSize: 28, fontWeight: '800', color: Colors.text },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 28, fontWeight: '900', color: Colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  scanButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  scanButtonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  activityText: { flex: 1, fontSize: 14, color: Colors.text },
  activityTime: { fontSize: 11, color: Colors.textSecondary },
  noActivity: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 24, lineHeight: 20 },
})
