import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Modal } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

interface Membership {
  id: string
  membership_token: string
  status: string
  vendors: { business_name: string }
  loyalty_balances: Array<{ stamps_collected: number; total_visits: number }>
}

export default function MyQR() {
  const { user } = useAuthStore()
  const [selected, setSelected] = useState<Membership | null>(null)

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['memberships-qr', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_vendor_memberships')
        .select(`id, membership_token, status, vendors (business_name), loyalty_balances (stamps_collected, total_visits)`)
        .eq('customer_id', user!.id)
        .order('joined_at', { ascending: false })
      if (error) throw error
      return data as Membership[]
    },
    enabled: !!user,
  })

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>

  if (!memberships?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🎫</Text>
        <Text style={styles.emptyTitle}>No memberships yet</Text>
        <Text style={styles.emptyText}>Ask a participating store to add you, or use the Discover tab to find stores near you.</Text>
      </View>
    )
  }

  const activeMemberships = memberships.filter((m) => m.status === 'active')
  const pendingMemberships = memberships.filter((m) => m.status === 'pending')

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My QR</Text>
      <Text style={styles.subtitle}>Show this to staff to earn stamps</Text>
      <FlatList
        data={activeMemberships}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={pendingMemberships.length > 0 ? (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>Pending activation</Text>
            {pendingMemberships.map((m) => (
              <View key={m.id} style={styles.pendingCard}>
                <Text style={styles.pendingName}>{m.vendors.business_name}</Text>
                <Text style={styles.pendingHint}>Show your QR below to activate</Text>
                <View style={styles.pendingQRWrap}>
                  <QRCode value={m.membership_token} size={140} color={Colors.text} backgroundColor="transparent" />
                </View>
              </View>
            ))}
          </View>
        ) : null}
        ListEmptyComponent={pendingMemberships.length === 0 ? <View style={styles.emptyInner}><Text style={styles.emptyText}>No active memberships yet.</Text></View> : null}
        renderItem={({ item }) => {
          const balance = item.loyalty_balances?.[0]
          const stamps = balance?.stamps_collected ?? 0
          return (
            <TouchableOpacity style={styles.membershipCard} onPress={() => setSelected(item)} activeOpacity={0.85}>
              <View style={styles.membershipInfo}>
                <Text style={styles.membershipName}>{item.vendors.business_name}</Text>
                <Text style={styles.membershipMeta}>{stamps} stamp{stamps !== 1 ? 's' : ''} • tap to enlarge</Text>
              </View>
              <View style={styles.qrPreview}>
                <QRCode value={item.membership_token} size={52} color={Colors.white} backgroundColor="transparent" />
              </View>
            </TouchableOpacity>
          )
        }}
      />
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalBusiness}>{selected?.vendors.business_name}</Text>
            <Text style={styles.modalHint}>Staff will scan this</Text>
            <View style={styles.qrLarge}>
              {selected && <QRCode value={selected.membership_token} size={240} color="#000000" backgroundColor="#FFFFFF" />}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { fontSize: 28, fontWeight: '800', color: Colors.text, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: 20, marginBottom: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  pendingSection: { marginBottom: 24 },
  pendingCard: { backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)', alignItems: 'center', marginBottom: 12 },
  pendingName: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  pendingHint: { fontSize: 13, color: Colors.warning, marginBottom: 16 },
  pendingQRWrap: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16 },
  membershipCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  membershipInfo: { flex: 1 },
  membershipName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  membershipMeta: { fontSize: 13, color: Colors.textSecondary },
  qrPreview: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalCard: { backgroundColor: Colors.background, borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, width: '100%', maxWidth: 360 },
  modalBusiness: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  modalHint: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  qrLarge: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginBottom: 28 },
  closeBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 48 },
  closeBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 40 },
  emptyInner: { paddingVertical: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 10, textAlign: 'center' },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
})
