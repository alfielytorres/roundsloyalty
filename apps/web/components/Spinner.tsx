// Inline spinner that inherits the current text colour, so it reads correctly
// on both dark and light buttons.
export default function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full align-[-2px] ${className}`}
      style={{
        width: size,
        height: size,
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: 'currentColor',
        borderTopColor: 'transparent',
        opacity: 0.9,
      }}
    />
  )
}
