import { useMemo } from 'react'
import { Gesture, SimultaneousGesture } from 'react-native-gesture-handler'
import Reanimated, {
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'

interface Config {
  holdDuration: number
}

interface Result {
  x: Reanimated.SharedValue<number>
  y: Reanimated.SharedValue<number>
  isActive: Reanimated.SharedValue<boolean>
  gesture: SimultaneousGesture
}

export function useHoldOrPanGesture({ holdDuration = 300 }: Config): Result {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const isHoldGestureActive = useSharedValue(false)
  const isPanGestureActive = useSharedValue(false)

  const holdGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(holdDuration)
        .onStart((event) => {
          x.value = event.x
          y.value = event.y
          isHoldGestureActive.value = true
        })
        .onFinalize(() => {
          isHoldGestureActive.value = false
        }),
    [holdDuration, isHoldGestureActive, x, y]
  )

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .manualActivation(true)
        .onChange((e) => {
          x.value = e.x
          y.value = e.y
        })
        .onTouchesMove((_, state) => {
          if (isHoldGestureActive.value) {
            // Hold gesture is active so we can also activate Pan
            state.activate()
          }
        })
        .onStart(() => {
          isPanGestureActive.value = true
        })
        .onEnd(() => {
          isPanGestureActive.value = false
        }),
    [isHoldGestureActive, isPanGestureActive, x, y]
  )

  const isActive = useDerivedValue(
    () => isHoldGestureActive.value || isPanGestureActive.value,
    [isHoldGestureActive, isPanGestureActive]
  )

  return useMemo(
    () => ({
      gesture: Gesture.Simultaneous(holdGesture, panGesture),
      isActive: isActive,
      x: x,
      y: y,
    }),
    [holdGesture, isActive, panGesture, x, y]
  )
}
