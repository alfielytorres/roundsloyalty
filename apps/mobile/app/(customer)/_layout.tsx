import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

function TabIcon({ focused, symbol }: { focused: boolean; symbol: string }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <View style={[styles.icon, focused && styles.iconActive]}>
        <View style={[styles.dot, focused && styles.dotActive]} />
      </View>
    </View>
  )
}

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.taupe,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen name="cards/index" options={{ title: 'My Cards', tabBarIcon: ({ focused }) => <TabIcon focused={focused} symbol="card" /> }} />
      <Tabs.Screen name="scan" options={{ title: 'My QR', tabBarIcon: ({ focused }) => <TabIcon focused={focused} symbol="qr" /> }} />
      <Tabs.Screen name="map" options={{ title: 'Discover', tabBarIcon: ({ focused }) => <TabIcon focused={focused} symbol="map" /> }} />
      <Tabs.Screen name="offers" options={{ title: 'Activity', tabBarIcon: ({ focused }) => <TabIcon focused={focused} symbol="activity" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon focused={focused} symbol="profile" /> }} />
      <Tabs.Screen name="cards/[id]" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: Colors.background, borderTopColor: Colors.border, borderTopWidth: 1, height: 84, paddingBottom: 20, paddingTop: 8 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  iconWrap: { width: 40, height: 28, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: {},
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  iconActive: { backgroundColor: Colors.primaryLight },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textSecondary },
  dotActive: { backgroundColor: Colors.primary },
})
