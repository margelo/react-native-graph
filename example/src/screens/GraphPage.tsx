import React, { useCallback, useMemo, useState } from 'react'
import { View, StyleSheet, Text, Button, ScrollView } from 'react-native'
import { LineGraph } from 'react-native-graph'
import StaticSafeAreaInsets from 'react-native-static-safe-area-insets'
import type { GraphRange } from '../../../src/LineGraphProps'
import { SelectionDot } from '../components/CustomSelectionDot'
import { Toggle } from '../components/Toggle'
import {
  generateRandomGraphData,
  generateSinusGraphData,
} from '../data/GraphData'
import { useColors } from '../hooks/useColors'
import { hapticFeedback } from '../utils/HapticFeedback'

const POINT_COUNT = 70
const POINTS = generateRandomGraphData(POINT_COUNT)
const COLOR = '#6a7ee7'
const GRADIENT_FILL_COLORS = ['#7476df5D', '#7476df4D', '#7476df00']
const SMALL_POINTS = generateSinusGraphData(9)

export function GraphPage() {
  const colors = useColors()

  const [isAnimated, setIsAnimated] = useState(true)
  const [enablePanGesture, setEnablePanGesture] = useState(true)
  const [enableFadeInEffect, setEnableFadeInEffect] = useState(false)
  const [enableCustomSelectionDot, setEnableCustomSelectionDot] =
    useState(false)
  const [enableGradient, setEnableGradient] = useState(false)
  const [enableRange, setEnableRange] = useState(false)
  const [enableIndicator, setEnableIndicator] = useState(false)
  const [indicatorPulsating, setIndicatorPulsating] = useState(false)

  const [points, setPoints] = useState(POINTS)

  const refreshData = useCallback(() => {
    setPoints(generateRandomGraphData(POINT_COUNT))
    hapticFeedback('impactLight')
  }, [])

  const highestDate = useMemo(
    () =>
      points.length !== 0 && points[points.length - 1] != null
        ? points[points.length - 1]!.date
        : undefined,
    [points]
  )
  const range: GraphRange | undefined = useMemo(() => {
    // if range is disabled, default to infinite range (undefined)
    if (!enableRange) return undefined

    if (points.length !== 0 && highestDate != null) {
      return {
        x: {
          min: points[0]!.date,
          max: new Date(highestDate.getTime() + 50 * 1000 * 60 * 60 * 24),
        },
        y: {
          min: -200,
          max: 200,
        },
      }
    } else {
      return {
        y: {
          min: -200,
          max: 200,
        },
      }
    }
  }, [enableRange, highestDate, points])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          react-native-graph
        </Text>
        <LineGraph
          style={styles.miniGraph}
          animated={false}
          color={colors.foreground}
          points={SMALL_POINTS}
        />
      </View>

      <View style={styles.spacer} />

      <LineGraph
        style={styles.graph}
        animated={isAnimated}
        color={COLOR}
        points={points}
        gradientFillColors={enableGradient ? GRADIENT_FILL_COLORS : undefined}
        enablePanGesture={enablePanGesture}
        enableFadeInMask={enableFadeInEffect}
        onGestureStart={() => hapticFeedback('impactLight')}
        SelectionDot={enableCustomSelectionDot ? SelectionDot : undefined}
        range={range}
        enableIndicator={enableIndicator}
        horizontalPadding={enableIndicator ? 15 : 0}
        indicatorPulsating={indicatorPulsating}
      />

      <Button title="Refresh" onPress={refreshData} />

      <ScrollView
        style={styles.controlsScrollView}
        contentContainerStyle={styles.controlsScrollViewContent}
      >
        <Toggle
          title="Animated:"
          isEnabled={isAnimated}
          setIsEnabled={setIsAnimated}
        />
        <Toggle
          title="Enable Gesture:"
          isEnabled={enablePanGesture}
          setIsEnabled={setEnablePanGesture}
        />
        <Toggle
          title="Enable Fade-in effect:"
          isEnabled={enableFadeInEffect}
          setIsEnabled={setEnableFadeInEffect}
        />
        <Toggle
          title="Custom Selection Dot:"
          isEnabled={enableCustomSelectionDot}
          setIsEnabled={setEnableCustomSelectionDot}
        />
        <Toggle
          title="Enable Gradient:"
          isEnabled={enableGradient}
          setIsEnabled={setEnableGradient}
        />
        <Toggle
          title="Enable Range:"
          isEnabled={enableRange}
          setIsEnabled={setEnableRange}
        />
        <Toggle
          title="Enable Indicator:"
          isEnabled={enableIndicator}
          setIsEnabled={setEnableIndicator}
        />
        <Toggle
          title="Indicator pulsating:"
          isEnabled={indicatorPulsating}
          setIsEnabled={setIndicatorPulsating}
        />
      </ScrollView>

      <View style={styles.spacer} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StaticSafeAreaInsets.safeAreaInsetsTop + 15,
    paddingBottom: StaticSafeAreaInsets.safeAreaInsetsBottom + 15,
  },
  spacer: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    paddingHorizontal: 15,
  },
  graph: {
    alignSelf: 'center',
    width: '100%',
    aspectRatio: 1.4,
    marginVertical: 20,
  },
  miniGraph: {
    width: 40,
    height: 35,
    marginLeft: 5,
  },
  controlsScrollView: {
    flexGrow: 1,
    paddingHorizontal: 15,
  },
  controlsScrollViewContent: {
    justifyContent: 'center',
  },
})
