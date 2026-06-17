import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

function Dot({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.dot, focused && styles.dotActive]} />
  )
}

export default function VendorLayout() {
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
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <Dot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'My QR',
          tabBarIcon: ({ focused }) => <Dot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ focused }) => <Dot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="offers/index"
        options={{
          title: 'Offers',
          tabBarIcon: ({ focused }) => <Dot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <Dot focused={focused} />,
        }}
      />
      <Tabs.Screen name="offers/compose" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.primaryDark,
    borderTopWidth: 0,
    height: 84,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.taupe,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
})
