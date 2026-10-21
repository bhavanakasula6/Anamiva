/**
 * Socket Context
 * Manages Socket.IO connection lifecycle and incoming call notifications
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { useAuth } from './AuthContext';
import socketService from '../services/socketService';
import IncomingCallModal from '../components/common/IncomingCallModal';
import { appointmentAPI, notificationAPI } from '../services/api';
import { getSettings } from '../services/storage';

const SocketContext = createContext(null);

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const navigationRef = useRef(null);

  // Incoming call state
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !user || !token) return undefined;

    const prepareNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Anamiva notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#14B8A6',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let status = existingStatus;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const pushToken = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      if (pushToken?.data) {
        await notificationAPI.registerPushToken(pushToken.data, Platform.OS);
      }
    };

    prepareNotifications().catch((error) =>
      console.warn('Unable to prepare notification permission:', error)
    );

    return undefined;
  }, [user, token]);

  // Connect socket when user is authenticated
  useEffect(() => {
    const userId = user?.id || user?._id;
    const handleIncomingCall = (data) => {
      setIncomingCall({
        appointmentId: data.appointmentId,
        doctorName: data.caller?.name || data.doctorName || 'Doctor',
        doctorAvatar: data.caller?.avatar || data.doctorAvatar || null,
        videoCallRoomId: data.roomId || data.videoCallRoomId,
      });
    };
    const handleCallEnded = () => {
      setIncomingCall(null);
    };
    const navigateFromNotification = (data = {}) => {
      if (!navigationRef.current?.isReady?.()) return;
      if (data.appointmentId) {
        navigationRef.current.navigate('Main', {
          screen: 'Appointments',
          params: { screen: 'AppointmentDetails', params: { appointmentId: data.appointmentId } },
        });
      } else if (data.recordId || data.prescriptionId) {
        const recordTab = user?.role === 'doctor' ? 'Appointments' : 'Records';
        navigationRef.current.navigate('Main', {
          screen: recordTab,
          params: {
            screen: 'RecordDetails',
            params: { recordId: data.recordId || data.prescriptionId },
          },
        });
      } else if (data.emergencyId && (user?.role === 'doctor' || user?.role === 'admin')) {
        navigationRef.current.navigate('Main', {
          screen: 'Emergency',
          params: { screen: 'EmergencyList' },
        });
      }
    };
    const handleNotificationCreated = async (notification) => {
      const preferenceResponse = await notificationAPI.getPreferences();
      const settings = preferenceResponse?.success
        ? preferenceResponse.preferences
        : await getSettings();
      if (!settings.notifications) return;

      const notificationType = notification?.type;
      const preferenceKey = notificationType === 'appointment'
        ? 'appointmentNotifications'
        : notificationType === 'emergency'
          ? 'emergencyNotifications'
          : notificationType === 'medication' || notificationType === 'medical-record' || notificationType === 'prescription' || notificationType === 'record'
            ? 'medicalRecordNotifications'
            : null;

      if (preferenceKey && settings[preferenceKey] === false) return;

      const title = notification?.title || 'New notification';
      const body = notification?.message || 'You have a new update in Anamiva.';

      if (Platform.OS === 'web') {
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          window.Notification.permission === 'granted'
        ) {
          const browserNotification = new window.Notification(title, {
            body,
            data: notification?.data || {},
          });
          browserNotification.onclick = () => {
            window.focus();
            navigateFromNotification(notification?.data || {});
            browserNotification.close();
          };
        }
        return;
      }

      Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
          data: notification?.data || {},
        },
        trigger: null,
      }).catch((error) => console.warn('Unable to show notification:', error));
    };

    let notificationResponseSubscription;
    if (Platform.OS !== 'web' && userId && token) {
      notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        navigateFromNotification(response?.notification?.request?.content?.data || {});
      });
      Notifications.getLastNotificationResponseAsync?.().then((response) => {
        if (response) navigateFromNotification(response.notification?.request?.content?.data || {});
      }).catch(() => {});
    }

    if (userId && token) {
      socketService.connect(userId, token);

      // Listen for incoming calls (patient side)
      socketService.onCallStarted(handleIncomingCall);

      // Listen for call ended (dismiss modal if showing)
      socketService.onCallEnded(handleCallEnded);
      const socket = socketService.getSocket();
      socket?.on('notification-created', handleNotificationCreated);
    }

    return () => {
      // Only remove SocketContext's own listeners, not all listeners
      const sock = socketService.getSocket();
      if (sock) {
        sock.off('incoming-call', handleIncomingCall);
        sock.off('call-ended', handleCallEnded);
        sock.off('notification-created', handleNotificationCreated);
      }
      notificationResponseSubscription?.remove();
      socketService.disconnect();
    };
  }, [user?.id, user?._id, user?.role, token]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    const { appointmentId, videoCallRoomId, doctorName } = incomingCall;
    setIncomingCall(null);

    // Join the call on backend
    try {
      await appointmentAPI.joinCall(appointmentId);
    } catch (err) {
      console.error('Error joining call:', err);
    }

    // Navigate to video call screen
    if (navigationRef.current) {
      navigationRef.current.navigate('Main', {
        screen: 'Home',
        params: {
          screen: 'VideoCall',
          params: {
            appointmentId,
            roomId: videoCallRoomId,
            isCaller: false,
            otherPartyName: doctorName,
          },
        },
      });
    }
  }, [incomingCall]);

  // Decline incoming call
  const declineCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // Set navigation ref (called from NavigationContainer)
  const setNavigationRef = useCallback((ref) => {
    navigationRef.current = ref;
  }, []);

  const value = {
    socket: socketService,
    incomingCall,
    setNavigationRef,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
      <IncomingCallModal
        visible={!!incomingCall}
        doctorName={incomingCall?.doctorName}
        doctorAvatar={incomingCall?.doctorAvatar}
        onAccept={acceptCall}
        onDecline={declineCall}
      />
    </SocketContext.Provider>
  );
};

export default SocketContext;
