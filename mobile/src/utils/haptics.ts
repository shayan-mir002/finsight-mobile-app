import HapticFeedback from 'react-native-haptic-feedback';

export const haptics = {
  light: () => HapticFeedback.trigger('impactLight'),
  success: () => HapticFeedback.trigger('notificationSuccess'),
  selection: () => HapticFeedback.trigger('selection'),
};
