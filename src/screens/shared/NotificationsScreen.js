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

const NotificationsScreen = ({ navigation }) => {
  const { isPatient } = useAuth();

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
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(
    Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window) || window.Notification.permission === 'granted'
  );

  useEffect(() => {
    loadNotifications?.();
    if (isPatient()) loadRequests?.();
  }, []);

  const enableBrowserNotifications = async () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await window.Notification.requestPermission();
    setBrowserNotificationsEnabled(permission === 'granted');
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
          {Platform.OS === 'web' && !browserNotificationsEnabled && (
            <Button
              size="sm"
              variant="outline"
              icon="bell"
              onPress={enableBrowserNotifications}
              style={styles.browserNotificationButton}
            >
              Enable browser notifications
            </Button>
          )}

          {/* NOTIFICATIONS */}
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <Card
                key={notification.id || notification._id}
                onPress={() => !notification.read && markNotificationAsRead?.(notification.id || notification._id)}
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
    marginBottom: spacing.md,
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

export default NotificationsScreen;
