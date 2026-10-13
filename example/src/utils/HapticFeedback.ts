import * as Haptics from 'expo-haptics';

export function hapticFeedback(): Promise<void> {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
