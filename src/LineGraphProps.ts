import type React from 'react'
import type { ViewProps } from 'react-native'
import type { GraphPathRange } from './CreateGraphPath'
import type { SharedValue } from 'react-native-reanimated'
import type { Color, SkiaMutableValue } from '@shopify/react-native-skia'

export interface GraphPoint {
  value: number
  date: Date
}

export type GraphRange = Partial<GraphPathRange>

export interface SelectionDotProps {
  isActive: SharedValue<boolean>
  color: BaseLineGraphProps['color']
  lineThickness: BaseLineGraphProps['lineThickness']
  circleX: SkiaMutableValue<number>
  circleY: SkiaMutableValue<number>
}

interface BaseLineGraphProps extends ViewProps {
  /**
   * All points to be marked in the graph. Coordinate system will adjust to scale automatically.
   */
  points: GraphPoint[]
  /**
   * Range of the graph's x and y-axis. The range must be greater
   * than the range given by the points.
   */
  range?: GraphRange
  /**
   * Color of the graph line (path)
   */
  color: string
  /**
   * (Optional) Colors for the fill gradient below the graph line
   */
  gradientFillColors?: Color[]
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
   * Horizontal padding applied to graph, so the pan gesture dot doesn't get cut off horizontally
   */
  horizontalPadding?: number
  /**
   * Vertical padding applied to graph, so the pan gesture dot doesn't get cut off vertically
   */
  verticalPadding?: number
  /**
   * Enables an indicator which is displayed at the end of the graph
   */
  enableIndicator?: boolean
  /**
   * Let's the indicator pulsate
   */
  indicatorPulsating?: boolean

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
   * The element that renders the selection dot
   */
  SelectionDot?: React.ComponentType<SelectionDotProps> | null

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
