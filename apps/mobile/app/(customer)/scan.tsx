import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'requires_consent' | 'error'

interface ScanResult {
  card: { stamps_collected: number }
  stamps_added: number
  reward_unlocked: boolean
  business: { id: string; name: string; logo_url: string | null }
}

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [consentBusiness, setConsentBusiness] = useState<{ id: string; name: string } | null>(null)
  const [lastQrPayload, setLastQrPayload] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { session } = useAuthStore()
  const scannedRef = useRef(false)

  useEffect(() => {
    if (scanState === 'idle') {
      scannedRef.current = false
    }
  }, [scanState])

  async function handleBarcodeScan({ data }: { data: string }) {
    if (scannedRef.current || scanState !== 'idle') return
    scannedRef.current = true
    setScanState('processing')

    try {
      const { data: res, error } = await supabase.functions.invoke('stamp-card', {
        body: { qr_payload: data },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (error) throw error

      if (res.requires_consent) {
        setConsentBusiness(res.business)
        setLastQrPayload(data)
        setScanState('requires_consent')
        return
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setResult(res)
      setScanState('success')
      queryClient.invalidateQueries({ queryKey: ['loyalty-cards'] })
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const message = err instanceof Error ? err.message : 'Failed to scan. Try again.'
      Alert.alert('Scan failed', message, [
        { text: 'OK', onPress: () => setScanState('idle') },
      ])
      setScanState('error')
    }
  }

  async function handleConsent(businessId: string, agree: boolean) {
    if (agree) {
      await supabase.from('data_consents').insert({
        customer_id: session?.user.id,
        business_id: businessId,
      })

      if (lastQrPayload) {
        setScanState('processing')
        setConsentBusiness(null)
        const { data: res, error } = await supabase.functions.invoke('stamp-card', {
          body: { qr_payload: lastQrPayload },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        })
        if (!error && res) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          setResult(res)
          setScanState('success')
          queryClient.invalidateQueries({ queryKey: ['loyalty-cards'] })
        } else {
          setScanState('idle')
        }
      }
    } else {
      setScanState('idle')
      setConsentBusiness(null)
      setLastQrPayload(null)
    }
  }

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          We need camera access to scan loyalty QR codes.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {scanState === 'idle' || scanState === 'processing' ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={scanState === 'idle' ? handleBarcodeScan : undefined}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>Scan Store QR</Text>
            <View style={styles.scanFrame} />
            <Text style={styles.overlayHint}>
              Hold your camera over the store's QR code
            </Text>
          </View>
          {scanState === 'processing' && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
        </>
      ) : null}

      {/* Consent Modal */}
      <Modal visible={scanState === 'requires_consent'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🏪</Text>
            <Text style={styles.modalTitle}>Data Consent</Text>
            <Text style={styles.modalBody}>
              By earning stamps at{' '}
              <Text style={{ fontWeight: '700' }}>{consentBusiness?.name}</Text>,
              they will see your name and visit history.{'\n\n'}
              You can withdraw this at any time in your profile.
            </Text>
            <TouchableOpacity
              style={styles.consentButton}
              onPress={() => consentBusiness && handleConsent(consentBusiness.id, true)}
            >
              <Text style={styles.consentButtonText}>I agree — earn my stamp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => consentBusiness && handleConsent(consentBusiness.id, false)}
            >
              <Text style={styles.declineButtonText}>No thanks</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success overlay */}
      {scanState === 'success' && result && (
        <View style={styles.successOverlay}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>
            +{result.stamps_added} stamp{result.stamps_added !== 1 ? 's' : ''}!
          </Text>
          <Text style={styles.successBusiness}>{result.business.name}</Text>
          {result.reward_unlocked && (
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardBadgeText}>🎁 Reward unlocked!</Text>
            </View>
          )}
          <TouchableOpacity style={styles.doneButton} onPress={() => setScanState('idle')}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 40,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.primaryDark,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  permissionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 40,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
    marginBottom: 40,
  },
  overlayHint: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primaryDark,
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  consentButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  consentButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  declineButton: {
    paddingVertical: 12,
  },
  declineButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 8,
  },
  successBusiness: {
    fontSize: 18,
    color: Colors.primaryLight,
    marginBottom: 24,
  },
  rewardBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 24,
  },
  rewardBadgeText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  doneButton: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  doneButtonText: {
    color: Colors.primaryDark,
    fontSize: 16,
    fontWeight: '700',
  },
})
