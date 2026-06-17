import { useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'
import { formatRelativeTime } from '@regulars/utils'

type Segment = 'all' | 'returning' | 'at_risk' | 'top'

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'top', label: 'Top' },
  { key: 'returning', label: 'Returning' },
  { key: 'at_risk', label: 'At risk' },
]

export default function Customers() {
  const { user } = useAuthStore()
  const [segment, setSegment] = useState<Segment>('all')

  const { data: business } = useQuery({
    queryKey: ['vendor-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user!.id)
        .single()
      return data
    },
    enabled: !!user,
  })

  const { data: customers, isLoading } = useQuery({
    queryKey: ['vendor-customers', business?.id, segment],
    queryFn: async () => {
      let query = supabase
        .from('vendor_customer_segments')
        .select('*')
        .eq('business_id', business!.id)

      if (segment !== 'all') {
        query = query.eq('segment', segment)
      }

      const { data, error } = await query.order('total_visits', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!business,
  })

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Customers</Text>

      {/* Segment pills */}
      <View style={styles.segments}>
        {SEGMENTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.pill, segment === s.key && styles.pillActive]}
            onPress={() => setSegment(s.key)}
          >
            <Text style={[styles.pillText, segment === s.key && styles.pillTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.customer_id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No customers in this segment yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.customerRow}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerInitial}>
                  {(item.display_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{item.display_name ?? 'Anonymous'}</Text>
                <Text style={styles.customerMeta}>
                  {item.total_visits} visit{item.total_visits !== 1 ? 's' : ''} ·{' '}
                  {item.last_visit ? formatRelativeTime(item.last_visit) : 'never'}
                </Text>
              </View>
              <View style={[styles.segmentBadge, segmentBadgeStyle(item.segment)]}>
                <Text style={styles.segmentBadgeText}>{item.segment}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  )
}

function segmentBadgeStyle(seg: string) {
  switch (seg) {
    case 'top': return { backgroundColor: Colors.primary }
    case 'returning': return { backgroundColor: Colors.primaryLight }
    case 'at_risk': return { backgroundColor: '#FEE2E2' }
    default: return { backgroundColor: Colors.cream }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
  },
  segments: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: {
    backgroundColor: Colors.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.taupe,
  },
  pillTextActive: {
    color: Colors.white,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 2,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  customerMeta: {
    fontSize: 12,
    color: Colors.taupe,
  },
  segmentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
    textTransform: 'capitalize',
  },
  empty: {
    color: Colors.taupe,
    textAlign: 'center',
    paddingTop: 40,
    fontSize: 15,
  },
})
