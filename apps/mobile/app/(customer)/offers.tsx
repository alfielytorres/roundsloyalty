import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'
import { formatRelativeTime } from '@regulars/utils'

interface OfferWithDetails {
  id: string
  offer_id: string
  delivered_at: string | null
  opened_at: string | null
  offers: {
    id: string
    title: string
    body: string
    created_at: string
    businesses: {
      name: string
      logo_url: string | null
    }
  }
}

export default function Offers() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: offers, isLoading } = useQuery({
    queryKey: ['offers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_recipients')
        .select(`
          id,
          offer_id,
          delivered_at,
          opened_at,
          offers (
            id,
            title,
            body,
            created_at,
            businesses (name, logo_url)
          )
        `)
        .eq('customer_id', user!.id)
        .order('delivered_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      return data as OfferWithDetails[]
    },
    enabled: !!user,
  })

  const markOpened = useMutation({
    mutationFn: async (recipientId: string) => {
      await supabase
        .from('offer_recipients')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', recipientId)
        .is('opened_at', null)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['offers'] }),
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!offers?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>💌</Text>
        <Text style={styles.emptyTitle}>No offers yet</Text>
        <Text style={styles.emptyText}>
          When businesses send you personalised offers, they'll appear here.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Offers</Text>
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const offer = item.offers
          const isUnread = !item.opened_at
          const business = offer.businesses

          return (
            <TouchableOpacity
              style={[styles.offerCard, isUnread && styles.offerCardUnread]}
              onPress={() => {
                if (isUnread) markOpened.mutate(item.id)
              }}
              activeOpacity={0.85}
            >
              <View style={styles.offerHeader}>
                <View style={styles.offerLogo}>
                  <Text style={styles.offerLogoText}>
                    {business.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.businessName}>{business.name}</Text>
                  <Text style={styles.offerTime}>
                    {item.delivered_at ? formatRelativeTime(item.delivered_at) : ''}
                  </Text>
                </View>
                {isUnread && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.offerTitle}>{offer.title}</Text>
              <Text style={styles.offerBody} numberOfLines={3}>{offer.body}</Text>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  offerCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  offerCardUnread: {
    backgroundColor: Colors.primaryLight,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  offerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerLogoText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  businessName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 1,
  },
  offerTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 6,
  },
  offerBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})
