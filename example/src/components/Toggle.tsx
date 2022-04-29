import SegmentedControl from '@react-native-segmented-control/segmented-control'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useColors } from '../hooks/useColors'

interface Props {
  title: string
  isEnabled: boolean
  setIsEnabled: (isEnabled: boolean) => void
}

export function Toggle({ title, isEnabled, setIsEnabled }: Props) {
  const colors = useColors()

  return (
    <View style={styles.row}>
      <Text style={[styles.toggleText, { color: colors.foreground }]}>
        {title}
      </Text>

      <View style={styles.spacer} />

      <SegmentedControl
        style={styles.segmentedControl}
        values={['yes', 'no']}
        selectedIndex={isEnabled ? 0 : 1}
        onValueChange={(v) => setIsEnabled(v === 'yes')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  spacer: {
    flexGrow: 1,
  },
  toggleText: {
    fontSize: 18,
    fontWeight: '600',
  },
  segmentedControl: {
    marginLeft: 10,
    width: 140,
  },
})
