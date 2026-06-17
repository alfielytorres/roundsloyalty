import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'
import type { LoyaltyCard, LoyaltyProgram, Business } from '@regulars/types'
import { getProgressLabel } from '@regulars/utils'

interface CardWithDetails {
  card: LoyaltyCard
  program: LoyaltyProgram
  business: Business
}

export default function MyCards() {
  const router = useRouter()
  const { user } = useAuthStore()

  const { data: cards, isLoading } = useQuery({
    queryKey: ['loyalty-cards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_cards')
        .select(`
          *,
          loyalty_programs (
            *,
            businesses (*)
          )
        `)
        .eq('customer_id', user!.id)
        .order('last_visit', { ascending: false, nullsFirst: false })

      if (error) throw error
      return data as Array<LoyaltyCard & { loyalty_programs: LoyaltyProgram & { businesses: Business } }>
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

  if (!cards?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>☕</Text>
        <Text style={styles.emptyTitle}>No loyalty cards yet</Text>
        <Text style={styles.emptyText}>
          Scan a store's QR code to start earning stamps and rewards.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Cards</Text>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const program = item.loyalty_programs
          const business = program.businesses
          const config = program.config as { stamps_required?: number }
          const stampsRequired = config?.stamps_required ?? 10

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(customer)/cards/${item.id}`)}
              activeOpacity={0.85}
            >
              {/* Business name & logo placeholder */}
              <View style={styles.cardHeader}>
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoInitial}>
                    {business.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.businessName}>{business.name}</Text>
                  <Text style={styles.progressLabel}>
                    {getProgressLabel(item, program)}
                  </Text>
                </View>
              </View>

              {/* Stamp grid */}
              {program.type === 'stamp' && (
                <View style={styles.stampGrid}>
                  {Array.from({ length: stampsRequired }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.stamp,
                        i < item.stamps_collected && styles.stampFilled,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Points bar */}
              {program.type !== 'stamp' && (
                <View style={styles.pointsRow}>
                  <Text style={styles.pointsValue}>{item.points_accumulated}</Text>
                  <Text style={styles.pointsLabel}> points accumulated</Text>
                </View>
              )}

              {program.reward_description && (
                <Text style={styles.reward}>🎁 {program.reward_description}</Text>
              )}
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
    gap: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  stampGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  stamp: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.stampEmpty,
    backgroundColor: 'transparent',
  },
  stampFilled: {
    backgroundColor: Colors.stampFilled,
    borderColor: Colors.stampFilled,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  pointsLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  reward: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
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
