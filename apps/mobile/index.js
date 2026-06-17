// Suppress Reanimated 3.16 bridgeless flag error in Expo Go before runtime boots
const _originalConsoleError = console.error
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('disableEventLoopOnBridgeless')) return
  _originalConsoleError(...args)
}

import 'expo-router/entry'
