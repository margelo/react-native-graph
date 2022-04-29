import { useColorScheme } from 'react-native'

interface Palette {
  background: string
  foreground: string
}

const dark: Palette = {
  background: '#333',
  foreground: '#eee',
}
const light: Palette = {
  background: '#fff',
  foreground: '#333',
}

export function useColors(): Palette {
  const isDarkMode = useColorScheme() === 'dark'

  return isDarkMode ? dark : light
}
