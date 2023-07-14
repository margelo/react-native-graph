import React, { useEffect } from 'react'
import {
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { Circle, Group } from '@shopify/react-native-skia'

import { EventComponentProps } from './LineGraphProps'

const EVENT_SIZE = 6
const ACTIVE_EVENT_SIZE = 8
const ENTERING_ANIMATION_DURATION = 750

export function DefaultGraphEvent({
  isGraphActive,
  fingerX,
  eventX,
  eventY,
  color,
}: EventComponentProps) {
  const isEventActive = useDerivedValue(
    () =>
      isGraphActive.value &&
      Math.abs(fingerX.value - eventX) < ACTIVE_EVENT_SIZE
  )

  const dotRadius = useDerivedValue(() =>
    withSpring(isEventActive.value ? ACTIVE_EVENT_SIZE : EVENT_SIZE)
  )

  const animatedOpacity = useSharedValue(0)

  useEffect(() => {
    // Entering opacity animation triggered on the first render.
    animatedOpacity.value = withTiming(1, {
      duration: ENTERING_ANIMATION_DURATION,
    })
  }, [animatedOpacity])

  return (
    <Group opacity={animatedOpacity}>
      <Circle cx={eventX} cy={eventY} r={dotRadius} color={color} />
    </Group>
  )
}
