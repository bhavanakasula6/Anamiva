import { Alert, Platform } from 'react-native';

const formatMessage = (title, message) => [title, message].filter(Boolean).join('\n\n');

export const configureWebAlerts = () => {
  if (Platform.OS !== 'web' || Alert.__webAlertConfigured) return;

  const nativeAlert = Alert.alert;

  Alert.alert = (title, message, buttons = [], options = {}) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return nativeAlert(title, message, buttons, options);
    }

    const normalizedButtons = Array.isArray(buttons) ? buttons : [];
    const text = formatMessage(title, message);

    if (normalizedButtons.length === 0) {
      window.alert(text);
      return;
    }

    if (normalizedButtons.length === 1) {
      window.alert(text);
      normalizedButtons[0]?.onPress?.();
      return;
    }

    const cancelButton = normalizedButtons.find(button => button.style === 'cancel');
    const actionButtons = normalizedButtons.filter(button => button.style !== 'cancel');

    if (actionButtons.length === 1) {
      const confirmed = window.confirm(text);
      if (confirmed) {
        actionButtons[0]?.onPress?.();
      } else {
        cancelButton?.onPress?.();
      }
      return;
    }

    const optionsText = actionButtons
      .map((button, index) => `${index + 1}. ${button.text || `Option ${index + 1}`}`)
      .join('\n');
    const choice = window.prompt(`${text}\n\n${optionsText}\n\nEnter option number:`);

    const selectedIndex = Number(choice) - 1;
    if (Number.isInteger(selectedIndex) && actionButtons[selectedIndex]) {
      actionButtons[selectedIndex].onPress?.();
    } else {
      cancelButton?.onPress?.();
    }
  };

  Alert.__webAlertConfigured = true;
};
