import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useAuthListener } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2 },
  },
})

function AuthGate() {
  const { session, profile, isLoading } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in')
    } else if (profile) {
      if (inAuthGroup || segments[0] === undefined) {
        if (profile.role === 'vendor') {
          router.replace('/(vendor)/dashboard')
        } else {
          router.replace('/(customer)/cards')
        }
      }
    }
  }, [session, profile, isLoading, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(vendor)" />
    </Stack>
  )
}

function RootLayout() {
  useAuthListener()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" backgroundColor="#EDE9DF" />
          <AuthGate />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default RootLayout
