import React, { useCallback, useState } from 'react'
import { View, StyleSheet, Text, Button } from 'react-native'
import { LineGraph } from 'react-native-graph'
import {
  generateRandomGraphData,
  generateSinusGraphData,
} from '../data/GraphData'
import { useColors } from '../hooks/useColors'
import { hapticFeedback } from '../utils/HapticFeedback'

const POINTS = 70

export function GraphPage() {
  const colors = useColors()

  const [points, setPoints] = useState(() => generateRandomGraphData(POINTS))
  const smallPoints = generateSinusGraphData(9)

  const refreshData = useCallback(() => {
    setPoints(generateRandomGraphData(POINTS))
    hapticFeedback('impactLight')
  }, [])

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
          points={smallPoints}
        />
      </View>

      <LineGraph
        style={styles.graph}
        animated={true}
        color="#6a7ee7"
        points={points}
        enablePanGesture={true}
      />

      <Button title="Refresh" onPress={refreshData} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
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
})
