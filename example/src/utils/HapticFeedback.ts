import HapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback'

export function hapticFeedback(
  type: HapticFeedbackTypes = 'impactLight',
  force = false
): void {
  HapticFeedback.trigger(type, {
    enableVibrateFallback: force,
    ignoreAndroidSystemSettings: force,
  })
}
