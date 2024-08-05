import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, StyleSheet, LayoutChangeEvent } from 'react-native'
import Reanimated, {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  useDerivedValue,
  cancelAnimation,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated'
import { GestureDetector } from 'react-native-gesture-handler'

import {
  Canvas,
  SkPath,
  LinearGradient,
  Path,
  Skia,
  vec,
  Group,
  PathCommand,
  mix,
  Circle,
  Shadow,
} from '@shopify/react-native-skia'

import type { AnimatedLineGraphProps } from './LineGraphProps'
import { SelectionDot as DefaultSelectionDot } from './SelectionDot'
import {
  createGraphPath,
  createGraphPathWithGradient,
  getGraphPathRange,
  GraphPathRange,
  getXInRange,
  getPointsInRange,
} from './CreateGraphPath'
import { getSixDigitHex } from './utils/getSixDigitHex'
import { usePanGesture } from './hooks/usePanGesture'
import { getYForX } from './GetYForX'
import { hexToRgba } from './utils/hexToRgba'

const INDICATOR_RADIUS = 7
const INDICATOR_BORDER_MULTIPLIER = 1.3
const INDICATOR_PULSE_BLUR_RADIUS_SMALL =
  INDICATOR_RADIUS * INDICATOR_BORDER_MULTIPLIER
const INDICATOR_PULSE_BLUR_RADIUS_BIG =
  INDICATOR_RADIUS * INDICATOR_BORDER_MULTIPLIER + 20

export function AnimatedLineGraph({
  points: allPoints,
  color,
  gradientFillColors,
  lineThickness = 3,
  range,
  enableFadeInMask,
  enablePanGesture = false,
  onPointSelected,
  onGestureStart,
  onGestureEnd,
  panGestureDelay = 300,
  SelectionDot = DefaultSelectionDot,
  enableIndicator = false,
  indicatorPulsating = false,
  horizontalPadding = enableIndicator
    ? Math.ceil(INDICATOR_RADIUS * INDICATOR_BORDER_MULTIPLIER)
    : 0,
  verticalPadding = lineThickness,
  TopAxisLabel,
  BottomAxisLabel,
  ...props
}: AnimatedLineGraphProps): React.ReactElement {
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const interpolateProgress = useSharedValue(0)

  const { gesture, isActive, x } = usePanGesture({
    enabled: enablePanGesture,
    holdDuration: panGestureDelay,
  })
  const circleX = useSharedValue(0)
  const circleY = useSharedValue(0)
  const pathEnd = useSharedValue(0)
  const indicatorRadius = useSharedValue(enableIndicator ? INDICATOR_RADIUS : 0)
  const indicatorBorderRadius = useDerivedValue(
    () => indicatorRadius.value * INDICATOR_BORDER_MULTIPLIER
  )

  const pulseTrigger = useDerivedValue(() => (isActive.value ? 1 : 0))
  const indicatorPulseAnimation = useSharedValue(0)
  const indicatorPulseRadius = useDerivedValue(() => {
    if (pulseTrigger.value === 0) {
      return mix(
        indicatorPulseAnimation.value,
        INDICATOR_PULSE_BLUR_RADIUS_SMALL,
        INDICATOR_PULSE_BLUR_RADIUS_BIG
      )
    }
    return 0
  })
  const indicatorPulseOpacity = useDerivedValue(() => {
    if (pulseTrigger.value === 0) {
      return mix(indicatorPulseAnimation.value, 1, 0)
    }
    return 0
  })

  const positions = useDerivedValue(() => [
    0,
    Math.min(0.15, pathEnd.value),
    pathEnd.value,
    pathEnd.value,
    1,
  ])

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

  const paths = useSharedValue<{ from?: SkPath; to?: SkPath }>({})
  const gradientPaths = useSharedValue<{ from?: SkPath; to?: SkPath }>({})
  const commands = useSharedValue<PathCommand[]>([])
  const [commandsChanged, setCommandsChanged] = useState(0)
  const pointSelectedIndex = useRef<number>()

  const pathRange: GraphPathRange = useMemo(
    () => getGraphPathRange(allPoints, range),
    [allPoints, range]
  )

  const pointsInRange = useMemo(
    () => getPointsInRange(allPoints, pathRange),
    [allPoints, pathRange]
  )

  const drawingWidth = useMemo(
    () => width - 2 * horizontalPadding,
    [horizontalPadding, width]
  )

  const lineWidth = useMemo(() => {
    const lastPoint = pointsInRange[pointsInRange.length - 1]

    if (lastPoint == null) return drawingWidth

    return Math.max(getXInRange(drawingWidth, lastPoint.date, pathRange.x), 0)
  }, [drawingWidth, pathRange.x, pointsInRange])

  const indicatorX = useDerivedValue(
    () => Math.floor(lineWidth) + horizontalPadding
  )
  const indicatorY = useDerivedValue(
    () => getYForX(commands.value, indicatorX.value) || 0
  )

  const indicatorPulseColor = useMemo(() => hexToRgba(color, 0.4), [color])

  const shouldFillGradient = gradientFillColors != null

  useEffect(() => {
    if (height < 1 || width < 1) {
      // view is not yet measured!
      return
    }
    if (pointsInRange.length < 1) {
      // points are still empty!
      return
    }

    let path
    let gradientPath

    const createGraphPathProps = {
      pointsInRange,
      range: pathRange,
      horizontalPadding,
      verticalPadding,
      canvasHeight: height,
      canvasWidth: width,
    }

    if (shouldFillGradient) {
      const { path: pathNew, gradientPath: gradientPathNew } =
        createGraphPathWithGradient(createGraphPathProps)

      path = pathNew
      gradientPath = gradientPathNew
    } else {
      path = createGraphPath(createGraphPathProps)
    }

    commands.value = path.toCmds()

    if (gradientPath != null) {
      const previous = gradientPaths.value
      let from: SkPath = previous.to ?? straightLine
      if (previous.from != null && interpolateProgress.value < 1)
        from =
          from.interpolate(previous.from, interpolateProgress.value) ?? from

      if (gradientPath.isInterpolatable(from)) {
        gradientPaths.value = {
          from,
          to: gradientPath,
        }
      } else {
        gradientPaths.value = {
          from: gradientPath,
          to: gradientPath,
        }
      }
    }

    const previous = paths.value
    let from: SkPath = previous.to ?? straightLine
    if (previous.from != null && interpolateProgress.value < 1)
      from = from.interpolate(previous.from, interpolateProgress.value) ?? from

    if (path.isInterpolatable(from)) {
      paths.value = {
        from,
        to: path,
      }
    } else {
      paths.value = {
        from: path,
        to: path,
      }
    }

    setCommandsChanged(commandsChanged + 1)

    interpolateProgress.value = 0
    interpolateProgress.value = withSpring(1, {
      mass: 1,
      stiffness: 500,
      damping: 400,
      velocity: 0,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    height,
    horizontalPadding,
    interpolateProgress,
    pathRange,
    paths,
    shouldFillGradient,
    gradientPaths,
    pointsInRange,
    range,
    straightLine,
    verticalPadding,
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
    }
    return [
      color,
      color,
      color,
      `${getSixDigitHex(color)}33`,
      `${getSixDigitHex(color)}33`,
    ]
  }, [color, enableFadeInMask])

  const path = useDerivedValue(
    () => {
      const from = paths.value.from ?? straightLine
      const to = paths.value.to ?? straightLine

      return to.interpolate(from, interpolateProgress.value)
    },
    // RN Skia deals with deps differently. They are actually the required SkiaValues that the derived value listens to, not react values.
    [interpolateProgress]
  )

  const gradientPath = useDerivedValue(
    () => {
      const from = gradientPaths.value.from ?? straightLine
      const to = gradientPaths.value.to ?? straightLine

      return to.interpolate(from, interpolateProgress.value)
    },
    // RN Skia deals with deps differently. They are actually the required SkiaValues that the derived value listens to, not react values.
    [interpolateProgress]
  )

  const stopPulsating = useCallback(() => {
    cancelAnimation(indicatorPulseAnimation)
    indicatorPulseAnimation.value = 0
  }, [indicatorPulseAnimation])

  const startPulsating = useCallback(() => {
    indicatorPulseAnimation.value = withRepeat(
      withDelay(
        1000,
        withSequence(
          withTiming(1, { duration: 1100 }),
          withTiming(0, { duration: 0 }), // revert to 0
          withTiming(0, { duration: 1200 }), // delay between pulses
          withTiming(1, { duration: 1100 }),
          withTiming(1, { duration: 2000 }) // delay after both pulses
        )
      ),
      -1
    )
  }, [indicatorPulseAnimation])

  const setFingerPoint = useCallback(
    (fingerX: number) => {
      const fingerXInRange = Math.max(fingerX - horizontalPadding, 0)

      const index = Math.round(
        (fingerXInRange /
          getXInRange(
            drawingWidth,
            pointsInRange[pointsInRange.length - 1]!.date,
            pathRange.x
          )) *
          (pointsInRange.length - 1)
      )
      const pointIndex = Math.min(Math.max(index, 0), pointsInRange.length - 1)

      if (pointSelectedIndex.current !== pointIndex) {
        const dataPoint = pointsInRange[pointIndex]
        pointSelectedIndex.current = pointIndex

        if (dataPoint != null) {
          onPointSelected?.(dataPoint)
        }
      }
    },
    [
      drawingWidth,
      horizontalPadding,
      onPointSelected,
      pathRange.x,
      pointsInRange,
    ]
  )

  const setFingerX = useCallback(
    (fingerX: number) => {
      'worklet'

      const y = getYForX(commands.value, fingerX)

      if (y != null) {
        circleX.value = fingerX
        circleY.value = y
      }

      if (isActive.value) pathEnd.value = fingerX / width
    },
    // pathRange.x must be extra included in deps otherwise onPointSelected doesn't work, IDK why
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circleX, circleY, isActive, pathEnd, pathRange.x, width, commands]
  )

  const setIsActive = useCallback(
    (active: boolean) => {
      indicatorRadius.value = withSpring(!active ? INDICATOR_RADIUS : 0, {
        mass: 1,
        stiffness: 1000,
        damping: 50,
        velocity: 0,
      })

      if (active) {
        onGestureStart?.()
        stopPulsating()
      } else {
        onGestureEnd?.()
        pointSelectedIndex.current = undefined
        pathEnd.value = 1
        startPulsating()
      }
    },
    [
      indicatorRadius,
      onGestureEnd,
      onGestureStart,
      pathEnd,
      startPulsating,
      stopPulsating,
    ]
  )

  useAnimatedReaction(
    () => x.value,
    (fingerX) => {
      if (isActive.value || fingerX) {
        setFingerX(fingerX)
        runOnJS(setFingerPoint)(fingerX)
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

  useEffect(() => {
    if (pointsInRange.length !== 0 && commands.value.length !== 0)
      pathEnd.value = 1
  }, [commands, pathEnd, pointsInRange.length])

  useEffect(() => {
    if (indicatorPulsating) {
      startPulsating()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicatorPulsating])

  const axisLabelContainerStyle = {
    paddingTop: TopAxisLabel != null ? 20 : 0,
    paddingBottom: BottomAxisLabel != null ? 20 : 0,
  }

  const indicatorVisible = enableIndicator && commandsChanged > 0

  return (
    <View {...props}>
      <GestureDetector gesture={gesture}>
        <Reanimated.View style={[styles.container, axisLabelContainerStyle]}>
          {/* Top Label (max price) */}
          {TopAxisLabel != null && (
            <View style={styles.axisRow}>
              <TopAxisLabel />
            </View>
          )}

          {/* Actual Skia Graph */}
          <View style={styles.container} onLayout={onLayout}>
            {/* Fix for react-native-skia's incorrect type declarations */}
            <Canvas style={styles.svg}>
              <Group>
                <Path
                  // @ts-expect-error
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

                {shouldFillGradient && (
                  <Path
                    // @ts-expect-error
                    path={gradientPath}
                  >
                    <LinearGradient
                      start={vec(0, 0)}
                      end={vec(0, height)}
                      colors={gradientFillColors}
                    />
                  </Path>
                )}
              </Group>

              {SelectionDot != null && (
                <SelectionDot
                  isActive={isActive}
                  color={color}
                  lineThickness={lineThickness}
                  circleX={circleX}
                  circleY={circleY}
                />
              )}

              {indicatorVisible && (
                <Group>
                  {indicatorPulsating && (
                    <Circle
                      cx={indicatorX}
                      cy={indicatorY}
                      r={indicatorPulseRadius}
                      opacity={indicatorPulseOpacity}
                      color={indicatorPulseColor}
                      style="fill"
                    />
                  )}

                  <Circle
                    cx={indicatorX}
                    cy={indicatorY}
                    r={indicatorBorderRadius}
                    color="#ffffff"
                  >
                    <Shadow dx={2} dy={2} color="rgba(0,0,0,0.2)" blur={4} />
                  </Circle>
                  <Circle
                    cx={indicatorX}
                    cy={indicatorY}
                    r={indicatorRadius}
                    color={color}
                  />
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
        </Reanimated.View>
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
