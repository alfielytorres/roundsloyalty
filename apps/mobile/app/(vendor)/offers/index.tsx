import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'
import { formatRelativeTime } from '@regulars/utils'

export default function VendorOffers() {
  const { user } = useAuthStore()
  const router = useRouter()

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

  const { data: offers, isLoading } = useQuery({
    queryKey: ['vendor-offers', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          offer_recipients (count)
        `)
        .eq('business_id', business!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!business,
  })

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Offers</Text>
        <TouchableOpacity
          style={styles.composeButton}
          onPress={() => router.push('/(vendor)/offers/compose')}
        >
          <Text style={styles.composeButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💌</Text>
              <Text style={styles.emptyTitle}>No offers sent yet</Text>
              <Text style={styles.emptyText}>
                Send personalised messages to bring customers back.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const recipientCount = (item.offer_recipients as { count: number }[] | undefined)?.[0]?.count ?? 0
            return (
              <View style={styles.offerCard}>
                <View style={styles.offerCardHeader}>
                  <View style={styles.segmentBadge}>
                    <Text style={styles.segmentBadgeText}>{item.target_segment}</Text>
                  </View>
                  {item.sent_at && (
                    <Text style={styles.sentTime}>{formatRelativeTime(item.sent_at)}</Text>
                  )}
                </View>
                <Text style={styles.offerTitle}>{item.title}</Text>
                <Text style={styles.offerBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.recipientCount}>
                  Sent to {recipientCount} customer{recipientCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
  },
  composeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  composeButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  offerCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
  },
  offerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  segmentBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  segmentBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sentTime: {
    fontSize: 12,
    color: Colors.taupe,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 6,
  },
  offerBody: {
    fontSize: 14,
    color: Colors.taupe,
    lineHeight: 20,
    marginBottom: 10,
  },
  recipientCount: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.taupe,
    textAlign: 'center',
    lineHeight: 20,
  },
})
