import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from '../../components/Icon';
import { Button, Header } from '../../components/common';
import { appointmentAPI } from '../../services/api';
import socketService from '../../services/socketService';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

const VideoCallScreen = ({ route, navigation }) => {
  const { appointmentId = '', roomId = '', isCaller = false, otherPartyName = 'Participant' } = route.params || {};
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const cleanedUpRef = useRef(false);
  const timerRef = useRef(null);
  const [callState, setCallState] = useState('connecting');
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [peerMuted, setPeerMuted] = useState(false);
  const [peerVideoOff, setPeerVideoOff] = useState(false);
  const [error, setError] = useState('');

  const formatDuration = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);
  const startTimer = useCallback(() => {
    if (!timerRef.current) timerRef.current = setInterval(() => setCallDuration(value => value + 1), 1000);
  }, []);
  const flushCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc?.remoteDescription) return;
    const candidates = pendingCandidatesRef.current.splice(0);
    await Promise.all(candidates.map(candidate => pc.addIceCandidate(candidate).catch(() => null)));
  }, []);

  const endCall = useCallback(async () => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;
    setCallState('ended');
    stopTimer();
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    socketService.leaveCallRoom(roomId);
    socketService.removeVideoCallListeners();
    try { await appointmentAPI.endCall(appointmentId); } catch (_error) { /* Local cleanup still succeeds. */ }
    navigation.goBack();
  }, [appointmentId, navigation, roomId, stopTimer]);

  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState !== 'stable') return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketService.sendOffer(roomId, offer);
      setCallState('ringing');
    } catch (_error) {
      setError('Unable to start the video call. Please try again.');
    }
  }, [roomId]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!roomId || !appointmentId || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera and microphone need HTTPS or localhost, plus browser permissions.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } });
        if (!mounted) { stream.getTracks().forEach(track => track.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.ontrack = event => {
          const incomingStream = event.streams?.[0];
          if (incomingStream) {
            setRemoteStream(incomingStream);
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = incomingStream;
            setCallState('connected');
            startTimer();
          }
        };
        pc.onicecandidate = event => { if (event.candidate) socketService.sendIceCandidate(roomId, event.candidate); };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') { setCallState('connected'); startTimer(); }
          if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) endCall();
        };

        socketService.onOffer(async ({ offer }) => {
          if (cleanedUpRef.current) return;
          await pc.setRemoteDescription(offer);
          await flushCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketService.sendAnswer(roomId, answer);
        });
        socketService.onAnswer(async ({ answer }) => { await pc.setRemoteDescription(answer); await flushCandidates(); });
        socketService.onIceCandidate(async ({ candidate }) => {
          if (!pc.remoteDescription) pendingCandidatesRef.current.push(candidate);
          else await pc.addIceCandidate(candidate).catch(() => null);
        });
        socketService.onPeerJoined(() => { if (isCaller) createOffer(); });
        socketService.onPeerLeft(() => endCall());
        socketService.onCallEnded(() => endCall());
        socketService.onPeerToggleAudio(({ isMuted: muted }) => setPeerMuted(muted));
        socketService.onPeerToggleVideo(({ isVideoOff: videoOff }) => setPeerVideoOff(videoOff));
        socketService.joinCallRoom(roomId, appointmentId, isCaller ? 'doctor' : 'patient');
        if (isCaller) setCallState('ringing');
      } catch (_error) {
        setError('Camera or microphone access was denied. Allow both permissions and try again.');
      }
    };
    init();
    return () => {
      mounted = false;
      if (!cleanedUpRef.current) {
        cleanedUpRef.current = true;
        stopTimer();
        peerConnectionRef.current?.close();
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        socketService.leaveCallRoom(roomId);
        socketService.removeVideoCallListeners();
      }
    };
  }, [appointmentId, createOffer, endCall, flushCandidates, isCaller, roomId, startTimer, stopTimer]);

  useEffect(() => {
    if (!['connecting', 'ringing'].includes(callState)) return undefined;
    const timeout = setTimeout(() => { if (!remoteStream && !cleanedUpRef.current) endCall(); }, 30000);
    return () => clearTimeout(timeout);
  }, [callState, endCall, remoteStream]);

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
    socketService.toggleAudio(roomId, !track.enabled);
  };
  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoOff(!track.enabled);
    socketService.toggleVideo(roomId, !track.enabled);
  };
  const switchCamera = async () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track?.applyConstraints) return;
    const nextFront = !isFrontCamera;
    try { await track.applyConstraints({ facingMode: nextFront ? 'user' : 'environment' }); setIsFrontCamera(nextFront); } catch (_error) { setError('This camera does not support switching cameras.'); }
  };

  if (error) return (
    <SafeAreaView style={styles.container}>
      <Header title="Video Call" leftIcon="back" onLeftPress={() => navigation.goBack()} />
      <View style={styles.errorContent}><Icon name="video-off" size={48} color={colors.gray[400]} /><Text style={styles.title}>Video call unavailable</Text><Text style={styles.errorText}>{error}</Text><Button onPress={() => navigation.goBack()}>Go Back</Button></View>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      <video ref={remoteVideoRef} autoPlay playsInline style={styles.remoteVideo} />
      {!remoteStream && <View style={styles.placeholder}><Icon name="video-off" size={48} color={colors.gray[400]} /></View>}
      <video ref={localVideoRef} autoPlay muted playsInline style={[styles.localVideo, isVideoOff && styles.hiddenVideo]} />
      <View style={styles.topBar}><Text style={styles.peerName}>{otherPartyName}</Text><Text style={styles.status}>{callState === 'connected' ? formatDuration(callDuration) : callState}</Text>{(peerMuted || peerVideoOff) && <Text style={styles.peerStatus}>{peerMuted ? 'Microphone off' : 'Camera off'}</Text>}</View>
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlActive]} onPress={toggleMute} accessibilityLabel="Mute microphone"><Icon name={isMuted ? 'mic-off' : 'mic'} size={24} color={colors.white} /></TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, isVideoOff && styles.controlActive]} onPress={toggleVideo} accessibilityLabel="Turn camera off"><Icon name={isVideoOff ? 'video-off' : 'video'} size={24} color={colors.white} /></TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={switchCamera} accessibilityLabel="Switch camera"><Icon name="refresh-cw" size={24} color={colors.white} /></TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={endCall} accessibilityLabel="End call"><Icon name="phone-off" size={28} color={colors.white} /></TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: '100vh', backgroundColor: '#111827' },
  remoteVideo: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#111827' },
  localVideo: { position: 'absolute', top: 88, right: 20, width: 180, height: 132, objectFit: 'cover', borderRadius: borderRadius.md, border: `2px solid ${colors.white}`, backgroundColor: colors.gray[900] },
  hiddenVideo: { opacity: 0 },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, padding: spacing.xl, backgroundColor: 'rgba(17, 24, 39, 0.55)' },
  peerName: { color: colors.white, fontSize: typography.fontSize.lg, fontWeight: '600' },
  status: { color: colors.gray[300], fontSize: typography.fontSize.sm, marginTop: 4 },
  peerStatus: { color: colors.warning[300], fontSize: typography.fontSize.xs, marginTop: 4 },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, paddingBottom: spacing['2xl'], backgroundColor: 'rgba(17, 24, 39, 0.65)' },
  controlButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  controlActive: { backgroundColor: 'rgba(255,255,255,0.45)' },
  endCallButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger[500] },
  errorContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.gray[50] },
  title: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.gray[900], textAlign: 'center' },
  errorText: { maxWidth: 520, fontSize: typography.fontSize.sm, lineHeight: 22, color: colors.gray[600], textAlign: 'center', marginBottom: spacing.md },
});

export default VideoCallScreen;
