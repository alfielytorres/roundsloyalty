import { useState, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'

type Mode = 'scan' | 'manual'
type State = 'idle' | 'processing' | 'success' | 'error'

interface StampResult {
  stamps_collected: number
  total_visits: number
}

export default function StampCustomer() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const scannedRef = useRef(false)
  const [permission, requestPermission] = useCameraPermissions()
  const [mode, setMode] = useState<Mode>('scan')
  const [state, setState] = useState<State>('idle')
  const [manualToken, setManualToken] = useState('')
  const [result, setResult] = useState<StampResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const { data: vendor } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('id, business_name').eq('owner_id', user!.id).maybeSingle()
      return data
    },
    enabled: !!user,
  })

  async function stamp(token: string) {
    setState('processing')
    try {
      const { data, error } = await supabase.rpc('add_stamp', {
        p_membership_token: token.trim(),
        p_staff_user_id: user!.id,
      })
      if (error) throw new Error(error.message)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setResult(data as StampResult)
      setState('success')
      queryClient.invalidateQueries({ queryKey: ['vendor-recent'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-stats'] })
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const msg = err instanceof Error ? err.message : 'Failed to stamp. Try again.'
      setErrorMsg(msg)
      setState('error')
    }
  }

  function handleBarcodeScan({ data }: { data: string }) {
    if (scannedRef.current || state !== 'idle') return
    scannedRef.current = true
    stamp(data)
  }

  function reset() {
    setState('idle')
    setResult(null)
    setErrorMsg('')
    setManualToken('')
    scannedRef.current = false
  }

  if (!vendor) return <View style={styles.center}><Text style={styles.noVendorText}>Set up your store in Settings first.</Text></View>

  if (state === 'success' && result) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Stamped!</Text>
        <Text style={styles.successSub}>{result.stamps_collected} stamps · {result.total_visits} visits</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={reset}><Text style={styles.doneBtnText}>Stamp another</Text></TouchableOpacity>
      </View>
    )
  }

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMsg}>{errorMsg}</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={reset}><Text style={styles.doneBtnText}>Try again</Text></TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.header}>Stamp Customer</Text>
      <Text style={styles.subtitle}>{vendor.business_name}</Text>
      <View style={styles.modeToggle}>
        <TouchableOpacity style={[styles.modePill, mode === 'scan' && styles.modePillActive]} onPress={() => setMode('scan')}>
          <Text style={[styles.modePillText, mode === 'scan' && styles.modePillTextActive]}>Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modePill, mode === 'manual' && styles.modePillActive]} onPress={() => setMode('manual')}>
          <Text style={[styles.modePillText, mode === 'manual' && styles.modePillTextActive]}>Enter token</Text>
        </TouchableOpacity>
      </View>
      {mode === 'scan' ? (
        permission?.granted ? (
          <View style={styles.cameraWrap}>
            {state === 'idle' && (
              <CameraView style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={handleBarcodeScan} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} />
            )}
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanHint}>Point camera at customer's QR</Text>
            </View>
            {state === 'processing' && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.processingText}>Processing…</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.permissionWrap}>
            <Text style={styles.permissionText}>Camera access is needed to scan QR codes.</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Allow Camera</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <View style={styles.manualWrap}>
          <Text style={styles.manualLabel}>Membership token</Text>
          <TextInput style={styles.manualInput} value={manualToken} onChangeText={setManualToken} placeholder="Paste or type token…" placeholderTextColor={Colors.textMuted} autoCapitalize="none" autoCorrect={false} />
          <TouchableOpacity style={[styles.stampBtn, (!manualToken.trim() || state === 'processing') && styles.stampBtnDisabled]} onPress={() => stamp(manualToken)} disabled={!manualToken.trim() || state === 'processing'}>
            {state === 'processing' ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.stampBtnText}>Give Stamp</Text>}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 40 },
  header: { fontSize: 28, fontWeight: '800', color: Colors.text, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: 20, marginBottom: 20 },
  modeToggle: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 24 },
  modePill: { flex: 1, paddingVertical: 10, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modePillText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  modePillTextActive: { color: Colors.white },
  cameraWrap: { flex: 1, marginHorizontal: 20, marginBottom: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: Colors.surface },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 220, height: 220, borderRadius: 20, borderWidth: 3, borderColor: Colors.primary, marginBottom: 32 },
  scanHint: { color: Colors.white, fontSize: 14, opacity: 0.8 },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', gap: 16 },
  processingText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  permissionWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  permissionText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  permissionBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
  permissionBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  manualWrap: { paddingHorizontal: 20, flex: 1 },
  manualLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  manualInput: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text, marginBottom: 16 },
  stampBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  stampBtnDisabled: { opacity: 0.5 },
  stampBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 40 },
  successEmoji: { fontSize: 72, marginBottom: 20 },
  successTitle: { fontSize: 36, fontWeight: '900', color: Colors.text, marginBottom: 8 },
  successSub: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 48 },
  doneBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  errorEmoji: { fontSize: 56, marginBottom: 16 },
  errorTitle: { fontSize: 24, fontWeight: '800', color: Colors.danger, marginBottom: 10 },
  errorMsg: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  noVendorText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
})
