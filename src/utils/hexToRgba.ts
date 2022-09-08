export function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  if (alpha > 0) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return `rgb(${r}, ${g}, ${b})`
}
