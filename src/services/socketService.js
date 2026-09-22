/**
 * Socket Service
 * Singleton Socket.IO client for real-time communication (video calls, notifications)
 */

import { io } from 'socket.io-client';
import { API_BASE_URL } from '../data/constants';

// Derive socket URL from API base URL (remove '/api' suffix)
const SOCKET_URL = API_BASE_URL.replace('/api', '');

let socket = null;

const socketService = {
  /**
   * Connect to the Socket.IO server
   */
  connect: (userId, token) => {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
      auth: { userId, token },
      query: { userId, token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return socket;
  },

  /**
   * Disconnect from the server
   */
  disconnect: () => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  },

  /**
   * Get the current socket instance
   */
  getSocket: () => socket,

  /**
   * Check if connected
   */
  isConnected: () => socket?.connected || false,

  // ==========================================
  // Video Call Signaling
  // ==========================================

  /**
   * Join a video call signaling room
   */
  joinCallRoom: (roomId, userId, role) => {
    if (!socket) return;
    socket.emit('join-call-room', { roomId, userId, role });
  },

  /**
   * Leave a video call signaling room
   */
  leaveCallRoom: (roomId) => {
    if (!socket) return;
    socket.emit('leave-call-room', { roomId });
  },

  /**
   * Send WebRTC SDP offer
   */
  sendOffer: (roomId, offer) => {
    if (!socket) return;
    socket.emit('webrtc-offer', { roomId, offer });
  },

  /**
   * Send WebRTC SDP answer
   */
  sendAnswer: (roomId, answer) => {
    if (!socket) return;
    socket.emit('webrtc-answer', { roomId, answer });
  },

  /**
   * Send ICE candidate
   */
  sendIceCandidate: (roomId, candidate) => {
    if (!socket) return;
    socket.emit('webrtc-ice-candidate', { roomId, candidate });
  },

  /**
   * Toggle audio state notification
   */
  toggleAudio: (roomId, isMuted) => {
    if (!socket) return;
    socket.emit('peer-toggle-audio', { roomId, isMuted });
  },

  /**
   * Toggle video state notification
   */
  toggleVideo: (roomId, isVideoOff) => {
    if (!socket) return;
    socket.emit('peer-toggle-video', { roomId, isVideoOff });
  },

  // ==========================================
  // Event Listeners
  // ==========================================

  onCallStarted: (callback) => {
    if (!socket) return;
    socket.on('incoming-call', callback);
  },

  onCallEnded: (callback) => {
    if (!socket) return;
    socket.on('call-ended', callback);
  },

  onPeerJoined: (callback) => {
    if (!socket) return;
    socket.on('peer-joined', callback);
  },

  onPeerLeft: (callback) => {
    if (!socket) return;
    socket.on('peer-left', callback);
  },

  onOffer: (callback) => {
    if (!socket) return;
    socket.on('webrtc-offer', callback);
  },

  onAnswer: (callback) => {
    if (!socket) return;
    socket.on('webrtc-answer', callback);
  },

  onIceCandidate: (callback) => {
    if (!socket) return;
    socket.on('webrtc-ice-candidate', callback);
  },

  onPeerToggleAudio: (callback) => {
    if (!socket) return;
    socket.on('peer-toggle-audio', callback);
  },

  onPeerToggleVideo: (callback) => {
    if (!socket) return;
    socket.on('peer-toggle-video', callback);
  },

  onAppointmentUpdated: (callback) => {
    if (!socket) return;
    socket.on('appointment-updated', callback);
  },

  offAppointmentUpdated: () => {
    if (!socket) return;
    socket.off('appointment-updated');
  },

  onConsentGranted: (callback) => {
    if (!socket) return;
    socket.on('consent-granted', callback);
  },

  onAccessRequestApproved: (callback) => {
    if (!socket) return;
    socket.on('access-request-approved', callback);
  },

  onAppointmentBooked: (callback) => {
    if (!socket) return;
    socket.on('appointment-booked', callback);
  },

  offAppointmentBooked: () => {
    if (!socket) return;
    socket.off('appointment-booked');
  },

  onEmergencyStatusUpdated: (callback) => {
    if (!socket) return;
    socket.on('emergency-status-updated', callback);
  },

  offEmergencyStatusUpdated: () => {
    if (!socket) return;
    socket.off('emergency-status-updated');
  },

  onEmergencyAccepted: (callback) => {
    if (!socket) return;
    socket.on('emergency-accepted', callback);
  },

  removeVideoCallListeners: () => {
    if (!socket) return;
    socket.off('call-ended');
    socket.off('peer-joined');
    socket.off('peer-left');
    socket.off('webrtc-offer');
    socket.off('webrtc-answer');
    socket.off('webrtc-ice-candidate');
    socket.off('peer-toggle-audio');
    socket.off('peer-toggle-video');
  },

  /**
   * Remove all event listeners
   */
  removeAllListeners: () => {
    if (!socket) return;
    socket.off('incoming-call');
    socket.off('call-ended');
    socket.off('peer-joined');
    socket.off('peer-left');
    socket.off('webrtc-offer');
    socket.off('webrtc-answer');
    socket.off('webrtc-ice-candidate');
    socket.off('peer-toggle-audio');
    socket.off('peer-toggle-video');
    socket.off('appointment-updated');
    socket.off('consent-granted');
    socket.off('access-request-approved');
    socket.off('appointment-booked');
    socket.off('emergency-status-updated');
    socket.off('emergency-accepted');
  },
};

export default socketService;
