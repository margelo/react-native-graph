import { Canvas, LinearGradient, Path, vec } from '@shopify/react-native-skia'
import { getSixDigitHex } from './utils/getSixDigitHex'
import React, { useCallback, useMemo, useState } from 'react'
import { View, StyleSheet, LayoutChangeEvent } from 'react-native'
import { createGraphPath } from './CreateGraphPath'
import type { StaticLineGraphProps } from './LineGraphProps'

export function StaticLineGraph({
  points,
  color,
  lineThickness = 3,
  enableFadeInMask,
  style,
  ...props
}: StaticLineGraphProps): React.ReactElement {
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const graphPadding = lineThickness

  const onLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
      setWidth(Math.round(layout.width))
      setHeight(Math.round(layout.height))
    },
    []
  )

  const path = useMemo(
    () =>
      createGraphPath({
        points: points,
        canvasHeight: height,
        canvasWidth: width,
        graphPadding: graphPadding,
      }),
    [graphPadding, height, points, width]
  )

  const gradientColors = useMemo(
    () => [`${getSixDigitHex(color)}00`, `${getSixDigitHex(color)}ff`],
    [color]
  )
  const gradientFrom = useMemo(() => vec(0, 0), [])
  const gradientTo = useMemo(() => vec(width * 0.15, 0), [width])

  return (
    <View {...props} style={style} onLayout={onLayout}>
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
