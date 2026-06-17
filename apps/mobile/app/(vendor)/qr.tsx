import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'
import { generateQRPayload, QR_REFRESH_INTERVAL_MS } from '@/lib/qr'

export default function VendorQR() {
  const { user } = useAuthStore()
  const [qrValue, setQrValue] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(QR_REFRESH_INTERVAL_MS / 1000))

  const { data: business, isLoading } = useQuery({
    queryKey: ['vendor-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, qr_code_secret')
        .eq('owner_id', user!.id)
        .single()
      return data
    },
    enabled: !!user,
  })

  const refreshQR = useCallback(async () => {
    if (!business) return
    const payload = await generateQRPayload(business.id, business.qr_code_secret)
    setQrValue(payload)
    setLastRefresh(Date.now())
    setSecondsLeft(Math.floor(QR_REFRESH_INTERVAL_MS / 1000))
  }, [business])

  // Auto-generate and rotate QR every 4 minutes
  useEffect(() => {
    if (!business) return
    refreshQR()
    const interval = setInterval(refreshQR, QR_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [business, refreshQR])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - lastRefresh
      const remaining = Math.max(0, Math.floor((QR_REFRESH_INTERVAL_MS - elapsed) / 1000))
      setSecondsLeft(remaining)
    }, 1000)
    return () => clearInterval(timer)
  }, [lastRefresh])

  if (isLoading || !business) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timeLabel = `${minutes}:${String(seconds).padStart(2, '0')}`

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Store QR Code</Text>
      <Text style={styles.subtitle}>
        Display this for customers to scan and earn stamps
      </Text>

      <View style={styles.qrCard}>
        <Text style={styles.businessName}>{business.name}</Text>

        {qrValue ? (
          <QRCode
            value={qrValue}
            size={220}
            color={Colors.primaryDark}
            backgroundColor={Colors.white}
          />
        ) : (
          <View style={styles.qrPlaceholder}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        )}

        <View style={styles.refreshRow}>
          <View style={styles.refreshDot} />
          <Text style={styles.refreshText}>Refreshes in {timeLabel}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={refreshQR}>
        <Text style={styles.refreshButtonText}>Refresh now</Text>
      </TouchableOpacity>

      <View style={styles.securityNote}>
        <Text style={styles.securityNoteText}>
          🔒 QR codes expire every 4 minutes to prevent screenshot fraud.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.taupe,
    textAlign: 'center',
    marginBottom: 40,
  },
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginBottom: 24,
    textAlign: 'center',
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  refreshDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  refreshText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  refreshButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  refreshButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  securityNote: {
    marginTop: 32,
    paddingHorizontal: 8,
  },
  securityNoteText: {
    fontSize: 13,
    color: Colors.taupe,
    textAlign: 'center',
    lineHeight: 18,
  },
})
