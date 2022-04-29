import { useColors } from '../hooks/useColors'
import React, { useCallback, useState } from 'react'
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewProps,
  Text,
} from 'react-native'
import { PressableScale } from 'react-native-pressable-scale'
import Reanimated, {
  Easing,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import {
  GraphDisplayMode,
  GRAPH_DISPLAY_MODES,
  SCREEN_WIDTH,
} from '../Constants'

interface Props extends ViewProps {
  graphDisplayMode: GraphDisplayMode
  setGraphDisplayMode: (graphDisplayMode: GraphDisplayMode) => void
}

export const SPACING = 5
export const ESTIMATED_BUTTON_WIDTH =
  (SCREEN_WIDTH - 50) / GRAPH_DISPLAY_MODES.length

export function GraphDisplayModeSelector({
  graphDisplayMode,
  setGraphDisplayMode,
  style,
  ...props
}: Props): React.ReactElement {
  const colors = useColors()

  const [width, setWidth] = useState(ESTIMATED_BUTTON_WIDTH)

  const onLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
      setWidth(Math.round(layout.width))
    },
    []
  )

  const buttonWidth = width / GRAPH_DISPLAY_MODES.length - 2 * SPACING

  const selectedModeIndex = GRAPH_DISPLAY_MODES.indexOf(graphDisplayMode)
  const selectionBackgroundStyle = useAnimatedStyle(() => {
    return {
      width: buttonWidth,
      opacity: withTiming(selectedModeIndex === -1 ? 0 : 1, {
        easing: Easing.linear,
        duration: 150,
      }),
      transform: [
        {
          translateX: withSpring(
            buttonWidth * selectedModeIndex + 2 * SPACING * selectedModeIndex,
            {
              mass: 1,
              stiffness: 900,
              damping: 300,
            }
          ),
        },
      ],
    }
  }, [buttonWidth, selectedModeIndex])

  return (
    <View {...props} onLayout={onLayout} style={[styles.container, style]}>
      <Reanimated.View
        style={[
          styles.selectionBackground,
          { backgroundColor: colors.background },
          selectionBackgroundStyle,
        ]}
      />
      {GRAPH_DISPLAY_MODES.map((displayMode) => (
        <View key={displayMode} style={styles.buttonContainer}>
          <PressableScale
            style={styles.button}
            onPress={() => setGraphDisplayMode(displayMode)}
          >
            <Text style={{ color: colors.foreground }}>
              {displayMode.toUpperCase()}
            </Text>
          </PressableScale>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectionBackground: {
    position: 'absolute',
    height: '100%',
    marginLeft: SPACING,
    borderRadius: 7,
  },
  buttonContainer: {
    flex: 1,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING,
    paddingVertical: 2.5,
  },
})
