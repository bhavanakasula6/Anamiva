/**
 * Video Call Screen
 * Full-screen WebRTC video call with local/remote video, controls, and timer
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from '../../components/Icon';
import { Button, Header } from '../../components/common';
import { appointmentAPI } from '../../services/api';
import socketService from '../../services/socketService';
import { colors, typography, spacing } from '../../styles/theme';

// Dynamic imports for native modules (not available in Expo Go)
let RTCPeerConnection, RTCView, mediaDevices, InCallManager;
let isNativeAvailable = false;

if (Platform.OS !== 'web') {
  try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCView = webrtc.RTCView;
    mediaDevices = webrtc.mediaDevices;
    InCallManager = require('react-native-incall-manager').default;
    isNativeAvailable = true;
  } catch (_e) {
    // Native modules not available (Expo Go/development build missing native deps)
  }
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

const VideoCallFallback = ({ navigation }) => (
  <SafeAreaView style={styles.fallbackContainer}>
    <Header
      title="Video Call"
      leftIcon="back"
      onLeftPress={() => navigation.goBack()}
      variant="surface"
    />
    <View style={styles.fallbackContent}>
      <Icon name="video" size={48} color={colors.gray[400]} />
      <Text style={styles.fallbackTitle}>Video Calls Unavailable</Text>
      <Text style={styles.fallbackText}>
        {Platform.OS === 'web'
          ? 'Video calls need a browser WebRTC implementation. This screen is parked until the web video-call flow is wired.'
          : 'Video calls require a development build.\nRun: npx expo prebuild\nThen: npx expo run:ios'}
      </Text>
      <Button onPress={() => navigation.goBack()}>Go Back</Button>
    </View>
  </SafeAreaView>
);

const NativeVideoCallScreen = ({ route, navigation }) => {
  const {
    appointmentId = '',
    roomId = '',
    isCaller = false,       // true for doctor (starts call), false for patient (joins)
    otherPartyName = 'Participant',
  } = route.params || {};

  // State
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState('connecting'); // connecting | ringing | connected | ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [peerMuted, setPeerMuted] = useState(false);
  const [peerVideoOff, setPeerVideoOff] = useState(false);

  // Refs
  const peerConnection = useRef(null);
  const timerRef = useRef(null);
  const isCleanedUp = useRef(false);

  // Format duration (seconds → mm:ss)
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Start call timer
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop call timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Initialize media stream
  const initLocalStream = useCallback(async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      Alert.alert('Camera Error', 'Unable to access camera or microphone.');
      return null;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to the connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setCallState('connected');
        startTimer();
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendIceCandidate(roomId, event.candidate);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          setCallState('connected');
          break;
        case 'disconnected':
        case 'failed':
          handleEndCall();
          break;
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [roomId, startTimer]);

  // Handle creating and sending an offer (caller/doctor)
  const createOffer = useCallback(async (pc) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketService.sendOffer(roomId, offer);
      setCallState('ringing');
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }, [roomId]);

  // Handle receiving an offer and sending answer (callee/patient)
  const handleOffer = useCallback(async (pc, offer) => {
    try {
      if (!pc) return;
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.sendAnswer(roomId, answer);
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  }, [roomId]);

  // Handle receiving an answer (caller/doctor)
  const handleAnswer = useCallback(async (answer) => {
    try {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(answer);
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }, []);

  // Handle ICE candidate from remote peer
  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(candidate);
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }, []);

  // End call
  const handleEndCall = useCallback(async () => {
    if (isCleanedUp.current) return;
    isCleanedUp.current = true;

    setCallState('ended');
    stopTimer();

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Leave socket room
    socketService.leaveCallRoom(roomId);

    // Stop in-call manager
    InCallManager.stop();

    // Notify backend
    try {
      await appointmentAPI.endCall(appointmentId);
    } catch (err) {
      console.error('Error ending call on backend:', err);
    }

    // Navigate back after a brief delay
    setTimeout(() => {
      navigation.goBack();
    }, 1500);
  }, [localStream, roomId, appointmentId, navigation, stopTimer]);

  // Toggle microphone
  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      socketService.toggleAudio(roomId, !audioTrack.enabled);
    }
  }, [localStream, roomId]);

  // Toggle camera
  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
      socketService.toggleVideo(roomId, !videoTrack.enabled);
    }
  }, [localStream, roomId]);

  // Switch front/back camera
  const switchCamera = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack._switchCamera();
      setIsFrontCamera((prev) => !prev);
    }
  }, [localStream]);

  // Connection timeout — if no remote stream after 30s, show error
  useEffect(() => {
    if (callState !== 'connecting' && callState !== 'ringing') return;
    const timeout = setTimeout(() => {
      if (!remoteStream && !isCleanedUp.current) {
        Alert.alert(
          'Connection Failed',
          'Could not connect to the other party. Please check your internet connection and try again.',
          [{ text: 'OK', onPress: () => handleEndCall() }]
        );
      }
    }, 30000);
    return () => clearTimeout(timeout);
  }, [callState, remoteStream]);

  // Initialize everything on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Start in-call manager (handles audio routing)
      InCallManager.start({ media: 'video' });
      InCallManager.setForceSpeakerphoneOn(true);

      // Get local media
      const stream = await initLocalStream();
      if (!stream || !mounted) return;

      // Create peer connection first
      const pc = createPeerConnection(stream);

      // Set up socket event listeners BEFORE joining room
      socketService.onOffer(({ offer }) => {
        handleOffer(pc, offer);
      });

      socketService.onAnswer(({ answer }) => {
        handleAnswer(answer);
      });

      socketService.onIceCandidate(({ candidate }) => {
        handleIceCandidate(candidate);
      });

      socketService.onPeerJoined(({ role }) => {
        // When peer joins (and we're the caller), send offer
        if (isCaller && peerConnection.current) {
          createOffer(peerConnection.current);
        }
      });

      socketService.onPeerLeft(() => {
        if (!isCleanedUp.current) {
          handleEndCall();
        }
      });

      socketService.onCallEnded(() => {
        if (!isCleanedUp.current) {
          handleEndCall();
        }
      });

      socketService.onPeerToggleAudio(({ isMuted: muted }) => {
        setPeerMuted(muted);
      });

      socketService.onPeerToggleVideo(({ isVideoOff: videoOff }) => {
        setPeerVideoOff(videoOff);
      });

      // Join socket room AFTER listeners are set up
      socketService.joinCallRoom(roomId, appointmentId, isCaller ? 'doctor' : 'patient');

      // If caller, wait for peer to join (offer will be sent when peer-joined event fires)
      if (isCaller) {
        setCallState('ringing');
      }
    };

    init();

    return () => {
      mounted = false;
      if (!isCleanedUp.current) {
        isCleanedUp.current = true;
        stopTimer();
        if (peerConnection.current) {
          peerConnection.current.close();
          peerConnection.current = null;
        }
        socketService.leaveCallRoom(roomId);
        socketService.removeAllListeners();
        InCallManager.stop();
      }
    };
  }, []);

  // Render call state overlay
  const renderOverlay = () => {
    if (callState === 'connected') return null;

    const messages = {
      connecting: 'Connecting...',
      ringing: isCaller ? `Calling ${otherPartyName || 'Patient'}...` : 'Connecting...',
      ended: 'Call Ended',
    };

    return (
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>{messages[callState]}</Text>
        {callState === 'ended' && callDuration > 0 && (
          <Text style={styles.overlaySubtext}>Duration: {formatDuration(callDuration)}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Remote Video (full screen) */}
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        <View style={styles.remoteVideoPlaceholder}>
          <Icon name="video-off" size={48} color={colors.gray[400]} />
        </View>
      )}

      {/* Remote peer indicators */}
      {callState === 'connected' && (peerMuted || peerVideoOff) && (
        <View style={styles.peerIndicators}>
          {peerMuted && (
            <View style={styles.peerIndicator}>
              <Icon name="mic-off" size={14} color={colors.white} />
            </View>
          )}
          {peerVideoOff && (
            <View style={styles.peerIndicator}>
              <Icon name="video-off" size={14} color={colors.white} />
            </View>
          )}
        </View>
      )}

      {/* Local Video (PiP) */}
      {localStream && !isVideoOff && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={isFrontCamera}
            zOrder={1}
          />
        </View>
      )}

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={styles.topBarContent}>
          <View>
            <Text style={styles.peerName}>{otherPartyName || (isCaller ? 'Patient' : 'Doctor')}</Text>
            {callState === 'connected' && (
              <Text style={styles.timer}>{formatDuration(callDuration)}</Text>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Overlay (connecting/ringing/ended) */}
      {renderOverlay()}

      {/* Bottom Controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlActive]}
            onPress={toggleMute}
          >
            <Icon name={isMuted ? 'mic-off' : 'mic'} size={24} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isVideoOff && styles.controlActive]}
            onPress={toggleVideo}
          >
            <Icon name={isVideoOff ? 'video-off' : 'video'} size={24} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={switchCamera}
          >
            <Icon name="refresh-cw" size={24} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Icon name="phone-off" size={28} color={colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  remoteVideo: {
    flex: 1,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  localVideoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  localVideo: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  peerName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  timer: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[300],
    marginTop: 2,
  },
  peerIndicators: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  peerIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
  },
  overlayText: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  overlaySubtext: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[300],
    marginTop: spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  endCallButton: {
    backgroundColor: colors.danger[500],
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  fallbackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  fallbackTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginTop: spacing.md,
  },
  fallbackText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
});

const VideoCallScreen = (props) => {
  if (!isNativeAvailable) {
    return <VideoCallFallback navigation={props.navigation} />;
  }

  return <NativeVideoCallScreen {...props} />;
};

export default VideoCallScreen;
