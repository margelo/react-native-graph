import type React from 'react'
import type { ViewProps } from 'react-native'

export interface GraphPoint {
  value: number
  date: Date
}

interface BaseLineGraphProps extends ViewProps {
  /**
   * All points to be marked in the graph. Coordinate system will adjust to scale automatically.
   */
  points: GraphPoint[]
  /**
   * Color of the graph line (path)
   */
  color: string
  /**
   * The width of the graph line (path)
   *
   * @default 3
   */
  lineThickness?: number
  /**
   * Enable the Fade-In Gradient Effect at the beginning of the Graph
   */
  enableFadeInMask?: boolean
}

export type StaticLineGraphProps = BaseLineGraphProps & {
  /* any static-only line graph props? */
}
export type AnimatedLineGraphProps = BaseLineGraphProps & {
  /**
   * Whether to enable Graph scrubbing/pan gesture.
   */
  enablePanGesture?: boolean

  /**
   * The color of the selection dot when the user is panning the graph.
   */
  selectionDotShadowColor?: string

  /**
   * Called for each point while the user is scrubbing/panning through the graph
   */
  onPointSelected?: (point: GraphPoint) => void
  /**
   * Called once the user starts scrubbing/panning through the graph
   */
  onGestureStart?: () => void
  /**
   * Called once the user stopped scrubbing/panning through the graph
   */
  onGestureEnd?: () => void

  /**
   * The element that gets rendered above the Graph (usually the "max" point/value of the Graph)
   */
  TopAxisLabel?: () => React.ReactElement | null
  /**
   * The element that gets rendered below the Graph (usually the "min" point/value of the Graph)
   */
  BottomAxisLabel?: () => React.ReactElement | null
}

export type LineGraphProps =
  | ({ animated: true } & AnimatedLineGraphProps)
  | ({ animated: false } & StaticLineGraphProps)
