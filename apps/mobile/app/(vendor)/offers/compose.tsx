import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'
import type { OfferSegment } from '@regulars/types'

const SEGMENTS: { key: OfferSegment; label: string; desc: string }[] = [
  { key: 'all', label: 'All customers', desc: 'Everyone with a card' },
  { key: 'returning', label: 'Returning', desc: 'Visited in last 30 days' },
  { key: 'at_risk', label: 'At risk', desc: 'No visit in 30+ days' },
  { key: 'top', label: 'Top customers', desc: 'Most loyal regulars' },
]

export default function ComposeOffer() {
  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [segment, setSegment] = useState<OfferSegment>('all')

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

  const sendOffer = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) {
        throw new Error('Please fill in the title and message.')
      }

      // Insert offer record
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .insert({
          business_id: business!.id,
          title: title.trim(),
          body: body.trim(),
          target_segment: segment,
        })
        .select()
        .single()

      if (offerError || !offer) throw offerError ?? new Error('Failed to create offer')

      // Trigger Edge Function to fan out push notifications
      const { error: fnError } = await supabase.functions.invoke('send-offer', {
        body: { offer_id: offer.id },
      })

      if (fnError) throw fnError

      return offer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-offers'] })
      Alert.alert('Offer sent!', 'Your message has been delivered to your customers.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (err: Error) => {
      Alert.alert('Failed to send', err.message)
    },
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Offer</Text>
        <TouchableOpacity
          style={[styles.sendButton, sendOffer.isPending && styles.sendButtonDisabled]}
          onPress={() => sendOffer.mutate()}
          disabled={sendOffer.isPending}
        >
          {sendOffer.isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Target audience</Text>
      <View style={styles.segmentGrid}>
        {SEGMENTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.segmentCard, segment === s.key && styles.segmentCardActive]}
            onPress={() => setSegment(s.key)}
          >
            <Text style={[styles.segmentLabel, segment === s.key && styles.segmentLabelActive]}>
              {s.label}
            </Text>
            <Text style={styles.segmentDesc}>{s.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Double stamps this weekend!"
        placeholderTextColor={Colors.taupe}
        value={title}
        onChangeText={setTitle}
        maxLength={80}
      />

      <Text style={styles.label}>Message</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Write your personalised message to customers..."
        placeholderTextColor={Colors.taupe}
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={5}
        maxLength={300}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{body.length}/300</Text>

      {/* Preview */}
      {(title || body) ? (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Preview</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{title || 'Your title'}</Text>
            <Text style={styles.previewBody}>{body || 'Your message...'}</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  cancelText: {
    color: Colors.taupe,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.taupe,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  segmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  segmentCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  segmentCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(125,181,66,0.15)',
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  segmentLabelActive: {
    color: Colors.primary,
  },
  segmentDesc: {
    fontSize: 12,
    color: Colors.taupe,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 20,
  },
  textArea: {
    minHeight: 120,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    color: Colors.taupe,
    textAlign: 'right',
    marginBottom: 28,
  },
  preview: {
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.taupe,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 6,
  },
  previewBody: {
    fontSize: 14,
    color: Colors.primaryDark,
    lineHeight: 20,
  },
})
