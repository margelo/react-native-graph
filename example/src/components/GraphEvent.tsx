import React, { useEffect } from 'react'
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import {
  Circle,
  Group,
  TwoPointConicalGradient,
  vec,
} from '@shopify/react-native-skia'
import { EventComponentProps } from '../../../src/LineGraphProps'

const EVENT_SIZE = 6
const ACTIVE_EVENT_SIZE = 8
const ENTERING_ANIMATION_DURATION = 750

export function GraphEvent({
  isGraphActive,
  fingerX,
  eventX,
  eventY,
  color,
  index,
  onEventHover,
}: EventComponentProps) {
  const isEventActive = useDerivedValue(() => {
    // If the finger is on X position of the event.
    if (
      isGraphActive.value &&
      Math.abs(fingerX.value - eventX) < ACTIVE_EVENT_SIZE
    ) {
      if (onEventHover) runOnJS(onEventHover)(index, true)

      return true
    }

    if (onEventHover) runOnJS(onEventHover)(index, false)
    return false
  })

  const dotRadius = useDerivedValue(() =>
    withSpring(isEventActive.value ? ACTIVE_EVENT_SIZE : EVENT_SIZE)
  )
  const gradientEndRadius = useDerivedValue(() =>
    withSpring(dotRadius.value / 2)
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
      <Circle cx={eventX} cy={eventY} r={dotRadius} color={color}>
        <TwoPointConicalGradient
          start={vec(eventX, eventY)}
          startR={0}
          end={vec(eventX, eventY)}
          endR={gradientEndRadius}
          colors={['white', color]}
        />
      </Circle>
    </Group>
  )
}
