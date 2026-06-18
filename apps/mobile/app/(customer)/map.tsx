import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

interface VendorLocation {
  id: string
  business_name: string
  description: string | null
  category: string | null
  lat: number | null
  lng: number | null
  address: string | null
}

const INITIAL_REGION = {
  latitude: -33.8688,
  longitude: 151.2093,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
}

export default function DiscoverMap() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<VendorLocation | null>(null)

  const { data: vendors } = useQuery({
    queryKey: ['vendors-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          description,
          category,
          store_locations (lat, lng, address)
        `)
        .eq('status', 'active')

      if (error) throw error

      return (data ?? []).flatMap((v) =>
        (v.store_locations ?? [])
          .filter((l: { lat: number | null; lng: number | null }) => l.lat && l.lng)
          .map((l: { lat: number; lng: number; address: string | null }) => ({
            id: v.id,
            business_name: v.business_name,
            description: v.description,
            category: v.category,
            lat: l.lat,
            lng: l.lng,
            address: l.address,
          }))
      ) as VendorLocation[]
    },
  })

  const join = useMutation({
    mutationFn: async (vendorId: string) => {
      const { data, error } = await supabase.rpc('join_vendor', { p_vendor_id: vendorId })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
      queryClient.invalidateQueries({ queryKey: ['memberships-qr'] })
    },
  })

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {vendors?.map((v) =>
          v.lat && v.lng ? (
            <Marker
              key={`${v.id}-${v.lat}`}
              coordinate={{ latitude: v.lat, longitude: v.lng }}
              onPress={() => setSelected(v)}
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker}>
                  <Text style={styles.markerText}>
                    {v.business_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{v.business_name}</Text>
                  {v.address && <Text style={styles.calloutAddress}>{v.address}</Text>}
                </View>
              </Callout>
            </Marker>
          ) : null,
        )}
      </MapView>

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>
          {vendors?.length ?? 0} stores near you
        </Text>
        <FlatList
          data={vendors}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sheetList}
          keyExtractor={(item) => `${item.id}-${item.lat}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.sheetCard, selected?.id === item.id && styles.sheetCardSelected]}
              onPress={() => setSelected(item)}
            >
              <View style={styles.sheetLogo}>
                <Text style={styles.sheetLogoText}>
                  {item.business_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.sheetName} numberOfLines={1}>{item.business_name}</Text>
              {item.address && (
                <Text style={styles.sheetAddress} numberOfLines={1}>{item.address}</Text>
              )}
              {user && (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => join.mutate(item.id)}
                  disabled={join.isPending}
                >
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  markerContainer: { alignItems: 'center' },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerText: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  callout: { padding: 8, minWidth: 120 },
  calloutName: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 2 },
  calloutAddress: { fontSize: 12, color: '#666' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, paddingHorizontal: 20, marginBottom: 12 },
  sheetList: { paddingHorizontal: 20, gap: 12 },
  sheetCard: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetCardSelected: { borderColor: Colors.primary },
  sheetLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetLogoText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  sheetName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  sheetAddress: { fontSize: 11, color: Colors.textSecondary, marginBottom: 8 },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  joinBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
})
