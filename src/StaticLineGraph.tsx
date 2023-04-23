import { Canvas, LinearGradient, Path, vec } from '@shopify/react-native-skia'
import { getSixDigitHex } from './utils/getSixDigitHex'
import React, { useCallback, useMemo, useState } from 'react'
import { View, StyleSheet, LayoutChangeEvent } from 'react-native'
import {
  createGraphPath,
  getGraphPathRange,
  getPointsInRange,
  GraphPathRange,
} from './CreateGraphPath'
import type { StaticLineGraphProps } from './LineGraphProps'

export function StaticLineGraph({
  points: allPoints,
  range,
  color,
  lineThickness = 3,
  enableFadeInMask,
  style,
  ...props
}: StaticLineGraphProps): React.ReactElement {
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  const onLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
      setWidth(Math.round(layout.width))
      setHeight(Math.round(layout.height))
    },
    []
  )

  const pathRange: GraphPathRange = useMemo(
    () => getGraphPathRange(allPoints, range),
    [allPoints, range]
  )

  const pointsInRange = useMemo(
    () => getPointsInRange(allPoints, pathRange),
    [allPoints, pathRange]
  )

  const path = useMemo(
    () =>
      createGraphPath({
        pointsInRange: pointsInRange,
        range: pathRange,
        canvasHeight: height,
        canvasWidth: width,
        horizontalPadding: lineThickness,
        verticalPadding: lineThickness,
      }),
    [height, lineThickness, pathRange, pointsInRange, width]
  )

  const gradientColors = useMemo(
    () => [`${getSixDigitHex(color)}00`, `${getSixDigitHex(color)}ff`],
    [color]
  )
  const gradientFrom = useMemo(() => vec(0, 0), [])
  const gradientTo = useMemo(() => vec(width * 0.15, 0), [width])

  return (
    <View {...props} style={style} onLayout={onLayout}>
      {/* Fix for react-native-skia's incorrect type declarations */}
      <Canvas style={styles.svg}>
        <Path
          path={path}
          strokeWidth={lineThickness}
          color={enableFadeInMask ? undefined : color}
          style="stroke"
          strokeJoin="round"
          strokeCap="round"
        >
          {enableFadeInMask && (
            <LinearGradient
              start={gradientFrom}
              end={gradientTo}
              colors={gradientColors}
            />
          )}
        </Path>
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  svg: {
    flex: 1,
  },
})
