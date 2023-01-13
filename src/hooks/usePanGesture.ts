import { useMemo } from 'react'
import { Gesture, PanGesture } from 'react-native-gesture-handler'
import Reanimated, { useSharedValue } from 'react-native-reanimated'

interface Config {
  enabled: boolean
  holdDuration: number
}

interface Result {
  x: Reanimated.SharedValue<number>
  y: Reanimated.SharedValue<number>
  isActive: Reanimated.SharedValue<boolean>
  gesture: PanGesture
}

export function usePanGesture({ enabled, holdDuration = 300 }: Config): Result {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const isPanGestureActive = useSharedValue(false)

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activateAfterLongPress(holdDuration)
        .onChange((e) => {
          x.value = e.x
          y.value = e.y
        })
        .onStart(() => {
          isPanGestureActive.value = true
        })
        .onEnd(() => {
          isPanGestureActive.value = false
        }),
    [enabled, holdDuration, isPanGestureActive, x, y]
  )

  return useMemo(
    () => ({
      gesture: panGesture,
      isActive: isPanGestureActive,
      x: x,
      y: y,
    }),
    [isPanGestureActive, panGesture, x, y]
  )
}
