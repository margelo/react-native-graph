import React from 'react'
import { View, StyleSheet, Text } from 'react-native'

export function GraphPage() {
  return (
    <View style={styles.container}>
      <Text>react-native-graph</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
})
