import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/colors'
import type { Business } from '@rounds/types'

const INITIAL_REGION = {
  latitude: -33.8688,
  longitude: 151.2093,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
}

export default function DiscoverMap() {
  const [selected, setSelected] = useState<Business | null>(null)

  const { data: businesses } = useQuery({
    queryKey: ['businesses-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, description, logo_url, address, lat, lng')
        .not('lat', 'is', null)
        .not('lng', 'is', null)

      if (error) throw error
      return data as Business[]
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
        {businesses?.map((biz) =>
          biz.lat && biz.lng ? (
            <Marker
              key={biz.id}
              coordinate={{ latitude: biz.lat, longitude: biz.lng }}
              onPress={() => setSelected(biz)}
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker}>
                  <Text style={styles.markerText}>
                    {biz.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{biz.name}</Text>
                  {biz.address && (
                    <Text style={styles.calloutAddress}>{biz.address}</Text>
                  )}
                </View>
              </Callout>
            </Marker>
          ) : null,
        )}
      </MapView>

      {/* Bottom sheet with business list */}
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>
          {businesses?.length ?? 0} stores near you
        </Text>
        <FlatList
          data={businesses}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sheetList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.sheetCard, selected?.id === item.id && styles.sheetCardSelected]}
              onPress={() => setSelected(item)}
            >
              <View style={styles.sheetLogo}>
                <Text style={styles.sheetLogoText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.sheetName} numberOfLines={1}>{item.name}</Text>
              {item.address && (
                <Text style={styles.sheetAddress} numberOfLines={1}>{item.address}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  callout: {
    padding: 8,
    minWidth: 120,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  calloutAddress: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.taupe,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryDark,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sheetList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sheetCard: {
    width: 140,
    backgroundColor: Colors.cream,
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sheetCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  sheetLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetLogoText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  sheetName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  sheetAddress: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
})
