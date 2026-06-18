import { Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/auth'
import { View, ActivityIndicator } from 'react-native'
import { Colors } from '@/constants/colors'

export default function Index() {
  const { session, profile, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />
  if (!profile) return <Redirect href="/(auth)/sign-in" />

  if (profile.role === 'vendor') return <Redirect href="/(vendor)/dashboard" />
  return <Redirect href="/(customer)/cards" />
}
