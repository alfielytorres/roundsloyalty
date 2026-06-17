// Patch console.error before any modules load so Reanimated's
// 'disableEventLoopOnBridgeless' warning never reaches the screen.
// Must use require (not import) — ESM imports are hoisted and would run first.
const originalError = console.error
console.error = function (...args) {
  if (typeof args[0] === 'string' && args[0].includes('disableEventLoopOnBridgeless')) return
  return originalError.apply(this, args)
}

require('expo-router/entry')
