/**
 * Emergency Request Screen
 * Create emergency medical request with location
 * Shows live status when emergency is active/accepted
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

import { usePatient } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';
import { emergencyAPI } from '../../services/api';
import socketService from '../../services/socketService';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../../styles/theme';

import {
  Avatar,
  Button,
  Input,
  Card,
  Header,
  Loading,
} from '../../components/common';

import Icon from '../../components/Icon';

const EmergencyRequestScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const { createEmergencyRequest } = usePatient();
  const { user } = useAuth();

  const [urgency, setUrgency] = useState('high');
  const [symptoms, setSymptoms] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [checkingActive, setCheckingActive] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  // Get actual device location + check active emergency on mount
  useEffect(() => {
    checkActiveEmergency();
    getUserLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkActiveEmergency();
    }, [])
  );

  // Listen for real-time emergency updates via socket
  useEffect(() => {
    let interval = null;

    const handleAccepted = (data) => {
      setActiveEmergency(prev =>
        prev
          ? { ...prev, status: 'accepted', acceptedAt: data.acceptedAt }
          : prev
      );
      setDoctorInfo(data.doctor);
      checkActiveEmergency();
    };

    const handleStatusUpdate = (data) => {
      setActiveEmergency(prev => prev ? { ...prev, status: data.status } : prev);
      if (data.status === 'completed' || data.status === 'cancelled') {
        Alert.alert(
          'Emergency Update',
          data.status === 'completed'
            ? 'Your emergency request has been completed.'
            : 'Your emergency request has been cancelled.',
          [{ text: 'OK', onPress: () => { setActiveEmergency(null); setDoctorInfo(null); } }]
        );
      }
    };

    const registerListeners = () => {
      const socket = socketService.getSocket?.();
      if (!socket) return false;

      socket.off('emergency-accepted', handleAccepted);
      socket.off('emergency-status-updated', handleStatusUpdate);
      socket.off('connect', registerListeners);

      socket.on('emergency-accepted', handleAccepted);
      socket.on('emergency-status-updated', handleStatusUpdate);
      socket.on('connect', registerListeners);

      return true;
    };

    if (!registerListeners()) {
      interval = setInterval(() => {
        if (registerListeners()) {
          clearInterval(interval);
          interval = null;
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      const socket = socketService.getSocket?.();
      if (socket) {
        socket.off('emergency-accepted', handleAccepted);
        socket.off('emergency-status-updated', handleStatusUpdate);
        socket.off('connect', registerListeners);
      }
    };
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } else {
        const cityCoords = getCityCoords(user?.address?.city);
        setUserLocation(cityCoords);
      }
    } catch (err) {
      const cityCoords = getCityCoords(user?.address?.city);
      setUserLocation(cityCoords);
    }
  };

  const getCityCoords = (city) => {
    const coords = {
      'trichy': { latitude: 10.7905, longitude: 78.7047 },
      'tiruchirappalli': { latitude: 10.7905, longitude: 78.7047 },
      'chennai': { latitude: 13.0827, longitude: 80.2707 },
      'mumbai': { latitude: 19.0760, longitude: 72.8777 },
      'bangalore': { latitude: 12.9716, longitude: 77.5946 },
      'bengaluru': { latitude: 12.9716, longitude: 77.5946 },
      'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
      'delhi': { latitude: 28.7041, longitude: 77.1025 },
      'coimbatore': { latitude: 11.0168, longitude: 76.9558 },
      'madurai': { latitude: 9.9252, longitude: 78.1198 },
      'tirupati': { latitude: 13.6288, longitude: 79.4192 },
      'kochi': { latitude: 9.9312, longitude: 76.2673 },
    };
    const key = (city || '').toLowerCase().trim();
    return coords[key] || { latitude: 13.0827, longitude: 80.2707 };
  };

  const checkActiveEmergency = async () => {
    try {
      const res = await emergencyAPI.getActiveEmergency();
      if (res.success && res.emergency) {
        setActiveEmergency(res.emergency);
        if (res.doctor) {
          setDoctorInfo(res.doctor);
        }
      }
    } catch (err) {
      console.error('Error checking active emergency:', err);
    } finally {
      setCheckingActive(false);
    }
  };

  const handleCancelActive = () => {
    Alert.alert(
      'Cancel Emergency',
      'Are you sure you want to cancel your emergency request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await emergencyAPI.cancelEmergency(activeEmergency._id);
              setActiveEmergency(null);
              setDoctorInfo(null);
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel emergency request');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const urgencyLevels = [
    { id: 'high', label: 'Critical', icon: 'alert-triangle', color: colors.danger[500] },
    { id: 'medium', label: 'Moderate', icon: 'warning', color: colors.warning[500] },
    { id: 'low', label: 'Low', icon: 'info', color: colors.primary[500] },
  ];

  const handleSubmit = async () => {
    if (!symptoms.trim()) {
      Alert.alert('Error', 'Please describe your symptoms');
      return;
    }

    Alert.alert(
      'Confirm Emergency Request',
      'An emergency request will be sent to nearby doctors. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const loc = userLocation || getCityCoords(user?.address?.city);
            const response = await createEmergencyRequest({
              urgency,
              symptoms,
              description,
              location: {
                latitude: loc.latitude,
                longitude: loc.longitude,
                address: user?.address?.city || 'Current Location',
              },
            });
            setLoading(false);

            if (response?.success) {
              setActiveEmergency(response.request || response.emergency);
            } else {
              Alert.alert('Error', response?.message || 'Failed to send request');
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeSince = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  if (checkingActive) {
    return <Loading fullScreen text="Checking..." />;
  }

  // ============================================
  // ACTIVE EMERGENCY VIEW
  // ============================================
  if (activeEmergency) {
    const isAccepted = activeEmergency.status === 'accepted' || activeEmergency.status === 'in_progress';
    const isPending = activeEmergency.status === 'pending';

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          title="Emergency Status"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
        />
        <ScrollView
          style={styles.container}
          contentContainerStyle={isWeb && styles.webScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.activeContent}>
            {/* Status Banner */}
            <View style={[
              styles.statusBanner,
              isPending && styles.statusBannerPending,
              isAccepted && styles.statusBannerAccepted,
            ]}>
              <Icon
                name={isPending ? 'clock' : 'check'}
                size={32}
                color={isPending ? colors.warning[600] : colors.success[600]}
              />
              <Text style={[
                styles.statusTitle,
                isPending && { color: colors.warning[700] },
                isAccepted && { color: colors.success[700] },
              ]}>
                {isPending ? 'Waiting for a Doctor...' : 'Doctor Accepted!'}
              </Text>
              <Text style={styles.statusSubtext}>
                {isPending
                  ? 'Your emergency request has been sent to nearby doctors. Please wait.'
                  : 'A doctor has accepted your emergency request.'}
              </Text>
              {isPending && (
                <ActivityIndicator
                  size="small"
                  color={colors.warning[500]}
                  style={{ marginTop: spacing.sm }}
                />
              )}
            </View>

            {/* Emergency Details */}
            <Card style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Emergency Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[
                  styles.statusChip,
                  isPending && { backgroundColor: colors.warning[100] },
                  isAccepted && { backgroundColor: colors.success[100] },
                ]}>
                  <Text style={[
                    styles.statusChipText,
                    isPending && { color: colors.warning[700] },
                    isAccepted && { color: colors.success[700] },
                  ]}>
                    {activeEmergency.status?.charAt(0).toUpperCase() + activeEmergency.status?.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Urgency</Text>
                <Text style={[styles.detailValue, {
                  color: activeEmergency.urgency === 'high' ? colors.danger[500]
                    : activeEmergency.urgency === 'medium' ? colors.warning[500]
                    : colors.primary[500],
                }]}>
                  {activeEmergency.urgency?.charAt(0).toUpperCase() + activeEmergency.urgency?.slice(1)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>
                  {formatTime(activeEmergency.createdAt)} ({getTimeSince(activeEmergency.createdAt)})
                </Text>
              </View>
              {activeEmergency.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Symptoms</Text>
                  <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]} numberOfLines={3}>
                    {activeEmergency.description}
                  </Text>
                </View>
              )}
            </Card>

            {/* Doctor Info (when accepted) */}
            {isAccepted && doctorInfo && (
              <Card style={styles.doctorCard}>
                <Text style={styles.detailCardTitle}>Assigned Doctor</Text>
                <View style={styles.doctorRow}>
                  <Avatar
                    source={{ uri: doctorInfo.avatar }}
                    size={60}
                    name={doctorInfo.name}
                  />
                  <View style={styles.doctorDetails}>
                    <Text style={styles.doctorName}>{doctorInfo.name}</Text>
                    {doctorInfo.specialization ? (
                      <Text style={styles.doctorSpec}>{doctorInfo.specialization}</Text>
                    ) : null}
                    {doctorInfo.experience ? (
                      <Text style={styles.doctorExp}>{doctorInfo.experience}+ years experience</Text>
                    ) : null}
                    {doctorInfo.city ? (
                      <View style={styles.doctorLocationRow}>
                        <Icon name="map-pin" size={12} color={colors.gray[500]} />
                        <Text style={styles.doctorCity}>{doctorInfo.city}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {activeEmergency.acceptedAt && (
                  <View style={styles.acceptedTimeRow}>
                    <Icon name="check" size={16} color={colors.success[500]} />
                    <Text style={styles.acceptedTimeText}>
                      Accepted at {formatTime(activeEmergency.acceptedAt)} ({getTimeSince(activeEmergency.acceptedAt)})
                    </Text>
                  </View>
                )}

                {doctorInfo.phone ? (
                  <View style={styles.contactRow}>
                    <Icon name="phone" size={16} color={colors.primary[500]} />
                    <Text style={styles.contactText}>{doctorInfo.phone}</Text>
                  </View>
                ) : null}
              </Card>
            )}

            {/* Actions */}
            <View style={styles.actionSection}>
              <Button
                variant="danger"
                fullWidth
                onPress={handleCancelActive}
                loading={loading}
              >
                Cancel Emergency
              </Button>
              <Button
                variant="outline"
                fullWidth
                onPress={() => navigation.goBack()}
                style={{ marginTop: spacing.md }}
              >
                Go Back
              </Button>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================
  // CREATE EMERGENCY FORM
  // ============================================
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Emergency Request"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={isWeb && styles.webScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning */}
        <Card style={styles.warningCard}>
          <Icon name="alert-triangle" size={40} color={colors.danger[600]} />
          <Text style={styles.warningTitle}>Emergency Medical Assistance</Text>
          <Text style={styles.warningText}>
            Use this only for urgent medical situations.
            For life-threatening emergencies, call 108.
          </Text>
        </Card>

        {/* Urgency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Urgency Level</Text>
          <View style={styles.urgencyGrid}>
            {urgencyLevels.map(level => {
              const isActive = urgency === level.id;
              return (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.urgencyCard,
                    isActive && { borderColor: level.color, backgroundColor: `${level.color}15` },
                  ]}
                  onPress={() => setUrgency(level.id)}
                >
                  <Icon
                    name={level.icon}
                    size={28}
                    color={isActive ? level.color : colors.gray[500]}
                  />
                  <Text style={[styles.urgencyLabel, isActive && { color: level.color }]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Symptoms */}
        <View style={styles.section}>
          <Input
            label="Symptoms *"
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder="Describe your symptoms..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <Input
            label="Additional Details"
            value={description}
            onChangeText={setDescription}
            placeholder="Any other information..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Location */}
        <Card style={styles.locationCard}>
          <Icon name="map-pin" size={32} color={colors.primary[500]} />
          <Text style={styles.locationTitle}>Your Location</Text>
          <Text style={styles.locationText}>
            {userLocation
              ? 'Your current location will be shared with nearby doctors'
              : 'Getting your location...'}
          </Text>
        </Card>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <View style={isWeb && styles.bottomActionInner}>
          <Button
            onPress={handleSubmit}
            loading={loading}
            variant="danger"
            fullWidth
            size="lg"
          >
            Send Emergency Request
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.gray[50] },
  webScrollContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingBottom: 120,
  },

  // Warning card
  warningCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.danger[50],
    borderLeftWidth: 4,
    borderLeftColor: colors.danger[500],
    alignItems: 'center',
  },
  warningTitle: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.danger[700],
  },
  warningText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.danger[600],
    textAlign: 'center',
  },

  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.md,
    color: colors.gray[900],
  },

  urgencyGrid: { flexDirection: 'row', gap: spacing.md },
  urgencyCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  urgencyLabel: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[700],
  },

  locationCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  locationTitle: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
  },
  locationText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
  },

  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.xl,
  },
  bottomActionInner: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },

  // ============================================
  // ACTIVE EMERGENCY STYLES
  // ============================================
  activeContent: {
    padding: spacing.lg,
  },

  statusBanner: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  statusBannerPending: {
    backgroundColor: colors.warning[50],
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  statusBannerAccepted: {
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: colors.success[200],
  },
  statusTitle: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  statusSubtext: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 20,
  },

  detailCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailCardTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[600],
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
  },

  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusChipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    textTransform: 'uppercase',
  },

  // Doctor card
  doctorCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success[200],
    backgroundColor: colors.success[50],
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  doctorDetails: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  doctorName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
  },
  doctorSpec: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[600],
    marginTop: 2,
  },
  doctorExp: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginTop: 2,
  },
  doctorLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  doctorCity: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
  },

  acceptedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.success[200],
    marginBottom: spacing.sm,
  },
  acceptedTimeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.success[700],
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[600],
  },

  actionSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});

export default EmergencyRequestScreen;
