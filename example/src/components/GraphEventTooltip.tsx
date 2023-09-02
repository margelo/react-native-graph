import React from 'react'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native'
import { EventTooltipComponentProps } from '../../../src/LineGraphProps'

export type TransactionEventTooltipProps = EventTooltipComponentProps<{}>

const SCREEN_WIDTH = Dimensions.get('screen').width
const ANIMATION_DURATION = 200
const TOOLTIP_LEFT_OFFSET = 25
const TOOLTIP_RIGHT_OFFSET = 145

export const GraphEventTooltip = ({
  eventX,
  eventY,
}: TransactionEventTooltipProps) => {
  const tooltipPositionStyle = {
    left:
      eventX > SCREEN_WIDTH / 2
        ? eventX - TOOLTIP_RIGHT_OFFSET
        : eventX + TOOLTIP_LEFT_OFFSET,
    top: eventY,
  }
  return (
    <Animated.View
      style={[styles.tooltip, tooltipPositionStyle]}
      entering={FadeIn.duration(ANIMATION_DURATION)}
      exiting={FadeOut.duration(ANIMATION_DURATION)}
    >
      <View style={styles.content}>
        <Text style={styles.textNote}>
          Here you can display {'\n'}
          any information you {'\n'}
          want about the event.
        </Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    backgroundColor: 'white',
    paddingHorizontal: 10,

    borderRadius: 20,
    // add shadow based on platform
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  content: {
    paddingVertical: 12,
  },
  textNote: {
    color: 'gray',
    fontSize: 10,
  },
})
