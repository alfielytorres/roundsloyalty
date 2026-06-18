import { useRouter } from 'expo-router'
import { useEffect } from 'react'

export default function ComposeRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/(vendor)/offers') }, [router])
  return null
}
