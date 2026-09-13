import { useEffect, useState, useCallback } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Avatar, Card, EmptyState, Header } from '../../components/common';
import Icon from '../../components/Icon';
import { useDoctor } from '../../contexts/DoctorContext';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';

const EmergencyListScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const {
    emergencyRequests,
    activeEmergency,
    loadNearbyEmergencies,
    loadActiveEmergency,
    acceptEmergencyRequest,
  } = useDoctor();

  const [refreshing, setRefreshing] = useState(false);

  const loadEmergencies = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        await loadNearbyEmergencies(loc.coords.latitude, loc.coords.longitude);
      } else {
        await loadNearbyEmergencies(19.076, 72.8777);
      }
    } catch {
      await loadNearbyEmergencies(19.076, 72.8777);
    }
  }, []);

  useEffect(() => {
    loadEmergencies();
  }, []);

  // Reload active emergency on screen focus
  useFocusEffect(
    useCallback(() => {
      loadActiveEmergency();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmergencies();
    setRefreshing(false);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high':
        return colors.danger[500];
      case 'medium':
        return colors.warning[500];
      case 'low':
        return colors.success[500];
      default:
        return colors.gray[500];
    }
  };

  const getUrgencyLabel = (urgency) => {
    return urgency.charAt(0).toUpperCase() + urgency.slice(1);
  };

  const [accepting, setAccepting] = useState(null);

  const getTimeSince = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  const handleAccept = async (requestId) => {
    Alert.alert(
      'Accept Emergency',
      'Are you sure you want to accept this emergency request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAccepting(requestId);
            const res = await acceptEmergencyRequest(requestId);
            setAccepting(null);

            if (!res?.success) {
              Alert.alert('Error', res?.message || 'Failed to accept emergency. It may have been accepted by another doctor.');
              // Refresh the list
              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                  const loc = await Location.getCurrentPositionAsync({});
                  loadNearbyEmergencies(loc.coords.latitude, loc.coords.longitude);
                }
              } catch {}
              return;
            }

            await loadEmergencies();
            Alert.alert('Success', 'You have accepted the emergency request. The patient has been notified.');
          },
        },
      ]
    );
  };

  // Map backend data to display format
  const getPatientInfo = (request) => {
    // Backend populates patientId with user fields
    const patient = request.patientId || request.patient || {};
    const name = patient.fullName
      || patient.name
      || (patient.firstName ? `${patient.firstName} ${patient.lastName || ''}`.trim() : null)
      || 'Unknown Patient';
    return {
      name,
      avatar: patient.profilePicture || patient.avatar || '',
      phone: patient.phoneNumber || '',
      city: patient.address?.city || '',
      location: request.location?.address || '',
    };
  };

  const EmergencyCard = ({ request }) => {
    const patient = getPatientInfo(request);
    const requestId = request._id || request.id;

    return (
      <Card style={[styles.requestCard, isTabletUp && styles.requestCardWide]}>
        {/* Urgency Badge */}
        <View style={styles.urgencyBadge}>
          <View
            style={[
              styles.urgencyIndicator,
              { backgroundColor: getUrgencyColor(request.urgency) },
            ]}
          />
          <Text
            style={[
              styles.urgencyText,
              { color: getUrgencyColor(request.urgency) },
            ]}
          >
            {getUrgencyLabel(request.urgency || 'medium')} Priority
          </Text>
          <Text style={styles.timeAgo}>{getTimeSince(request.createdAt)}</Text>
        </View>

        {/* Patient Info */}
        <View style={styles.patientSection}>
          <Avatar
            source={{ uri: patient.avatar }}
            size={60}
            name={patient.name}
          />
          <View style={styles.patientInfo}>
            <Text style={styles.patientName} numberOfLines={1}>{patient.name}</Text>
            {patient.location ? (
              <View style={styles.locationRow}>
                <Icon name="map-pin" size={14} color={colors.primary[600]} />
                <Text style={styles.locationText} numberOfLines={1}>{patient.location}</Text>
              </View>
            ) : null}
            {patient.phone ? (
              <View style={styles.locationRow}>
                <Icon name="phone" size={12} color={colors.gray[500]} />
                <Text style={styles.timeText}>{patient.phone}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Symptoms */}
        <View style={styles.symptomsSection}>
          <Text style={styles.symptomsLabel}>Symptoms:</Text>
          <Text style={styles.symptomsText} numberOfLines={3}>
            {request.description || request.symptoms || 'No description'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton, accepting === requestId && { opacity: 0.6 }]}
            onPress={() => handleAccept(requestId)}
            disabled={accepting === requestId}
          >
            <Icon name="check" size={18} color={colors.white} />
            <Text style={styles.acceptButtonText}>
              {accepting === requestId ? 'Accepting...' : 'Accept Emergency'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Emergency Requests"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        variant="surface"
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={isWeb && styles.webScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Icon
              name="alert-triangle"
              size={22}
              color={colors.danger[600]}
              style={{ marginRight: spacing.sm }}
            />

            <Text style={styles.infoBannerText}>
              You have {emergencyRequests?.length || 0} pending emergency requests nearby
            </Text>
          </View>

          {/* Active/Accepted Emergency Card */}
          {activeEmergency && (
            <Card style={styles.acceptedCard}>
              <View style={styles.acceptedHeader}>
                <Icon name="check" size={24} color={colors.success[600]} />
                <Text style={styles.acceptedTitle}>Emergency Accepted</Text>
              </View>

              <View style={styles.patientSection}>
                <Avatar
                  source={{ uri: activeEmergency.patientId?.profilePicture || activeEmergency.patientId?.avatar }}
                  size={60}
                  name={activeEmergency.patientId?.fullName || activeEmergency.patientId?.name || 'Patient'}
                />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>
                    {activeEmergency.patientId?.fullName || activeEmergency.patientId?.name || 'Patient'}
                  </Text>
                  {activeEmergency.patientId?.address?.city ? (
                    <View style={styles.locationRow}>
                      <Icon name="map-pin" size={14} color={colors.primary[600]} />
                      <Text style={styles.locationText}>{activeEmergency.patientId.address.city}</Text>
                    </View>
                  ) : null}
                  {activeEmergency.patientId?.phoneNumber ? (
                    <View style={styles.locationRow}>
                      <Icon name="phone" size={12} color={colors.gray[500]} />
                      <Text style={styles.timeText}>{activeEmergency.patientId.phoneNumber}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {activeEmergency.description && (
                <View style={styles.symptomsSection}>
                  <Text style={styles.symptomsLabel}>Symptoms:</Text>
                  <Text style={styles.symptomsText}>{activeEmergency.description}</Text>
                </View>
              )}

              <View style={styles.acceptedTimeRow}>
                <Icon name="clock" size={14} color={colors.success[600]} />
                <Text style={styles.acceptedTimeText}>
                  Accepted at {new Date(activeEmergency.acceptedAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </Card>
          )}

          {/* Emergency Requests */}
          {emergencyRequests?.length > 0 ? (
            <View style={[styles.requestGrid, isTabletUp && styles.requestGridWide]}>
              {emergencyRequests.map(request => (
                <EmergencyCard key={request._id || request.id} request={request} />
              ))}
            </View>
          ) : (
            !activeEmergency && (
              <EmptyState
                icon={
                  <Icon
                    name="alert-triangle"
                    size={48}
                    color={colors.danger[400]}
                  />
                }
                title="No Emergency Requests"
                message="There are no emergency requests at the moment"
              />
            )
          )}
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
  webScrollContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingBottom: spacing['2xl'],
  },
  content: {
    padding: spacing.lg,
  },
  requestGrid: {
    width: '100%',
  },
  requestGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger[500],
  },
  infoBannerIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.danger[700],
  },
  requestCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  requestCardWide: {
    flexBasis: 360,
    flexGrow: 1,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  urgencyIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  urgencyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    textTransform: 'uppercase',
  },
  timeAgo: {
    marginLeft: 'auto',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500],
  },
  patientSection: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  patientInfo: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  patientName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    flexShrink: 1,
  },
  patientDetails: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    marginTop: spacing.xs / 2,
    flexShrink: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  locationIcon: {
    fontSize: 14,
    marginRight: spacing.xs / 2,
  },
  locationText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[600],
    flexShrink: 1,
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500],
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  symptomsSection: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  symptomsLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  symptomsText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[900],
  },
  actionsSection: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger[500],
  },
  acceptButton: {
    backgroundColor: colors.success[500],
    flexDirection: 'row',
    gap: spacing.xs,
    ...shadows.sm,
  },
  rejectButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.danger[500],
  },
  acceptButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  acceptedCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success[300],
    backgroundColor: colors.success[50],
    ...shadows.md,
  },
  acceptedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  acceptedTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.success[700],
  },
  acceptedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.success[200],
  },
  acceptedTimeText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.success[700],
  },
});

export default EmergencyListScreen;
