export function getSixDigitHex(color: string): `#${string}` {
  if (!color.startsWith('#'))
    throw new Error(`react-native-graph: "${color}" is not a valid hex color!`)
  const hexColor = color.substring(1) // removes '#'

  switch (hexColor.length) {
    case 3: {
      const sixDigitHex = hexColor
        .split('')
        .map((hex) => hex + hex)
        .join('')
      return `#${sixDigitHex}`
    }
    case 6:
      return `#${hexColor}`
    case 8:
      return `#${hexColor.substring(0, 6)}`
    default:
      throw new Error(
        `react-native-graph: Cannot convert "${color}" to a six-digit hex color!`
      )
  }
}
