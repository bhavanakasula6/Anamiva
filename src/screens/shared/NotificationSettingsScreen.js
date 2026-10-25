import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Header } from '../../components/common';
import { notificationAPI } from '../../services/api';
import { getSettings, saveSettings } from '../../services/storage';
import { colors, shadows, spacing, typography } from '../../styles/theme';

const DEFAULT_SETTINGS = {
  notifications: true,
  appointmentNotifications: true,
  medicalRecordNotifications: true,
  emergencyNotifications: true,
};

const NotificationSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const browserSupported = Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;
  const [browserPermission, setBrowserPermission] = useState(
    browserSupported ? window.Notification.permission : 'unsupported'
  );

  useEffect(() => {
    Promise.all([getSettings(), notificationAPI.getPreferences()]).then(([local, response]) => {
      setSettings({ ...DEFAULT_SETTINGS, ...local, ...(response?.success ? response.preferences : {}) });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !browserSupported) return undefined;

    const refreshBrowserPermission = () => {
      setBrowserPermission(window.Notification.permission);
    };

    window.addEventListener('focus', refreshBrowserPermission);
    return () => window.removeEventListener('focus', refreshBrowserPermission);
  }, [browserSupported]);

  const updateSetting = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
    const response = await notificationAPI.updatePreferences(updated);
    if (!response?.success) Alert.alert('Could not save preference', response?.error || 'Please try again.');
  };

  const enableBrowserNotifications = async () => {
    if (!browserSupported) {
      Alert.alert('Not supported', 'This browser does not support notifications.');
      return;
    }
    if (window.Notification.permission === 'denied') {
      Alert.alert('Notifications are blocked', 'Allow notifications from the browser address-bar settings.');
      return;
    }
    try {
      const permission = await window.Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === 'granted') {
        new window.Notification('Notifications enabled', { body: 'You will receive new Anamiva alerts here.' });
      } else if (permission === 'denied') {
        Alert.alert('Notifications are blocked', 'Allow notifications from the browser address-bar settings.');
      }
    } catch (error) {
      Alert.alert('Could not enable notifications', 'Please allow notifications from this website in your browser settings.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Notification preferences" leftIcon="back" onLeftPress={() => navigation.goBack()} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, Platform.OS === 'web' && styles.webContent]}>
          <Card style={styles.card}>
            <Text style={styles.title}>Choose which alerts you receive</Text>
            <PreferenceRow title="Allow notifications" subtitle="Enable or disable all alerts" value={settings.notifications} onValueChange={value => updateSetting('notifications', value)} />
            <PreferenceRow title="Appointments" subtitle="Bookings and appointment changes" value={settings.appointmentNotifications} disabled={!settings.notifications} onValueChange={value => updateSetting('appointmentNotifications', value)} />
            <PreferenceRow title="Medical records" subtitle="Prescription and record updates" value={settings.medicalRecordNotifications} disabled={!settings.notifications} onValueChange={value => updateSetting('medicalRecordNotifications', value)} />
            <PreferenceRow title="Emergency alerts" subtitle="Emergency requests and updates" value={settings.emergencyNotifications} disabled={!settings.notifications} onValueChange={value => updateSetting('emergencyNotifications', value)} />
          </Card>

          {Platform.OS === 'web' && (
            <View style={styles.browserBox}>
              {browserPermission !== 'granted' && (
                <Button size="sm" variant="outline" icon="bell" onPress={enableBrowserNotifications}>
                  Enable browser notifications
                </Button>
              )}
              {browserPermission === 'denied' && <Text style={styles.hint}>Allow notifications from the browser address-bar settings.</Text>}
              {browserPermission === 'granted' && (
                <Text style={styles.hint}>Browser notifications are enabled. To disable browser permission, use this website's browser site settings.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const PreferenceRow = ({ title, subtitle, value, disabled, onValueChange }) => (
  <View style={styles.row}>
    <View style={styles.textBox}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
    <Switch value={value} disabled={disabled} onValueChange={onValueChange} trackColor={{ false: colors.gray[300], true: colors.primary[200] }} thumbColor={value ? colors.primary[500] : colors.gray[500]} />
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg },
  webContent: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { padding: spacing.lg, ...shadows.sm },
  title: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.semiBold, color: colors.gray[900], marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray[200] },
  textBox: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  rowTitle: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium, color: colors.gray[900] },
  subtitle: { fontSize: typography.fontSize.xs, color: colors.gray[600], marginTop: 2 },
  browserBox: { marginTop: spacing.md },
  hint: { color: colors.gray[600], fontSize: typography.fontSize.xs, marginTop: spacing.xs },
});

export default NotificationSettingsScreen;
