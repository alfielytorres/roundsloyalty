import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'
import { formatRelativeTime } from '@rounds/utils'

interface DashboardStats {
  totalCustomers: number
  visitsThisWeek: number
  stampsGiven: number
  topCustomer: string | null
}

interface RecentActivity {
  id: string
  created_at: string
  stamps_added: number
  customer_name: string
}

export default function VendorDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  const { data: business } = useQuery({
    queryKey: ['vendor-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user!.id)
        .single()
      return data
    },
    enabled: !!user,
  })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', business?.id],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [customersRes, weekVisitsRes, stampsRes] = await Promise.all([
        supabase
          .from('vendor_customer_segments')
          .select('customer_id', { count: 'exact', head: true })
          .eq('business_id', business!.id),
        supabase
          .from('visit_events')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business!.id)
          .gte('created_at', weekAgo),
        supabase
          .from('visit_events')
          .select('stamps_added')
          .eq('business_id', business!.id),
      ])

      const totalStamps = stampsRes.data?.reduce((sum, e) => sum + (e.stamps_added ?? 0), 0) ?? 0

      return {
        totalCustomers: customersRes.count ?? 0,
        visitsThisWeek: weekVisitsRes.count ?? 0,
        stampsGiven: totalStamps,
        topCustomer: null,
      } as DashboardStats
    },
    enabled: !!business,
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity', business?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('visit_events')
        .select(`
          id,
          created_at,
          stamps_added,
          loyalty_cards!inner (
            profiles!inner (display_name)
          )
        `)
        .eq('business_id', business!.id)
        .order('created_at', { ascending: false })
        .limit(10)

      return (data ?? []).map((e: {
        id: string;
        created_at: string;
        stamps_added: number;
        loyalty_cards: { profiles: { display_name: string | null } };
      }) => ({
        id: e.id,
        created_at: e.created_at,
        stamps_added: e.stamps_added,
        customer_name: e.loyalty_cards?.profiles?.display_name ?? 'Someone',
      })) as RecentActivity[]
    },
    enabled: !!business,
  })

  if (!business) {
    return (
      <View style={styles.noBusinessContainer}>
        <Text style={styles.noBusinessTitle}>Set up your store</Text>
        <Text style={styles.noBusinessText}>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey 👋</Text>
        <Text style={styles.businessName}>{business.name}</Text>
      </View>

      {/* Stats grid */}
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label="Total customers" value={stats?.totalCustomers ?? 0} />
          <StatCard label="Visits this week" value={stats?.visitsThisWeek ?? 0} />
          <StatCard label="Stamps given" value={stats?.stampsGiven ?? 0} />
        </View>
      )}

      {/* Quick action */}
      <TouchableOpacity
        style={styles.offerButton}
        onPress={() => router.push('/(vendor)/offers/compose')}
      >
        <Text style={styles.offerButtonText}>Send an Offer 💌</Text>
      </TouchableOpacity>

      {/* Recent activity */}
      <Text style={styles.sectionTitle}>Recent activity</Text>
      {recentActivity?.length ? (
        recentActivity.map((event) => (
          <View key={event.id} style={styles.activityRow}>
            <View style={styles.activityDot} />
            <Text style={styles.activityText}>
              <Text style={{ fontWeight: '700' }}>{event.customer_name}</Text>
              {' '}earned {event.stamps_added} stamp{event.stamps_added !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.activityTime}>{formatRelativeTime(event.created_at)}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.noActivity}>No activity yet. Share your QR code to get started!</Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 48,
  },
  noBusinessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    padding: 40,
  },
  noBusinessTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  noBusinessText: {
    fontSize: 15,
    color: Colors.taupe,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  setupButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  setupButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    marginBottom: 28,
  },
  greeting: {
    fontSize: 16,
    color: Colors.taupe,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.taupe,
    lineHeight: 16,
  },
  offerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  offerButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: Colors.cream,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.taupe,
  },
  noActivity: {
    fontSize: 14,
    color: Colors.taupe,
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 20,
  },
})
