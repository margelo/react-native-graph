/**
 * An example for a custom SelectionDot component.
 *
 * Usage:
 *
 * ```jsx
 * <LineGraph
 *   points={priceHistory}
 *   animated={true}
 *   enablePanGesture={true}
 *   SelectionDot={CustomSelectionDot}
 * />
 * ```
 *
 * This example has removed the outer ring and light
 * shadow from the default one to make it more flat.
 */
import React, { useCallback } from 'react'
import {
  runOnJS,
  useAnimatedReaction,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated'
import { Circle } from '@shopify/react-native-skia'
import type { SelectionDotProps } from 'react-native-graph'

export function SelectionDot({
  isActive,
  color,
  circleX,
  circleY,
}: SelectionDotProps): React.ReactElement {
  const circleRadius = useSharedValue(0)

  const setIsActive = useCallback(
    (active: boolean) => {
      circleRadius.value = withSpring(active ? 5 : 0, {
        mass: 1,
        stiffness: 1000,
        damping: 50,
        velocity: 0,
      })
    },
    [circleRadius]
  )

  useAnimatedReaction(
    () => isActive.value,
    (active) => {
      runOnJS(setIsActive)(active)
    },
    [isActive, setIsActive]
  )

  return <Circle cx={circleX} cy={circleY} r={circleRadius} color={color} />
}
