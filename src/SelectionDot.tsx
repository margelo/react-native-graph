import React, { useCallback } from 'react'
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated'
import {
  runSpring,
  useValue,
  useComputedValue,
  Circle,
  Group,
  Shadow,
} from '@shopify/react-native-skia'
import type { SelectionDotProps } from './LineGraphProps'

export const CIRCLE_RADIUS = 5
export const CIRCLE_RADIUS_MULTIPLIER = 6

export function SelectionDot({
  isActive,
  color,
  circleX,
  circleY,
}: SelectionDotProps): React.ReactElement {
  const circleRadius = useValue(0)
  const circleStrokeRadius = useComputedValue(
    () => circleRadius.current * CIRCLE_RADIUS_MULTIPLIER,
    [circleRadius]
  )

  const setIsActive = useCallback(
    (active: boolean) => {
      runSpring(circleRadius, active ? CIRCLE_RADIUS : 0, {
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

  return (
    <Group>
      <Circle
        opacity={0.05}
        cx={circleX}
        cy={circleY}
        r={circleStrokeRadius}
        color="#333333"
      />
      <Circle cx={circleX} cy={circleY} r={circleRadius} color={color}>
        <Shadow dx={0} dy={0} color="rgba(0,0,0,0.5)" blur={4} />
      </Circle>
    </Group>
  )
}
