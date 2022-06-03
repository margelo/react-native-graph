import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, StyleSheet, LayoutChangeEvent } from 'react-native'
import {
  Canvas,
  runSpring,
  SkPath,
  LinearGradient,
  Path,
  Skia,
  useValue,
  useDerivedValue,
  vec,
  Circle,
  Group,
  Shadow,
  PathCommand,
} from '@shopify/react-native-skia'
import type { AnimatedLineGraphProps } from './LineGraphProps'
import { createGraphPath } from './CreateGraphPath'
import Reanimated, {
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated'
import { getSixDigitHex } from './utils/getSixDigitHex'
import { GestureDetector } from 'react-native-gesture-handler'
import { useHoldOrPanGesture } from './hooks/useHoldOrPanGesture'
import { getYForX } from './GetYForX'

// weird rea type bug
const ReanimatedView = Reanimated.View as any

export function AnimatedLineGraph({
  points,
  color,
  lineThickness = 3,
  enableFadeInMask,
  enablePanGesture,
  onPointSelected,
  onGestureStart,
  onGestureEnd,
  TopAxisLabel,
  BottomAxisLabel,
  selectionDotShadowColor,
  ...props
}: AnimatedLineGraphProps): React.ReactElement {
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const interpolateProgress = useValue(0)
  const graphPadding = lineThickness

  const onLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
      setWidth(Math.round(layout.width))
      setHeight(Math.round(layout.height))
    },
    []
  )

  const straightLine = useMemo(() => {
    const path = Skia.Path.Make()
    path.moveTo(0, height / 2)
    for (let i = 0; i < width - 1; i += 2) {
      const x = i
      const y = height / 2
      path.cubicTo(x, y, x, y, x, y)
    }

    return path
  }, [height, width])

  const paths = useValue<{ from?: SkPath; to?: SkPath }>({})
  const commands = useRef<PathCommand[]>([])

  useEffect(() => {
    if (height < 1 || width < 1) {
      // view is not yet measured!
      return
    }
    if (points.length < 1) {
      // points are still empty!
      return
    }

    const path = createGraphPath({
      points: points,
      graphPadding: graphPadding,
      canvasHeight: height,
      canvasWidth: width,
    })

    const previous = paths.current
    let from: SkPath = previous.to ?? straightLine
    if (previous.from != null && interpolateProgress.current < 1)
      from = from.interpolate(previous.from, interpolateProgress.current)

    if (path.isInterpolatable(from)) {
      paths.current = {
        from: from,
        to: path,
      }
    } else {
      paths.current = {
        from: path,
        to: path,
      }
    }
    commands.current = path.toCmds()

    runSpring(
      interpolateProgress,
      { from: 0, to: 1 },
      {
        mass: 1,
        stiffness: 500,
        damping: 400,
        velocity: 0,
      }
    )
  }, [
    graphPadding,
    height,
    interpolateProgress,
    paths,
    points,
    straightLine,
    width,
  ])

  const gradientColors = useMemo(() => {
    if (enableFadeInMask) {
      return [
        `${getSixDigitHex(color)}00`,
        `${getSixDigitHex(color)}ff`,
        `${getSixDigitHex(color)}ff`,
        `${getSixDigitHex(color)}33`,
        `${getSixDigitHex(color)}33`,
      ]
    } else {
      return [
        color,
        color,
        color,
        `${getSixDigitHex(color)}33`,
        `${getSixDigitHex(color)}33`,
      ]
    }
  }, [color, enableFadeInMask])

  const path = useDerivedValue(
    () => {
      const from = paths.current.from ?? straightLine
      const to = paths.current.to ?? straightLine

      return to.interpolate(from, interpolateProgress.current)
    },
    // RN Skia deals with deps differently. They are actually the required SkiaValues that the derived value listens to, not react values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interpolateProgress]
  )

  const { gesture, isActive, x } = useHoldOrPanGesture({ holdDuration: 300 })
  const circleX = useValue(0)
  const circleY = useValue(0)
  const pathEnd = useValue(0)
  const circleRadius = useValue(0)
  const circleStrokeRadius = useDerivedValue(
    () => circleRadius.current * 6,
    [circleRadius]
  )

  const setFingerX = useCallback(
    (fingerX: number) => {
      const y = getYForX(commands.current, fingerX)

      if (y != null) {
        circleY.current = y
        circleX.current = fingerX
      }
      pathEnd.current = fingerX / width

      const index = Math.round((fingerX / width) * points.length)
      const pointIndex = Math.min(Math.max(index, 0), points.length - 1)
      const dataPoint = points[Math.round(pointIndex)]
      if (dataPoint != null) onPointSelected?.(dataPoint)
    },
    [circleX, circleY, onPointSelected, pathEnd, points, width]
  )
  const setIsActive = useCallback(
    (active: boolean) => {
      runSpring(circleRadius, active ? 5 : 0, {
        mass: 1,
        stiffness: 1000,
        damping: 50,
        velocity: 0,
      })
      if (!active) pathEnd.current = 1

      if (active) onGestureStart?.()
      else onGestureEnd?.()
    },
    [circleRadius, onGestureEnd, onGestureStart, pathEnd]
  )
  useAnimatedReaction(
    () => x.value,
    (fingerX) => {
      if (isActive.value) {
        runOnJS(setFingerX)(fingerX)
      }
    },
    [isActive, setFingerX, width, x]
  )
  useAnimatedReaction(
    () => isActive.value,
    (active) => {
      runOnJS(setIsActive)(active)
    },
    [isActive, setIsActive]
  )
  const positions = useDerivedValue(
    () => [
      0,
      Math.min(0.15, pathEnd.current),
      pathEnd.current,
      pathEnd.current,
      1,
    ],
    [pathEnd]
  )

  return (
    <View {...props}>
      <GestureDetector gesture={enablePanGesture ? gesture : undefined}>
        <ReanimatedView style={styles.container}>
          {/* Top Label (max price) */}
          {TopAxisLabel != null && (
            <View style={styles.axisRow}>
              <TopAxisLabel />
            </View>
          )}

          {/* Actual Skia Graph */}
          <View style={styles.container} onLayout={onLayout}>
            <Canvas style={styles.svg}>
              <Group>
                <Path
                  path={path}
                  strokeWidth={lineThickness}
                  style="stroke"
                  strokeJoin="round"
                  strokeCap="round"
                >
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(width, 0)}
                    colors={gradientColors}
                    positions={positions}
                  />
                </Path>
              </Group>

              {enablePanGesture && (
                <Group>
                  <Circle
                    opacity={0.05}
                    cx={circleX}
                    cy={circleY}
                    r={circleStrokeRadius}
                    color={selectionDotShadowColor}
                  />
                  <Circle
                    cx={circleX}
                    cy={circleY}
                    r={circleRadius}
                    color={color}
                  >
                    <Shadow dx={0} dy={0} color="rgba(0,0,0,0.5)" blur={4} />
                  </Circle>
                </Group>
              )}
            </Canvas>
          </View>

          {/* Bottom Label (min price) */}
          {BottomAxisLabel != null && (
            <View style={styles.axisRow}>
              <BottomAxisLabel />
            </View>
          )}
        </ReanimatedView>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  svg: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  axisRow: {
    height: 17,
  },
})
