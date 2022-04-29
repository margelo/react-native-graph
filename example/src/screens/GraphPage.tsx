import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { LineGraph } from 'react-native-graph'
import type { GraphPoint } from '../../../src/LineGraphProps'
import { useColors } from '../hooks/useColors'

function generateRandomPoints(): GraphPoint[] {
  return Array<number>(180)
    .fill(0)
    .map((v) => ({
      date: new Date(v),
      value: Math.random(),
    }))
}

export function GraphPage() {
  const colors = useColors()

  const points = generateRandomPoints()

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          react-native-graph
        </Text>
        <LineGraph
          style={styles.miniGraph}
          animated={false}
          color={colors.foreground}
          points={points}
        />
      </View>

      <LineGraph
        style={styles.graph}
        animated={true}
        color="#6a7ee7"
        points={points}
        enablePanGesture={true}
      />
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
