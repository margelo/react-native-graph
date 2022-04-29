import { Dimensions } from 'react-native'

export const SCREEN_WIDTH = Dimensions.get('window').width
export const GRAPH_DISPLAY_MODES = ['6h', '1d', '1w', '1m', '3m'] as const

export type GraphDisplayMode = typeof GRAPH_DISPLAY_MODES[number]
