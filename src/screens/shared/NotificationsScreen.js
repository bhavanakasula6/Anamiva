/**
 * Notifications Screen
 * Display user notifications
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../../styles/theme';

import {
  Card,
  Header,
  Button,
} from '../../components/common';

import Icon from '../../components/Icon';

import { useAuth } from '../../contexts/AuthContext';
import { usePatient } from '../../contexts/PatientContext';
import { useDoctor } from '../../contexts/DoctorContext';
import { getSettings, saveSettings } from '../../services/storage';
import { notificationAPI } from '../../services/api';

const DEFAULT_NOTIFICATION_SETTINGS = {
  notifications: true,
  appointmentNotifications: true,
  medicalRecordNotifications: true,
  emergencyNotifications: true,
};

const NotificationsScreen = ({ navigation }) => {
  const { isPatient, isDoctor } = useAuth();

  const patientContext = usePatient() || {};
  const doctorContext = useDoctor() || {};
  const notificationContext = isPatient() ? patientContext : doctorContext;

  const {
    requests = [],
    loadRequests,
    approveRequest,
    denyRequest,
    notifications = [],
    loadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = notificationContext;
  const browserNotificationsSupported = Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window;
  const [browserPermission, setBrowserPermission] = useState(
    browserNotificationsSupported ? window.Notification.permission : 'unsupported'
  );
  const browserNotificationsEnabled = browserPermission === 'granted' || !browserNotificationsSupported;
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    loadNotifications?.();
    if (isPatient()) loadRequests?.();

    Promise.all([
      getSettings(),
      notificationAPI.getPreferences(),
    ]).then(([localSettings, response]) => {
      const serverSettings = response?.success ? response.preferences : {};
      setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...localSettings, ...serverSettings });
    }).catch(() => getSettings().then(settings => {
      setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...settings });
    }));
  }, []);

  const updateNotificationSetting = async (key, value) => {
    const updated = { ...notificationSettings, [key]: value };
    setNotificationSettings(updated);
    await saveSettings(updated);
    const response = await notificationAPI.updatePreferences(updated);
    if (!response?.success) {
      Alert.alert('Could not save preference', response?.error || 'Please try again.');
    }
  };

  const openNotification = async (notification) => {
    const id = notification.id || notification._id;
    if (!notification.read) await markNotificationAsRead?.(id);
    const data = notification.data || {};
    const parent = navigation.getParent?.();
    if (data.appointmentId && parent) {
      parent.navigate('Appointments', {
        screen: 'AppointmentDetails',
        params: { appointmentId: data.appointmentId },
      });
    } else if ((data.recordId || data.prescriptionId) && parent) {
      parent.navigate(isDoctor() ? 'Appointments' : 'Records', {
        screen: 'RecordDetails',
        params: { recordId: data.recordId || data.prescriptionId },
      });
    } else if (data.emergencyId && parent && !isPatient()) {
      parent.navigate('Emergency', { screen: 'EmergencyList' });
    }
  };

  const enableBrowserNotifications = async () => {
    if (!browserNotificationsSupported) {
      Alert.alert('Not supported', 'This browser does not support notifications.');
      return;
    }

    if (window.Notification.permission === 'denied') {
      Alert.alert(
        'Notifications are blocked',
        'Allow notifications for this website in the browser site settings, then try again.'
      );
      return;
    }

    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);

    if (permission === 'granted') {
      new window.Notification('Notifications enabled', {
        body: 'You will receive new Anamiva alerts here.',
      });
    } else if (permission === 'denied') {
      Alert.alert(
        'Notifications are blocked',
        'Allow notifications for this website in the browser site settings.'
      );
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment':
        return 'calendar';
      case 'medication':
        return 'pills';
      case 'emergency':
        return 'alert-triangle';
      case 'request':
        return 'lock';
      default:
        return 'bell';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Notifications"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, Platform.OS === 'web' && styles.webContent]}>
          <Card style={styles.preferencesCard}>
            <Text style={styles.preferencesTitle}>Notification preferences</Text>
            <Text style={styles.preferencesSubtitle}>
              Choose which alerts can appear on this device.
            </Text>

            <PreferenceRow
              title="Allow notifications"
              subtitle="Enable or disable all notification alerts"
              value={notificationSettings.notifications}
              onValueChange={value => updateNotificationSetting('notifications', value)}
            />
            <PreferenceRow
              title="Appointments"
              subtitle="Bookings, changes, and appointment reminders"
              value={notificationSettings.appointmentNotifications}
              disabled={!notificationSettings.notifications}
              onValueChange={value => updateNotificationSetting('appointmentNotifications', value)}
            />
            <PreferenceRow
              title="Medical records"
              subtitle="Prescription and medical record updates"
              value={notificationSettings.medicalRecordNotifications}
              disabled={!notificationSettings.notifications}
              onValueChange={value => updateNotificationSetting('medicalRecordNotifications', value)}
            />
            <PreferenceRow
              title="Emergency alerts"
              subtitle="Emergency requests and status updates"
              value={notificationSettings.emergencyNotifications}
              disabled={!notificationSettings.notifications}
              onValueChange={value => updateNotificationSetting('emergencyNotifications', value)}
            />
          </Card>

          {Platform.OS === 'web' && !browserNotificationsEnabled && (
            <View style={styles.browserNotificationBox}>
              <Button
                size="sm"
                variant="outline"
                icon="bell"
                onPress={enableBrowserNotifications}
                style={styles.browserNotificationButton}
              >
                Enable browser notifications
              </Button>
              {browserPermission === 'denied' && (
                <Text style={styles.browserNotificationHint}>
                  Notifications are blocked for this website. Allow them from the browser address-bar settings.
                </Text>
              )}
            </View>
          )}

          {/* NOTIFICATIONS */}
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <Card
                key={notification.id || notification._id}
                onPress={() => openNotification(notification)}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.unreadCard,
                ]}
              >
                <View style={styles.notificationContent}>
                  <Icon
                    name={getNotificationIcon(notification.type)}
                    size={22}
                    color={colors.primary[500]}
                    style={styles.notificationIcon}
                  />

                  <View style={styles.notificationText}>
                    <Text
                      style={styles.notificationTitle}
                      numberOfLines={2}
                    >
                      {notification.title}
                    </Text>

                    <Text
                      style={styles.notificationMessage}
                      numberOfLines={3}
                    >
                      {notification.message}
                    </Text>

                    <Text
                      style={styles.notificationTime}
                      numberOfLines={1}
                    >
                      {new Date(notification.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  {!notification.read && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon
                name="bell"
                size={56}
                color={colors.gray[400]}
              />
              <Text style={styles.emptyText}>
                No notifications
              </Text>
            </View>
          )}

          {notifications.length > 0 && notifications.some(notification => !notification.read) && (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => markAllNotificationsAsRead?.()}
            >
              Mark all as read
            </Button>
          )}

          {/* ACCESS REQUESTS – PATIENT ONLY */}
          {isPatient() &&
            requests.map((req) => (
              <Card
                key={req.id}
                style={styles.requestCard}
              >
                <View style={styles.requestHeader}>
                  <Icon
                    name="lock"
                    size={20}
                    color={colors.warning[500]}
                  />
                  <Text style={styles.requestText}>
                    {req.doctorName || 'Doctor'} requested access
                    to your medical history
                  </Text>
                </View>

                <View style={styles.requestActions}>
                  <Button
                    size="sm"
                    onPress={() => approveRequest(req)}
                  >
                    Allow
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onPress={() => denyRequest(req)}
                  >
                    Deny
                  </Button>
                </View>
              </Card>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },

  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },

  content: {
    padding: spacing.lg,
  },

  webContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },

  notificationCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadows.sm,
  },

  preferencesCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },

  preferencesTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
  },

  preferencesSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },

  preferenceText: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.md,
  },

  preferenceTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[900],
  },

  preferenceSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginTop: 2,
  },

  unreadCard: {
    backgroundColor: colors.primary[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
    ...shadows.md,
  },

  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  browserNotificationButton: {
    alignSelf: 'flex-start',
  },

  browserNotificationBox: {
    marginBottom: spacing.md,
  },

  browserNotificationHint: {
    color: colors.gray[600],
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    maxWidth: 620,
  },

  notificationIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },

  notificationText: {
    flex: 1,
    minWidth: 0,
  },

  notificationTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },

  notificationMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.xs,
  },

  notificationTime: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginLeft: spacing.sm,
    marginTop: 6,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },

  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
  },

  requestCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    ...shadows.sm,
  },

  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },

  requestText: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[800],
  },

  requestActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
});

const PreferenceRow = ({ title, subtitle, value, disabled, onValueChange }) => (
  <View style={styles.preferenceRow}>
    <View style={styles.preferenceText}>
      <Text style={styles.preferenceTitle}>{title}</Text>
      <Text style={styles.preferenceSubtitle}>{subtitle}</Text>
    </View>
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={onValueChange}
      trackColor={{ false: colors.gray[300], true: colors.primary[200] }}
      thumbColor={value ? colors.primary[500] : colors.gray[500]}
    />
  </View>
);

export default NotificationsScreen;
