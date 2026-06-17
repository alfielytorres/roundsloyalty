import { useState, useEffect } from 'react'
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { Colors } from '@/constants/colors'
import type { LoyaltyProgramType, StampProgramConfig, PointsProgramConfig } from '@regulars/types'

export default function VendorSettings() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [programType, setProgramType] = useState<LoyaltyProgramType>('stamp')
  const [stampsRequired, setStampsRequired] = useState('10')
  const [reward, setReward] = useState('')
  const [pointsPerVisit, setPointsPerVisit] = useState('10')

  const { data: business, isLoading } = useQuery({
    queryKey: ['vendor-business', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user!.id)
        .maybeSingle()
      return data
    },
    enabled: !!user,
  })

  const { data: program } = useQuery({
    queryKey: ['vendor-program', business?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('business_id', business!.id)
        .eq('is_active', true)
        .maybeSingle()
      return data
    },
    enabled: !!business,
  })

  // Populate form from fetched data
  useEffect(() => {
    if (business) {
      setBusinessName(business.name ?? '')
      setDescription(business.description ?? '')
      setAddress(business.address ?? '')
    }
  }, [business])

  useEffect(() => {
    if (program) {
      setProgramType(program.type)
      const cfg = program.config as StampProgramConfig | PointsProgramConfig
      if (cfg.type === 'stamp') {
        setStampsRequired(String(cfg.stamps_required))
        setReward(cfg.reward)
      } else if (cfg.type === 'points') {
        setPointsPerVisit(String(cfg.points_per_visit))
      }
    }
  }, [program])

  const save = useMutation({
    mutationFn: async () => {
      if (!businessName.trim()) throw new Error('Business name is required.')

      let bizId = business?.id

      if (!bizId) {
        const { data: newBiz, error: bizError } = await supabase
          .from('businesses')
          .insert({
            owner_id: user!.id,
            name: businessName.trim(),
            description: description.trim() || null,
            address: address.trim() || null,
          })
          .select()
          .single()

        if (bizError || !newBiz) throw bizError ?? new Error('Failed to create business')
        bizId = newBiz.id
      } else {
        await supabase
          .from('businesses')
          .update({
            name: businessName.trim(),
            description: description.trim() || null,
            address: address.trim() || null,
          })
          .eq('id', bizId)
      }

      // Upsert loyalty program
      const config: StampProgramConfig | PointsProgramConfig =
        programType === 'stamp'
          ? { type: 'stamp', stamps_required: parseInt(stampsRequired, 10) || 10, reward: reward.trim() }
          : { type: 'points', points_per_visit: parseInt(pointsPerVisit, 10) || 10, rewards: [] }

      if (program) {
        await supabase
          .from('loyalty_programs')
          .update({ type: programType, config, reward_description: reward.trim() || null })
          .eq('id', program.id)
      } else {
        await supabase
          .from('loyalty_programs')
          .insert({
            business_id: bizId,
            type: programType,
            config,
            reward_description: reward.trim() || null,
          })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-business'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-program'] })
      Alert.alert('Saved!', 'Your store settings have been updated.')
    },
    onError: (err: Error) => {
      Alert.alert('Save failed', err.message)
    },
  })

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>Settings</Text>

      {/* Store profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Store profile</Text>

        <Text style={styles.label}>Business name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Sunrise Coffee"
          placeholderTextColor={Colors.taupe}
          value={businessName}
          onChangeText={setBusinessName}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell customers about your store..."
          placeholderTextColor={Colors.taupe}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="123 Main St, Sydney NSW"
          placeholderTextColor={Colors.taupe}
          value={address}
          onChangeText={setAddress}
        />
      </View>

      {/* Loyalty program */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loyalty program</Text>

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {(['stamp', 'points', 'tiered'] as LoyaltyProgramType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typePill, programType === type && styles.typePillActive]}
              onPress={() => setProgramType(type)}
            >
              <Text style={[styles.typePillText, programType === type && styles.typePillTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {programType === 'stamp' && (
          <>
            <Text style={styles.label}>Stamps to earn reward</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={stampsRequired}
              onChangeText={setStampsRequired}
              maxLength={3}
            />
            <Text style={styles.label}>Reward description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Free coffee"
              placeholderTextColor={Colors.taupe}
              value={reward}
              onChangeText={setReward}
            />
          </>
        )}

        {programType === 'points' && (
          <>
            <Text style={styles.label}>Points per visit</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={pointsPerVisit}
              onChangeText={setPointsPerVisit}
              maxLength={5}
            />
          </>
        )}

        {programType === 'tiered' && (
          <Text style={styles.tierNote}>
            Tier configuration available on the web portal for more detailed setup.
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, save.isPending && styles.saveButtonDisabled]}
        onPress={() => save.mutate()}
        disabled={save.isPending}
      >
        {save.isPending ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>Save changes</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 48,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 28,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.taupe,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typePillActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(125,181,66,0.15)',
  },
  typePillText: {
    fontSize: 14,
    color: Colors.taupe,
    fontWeight: '600',
  },
  typePillTextActive: {
    color: Colors.primary,
  },
  tierNote: {
    fontSize: 13,
    color: Colors.taupe,
    marginTop: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  signOutButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  signOutText: {
    color: Colors.taupe,
    fontSize: 15,
    fontWeight: '600',
  },
})
