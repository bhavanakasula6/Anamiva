/**
 * Socket Context
 * Manages Socket.IO connection lifecycle and incoming call notifications
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from './AuthContext';
import socketService from '../services/socketService';
import IncomingCallModal from '../components/common/IncomingCallModal';
import { appointmentAPI } from '../services/api';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const navigationRef = useRef(null);

  // Incoming call state
  const [incomingCall, setIncomingCall] = useState(null);

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
    const handleNotificationCreated = (notification) => {
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        new window.Notification(notification?.title || 'New notification', {
          body: notification?.message || 'You have a new update in Anamiva.',
        });
      }
    };

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
      socketService.disconnect();
    };
  }, [user?.id, user?._id, token]);

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
