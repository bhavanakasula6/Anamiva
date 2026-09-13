/**
 * Doctor Home Screen
 * Main dashboard for doctors with modern UI
 */

import { useMemo, useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar, Badge, Card, IconButton, Loading } from '../../components/common';
import Icon from '../../components/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { useDoctor } from '../../contexts/DoctorContext';
import { APPOINTMENT_STATUS, APPOINTMENT_TYPES, CALL_STATUS } from '../../data/constants';
import { appointmentAPI } from '../../services/api';
import theme from '../../styles/theme';
const { colors, typography, spacing, borderRadius, shadows } = theme;

const DoctorHomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const isDesktop = width >= 1100;
  const {
    appointments,
    analytics,
    activeEmergency,
    pendingRecords,
    loadActiveEmergency,
    loadAppointments,
    loadPendingRecords,
    loading,
  } = useDoctor();

  // Refresh data on screen focus (appointments + emergency)
  useFocusEffect(
    useCallback(() => {
      loadActiveEmergency();
      loadAppointments();
      loadPendingRecords();
    }, [])
  );
  const APPOINTMENT_TYPE_LABELS = {
    [APPOINTMENT_TYPES.ONLINE]: 'Online',
    [APPOINTMENT_TYPES.IN_PERSON]: 'Clinic',
    'in-person': 'Clinic',
  };
  const ALLOWED_TODAY_STATUSES = [
    APPOINTMENT_STATUS.PENDING,
    APPOINTMENT_STATUS.UPCOMING,
  ];

  const STATUS_BADGE_CONFIG = {
    [APPOINTMENT_STATUS.PENDING]: {
      label: 'Pending',
      variant: 'warning',
    },
    [APPOINTMENT_STATUS.UPCOMING]: {
      label: 'Upcoming',
      variant: 'success',
    },
  };

  const todayAppointments = useMemo(() => {
    const today = new Date().toDateString();

    return appointments.filter(apt => {
      const isToday =
        new Date(apt.date).toDateString() === today;

      const isAllowedStatus =
        ALLOWED_TODAY_STATUSES.includes(apt.status);

      return isToday && isAllowedStatus;
    });
  }, [appointments]);

  if (loading) {
    return <Loading fullScreen />;
  }

  const uniqueTodayPatients = new Set(
    todayAppointments.map(a => a.patient?.id)
  ).size;

  const revenue = analytics?.today?.revenue ?? 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={isWeb && styles.webScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome Back,</Text>
            <Text style={styles.userName}>
              {user?.fullName || 'Doctor'}
            </Text>
            <Text style={styles.specialization}>{user?.specialization || 'General Physician'}</Text>
          </View>
          <IconButton
            icon="bell"
            onPress={() => navigation.navigate('Notifications')}
            color="primary"
            size={55}
          />

        </View>

        {/* Today's Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{"Today's Overview"}</Text>
          <View style={[styles.statsGrid, isTabletUp && styles.statsGridWide]}>
            <StatCard
              title="Appointments"
              value={todayAppointments.length}
              icon="calendar"
              color={colors.primary[500]}
            />
            <StatCard
              title="Patients"
              value={uniqueTodayPatients}
              icon="users"
              color={colors.success[500]}
            />
            <StatCard
              title="Revenue"
              value={`₹${analytics?.today?.revenue || 0}`}
              icon="wallet"
              color={colors.warning[500]}
            />
          </View>
        </View>

        {/* Active Emergency */}
        {activeEmergency && (
          <View style={styles.section}>
            <Card
              style={[styles.appointmentCard, { borderLeftWidth: 4, borderLeftColor: colors.danger[500], backgroundColor: colors.danger[50] }]}
              onPress={() => navigation.navigate('EmergencyList')}
            >
              <View style={styles.appointmentHeader}>
                <View style={[styles.actionIcon, { backgroundColor: colors.danger[100], width: 50, height: 50, borderRadius: 25 }]}>
                  <Icon name="alert-triangle" size={24} color={colors.danger[500]} />
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.patientName}>
                    {activeEmergency.patientId?.fullName || activeEmergency.patientId?.name || 'Patient'}
                  </Text>
                  <Text style={styles.appointmentTime}>
                    {activeEmergency.description || 'Emergency request'}
                  </Text>
                  <Badge variant="danger" size="sm">{activeEmergency.status}</Badge>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, isTabletUp && styles.actionCardTablet, isDesktop && styles.actionCardDesktop]}
              onPress={() => navigation.navigate('DoctorAppointmentsList')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
                <Icon name="calendar" size={28} color={colors.primary[500]} />
              </View>
              <Text style={styles.actionText}>Appointments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, isTabletUp && styles.actionCardTablet, isDesktop && styles.actionCardDesktop]}
              onPress={() => navigation.navigate('EmergencyList')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.danger[50] }]}>
                <Icon name="alert-triangle" size={28} color={colors.danger[500]} />
              </View>
              <Text style={styles.actionText}>Emergency</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, isTabletUp && styles.actionCardTablet, isDesktop && styles.actionCardDesktop]}
              onPress={() => navigation.navigate('AnalyticsMain')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success[50] }]}>
                <Icon name="bar-chart" size={28} color={colors.success[500]} />
              </View>
              <Text style={styles.actionText}>Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, isTabletUp && styles.actionCardTablet, isDesktop && styles.actionCardDesktop]}
              onPress={() => navigation.navigate('AllPatientRecords')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.warning[50] }]}>
                <Icon name="file-text" size={28} color={colors.warning[500]} />
              </View>
              <Text style={styles.actionText}>Patient Records</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, isTabletUp && styles.actionCardTablet, isDesktop && styles.actionCardDesktop]}
              onPress={() => navigation.navigate('DoctorRecordVerification')}
            >
              {pendingRecords.length > 0 && (
                <View style={styles.actionBadge}>
                  <Text style={styles.actionBadgeText}>{pendingRecords.length}</Text>
                </View>
              )}
              <View style={[styles.actionIcon, { backgroundColor: colors.warning[50] }]}>
                <Icon name="check-square" size={28} color={colors.warning[500]} />
              </View>
              <Text style={styles.actionText}>Verify Records</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Today's Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{"Today's Appointments"}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorAppointmentsList')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {todayAppointments.length > 0 ? (
            todayAppointments.slice(0, 3).map((appointment, index) => (
              <Card
                key={appointment.id || `apt-${index}`}
                style={styles.appointmentCard}
                onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: appointment.id })}
              >
                <View style={styles.appointmentHeader}>
                  <Avatar
                    source={{ uri: appointment.patient?.avatar }}
                    size={50}
                    name={appointment.patient?.name}
                  />
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.patientName}>{appointment.patient?.name || 'Unknown Patient'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon
                        name="clock"
                        size={14}
                        color={colors.gray[600]}
                        style={{ marginRight: spacing.xs }}
                      />
                      <Text style={styles.appointmentTime}>{appointment.time}</Text>
                    </View>
                    <View style={styles.joinCallContainer}>
                      {appointment.type === APPOINTMENT_TYPES.ONLINE &&
                        appointment.status === APPOINTMENT_STATUS.UPCOMING && (
                          <TouchableOpacity onPress={async () => {
                            if (!appointment.callStatus || appointment.callStatus === CALL_STATUS.IDLE) {
                              try {
                                const res = await appointmentAPI.startCall(appointment.id);
                                if (res.success && res.appointment?.videoCallRoomId) {
                                  navigation.navigate('VideoCall', {
                                    appointmentId: appointment.id,
                                    roomId: res.appointment.videoCallRoomId,
                                    isCaller: true,
                                    otherPartyName: appointment.patient?.name || 'Patient',
                                  });
                                }
                              } catch (err) {
                                console.error('Failed to start call:', err);
                              }
                            } else {
                              navigation.navigate('VideoCall', {
                                appointmentId: appointment.id,
                                roomId: appointment.videoCallRoomId,
                                isCaller: true,
                                otherPartyName: appointment.patient?.name || 'Patient',
                              });
                            }
                          }}>
                            <View style={styles.joinCallContainer}>
                              <Icon name="video" size={14} color={colors.primary[500]} style={{ marginRight: spacing.xs }} />
                              <Text style={styles.joinCallText}>
                                {(!appointment.callStatus || appointment.callStatus === CALL_STATUS.IDLE) ? 'Start Call' : 'Rejoin Call'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                    </View>
                  </View>

                  <View style={styles.badgeColumn}>
                    <Badge
                      variant={STATUS_BADGE_CONFIG[appointment.status]?.variant}
                      size="sm"
                    >
                      {STATUS_BADGE_CONFIG[appointment.status]?.label}
                    </Badge>

                    <Badge variant="neutral" size="sm">
                      {APPOINTMENT_TYPE_LABELS[appointment.type] || 'Clinic'}
                    </Badge>
                  </View>

                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No appointments today</Text>
            </Card>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

//Inner components

const StatCard = ({ title, value, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statIconWrapper}>
      <Icon name={icon} size={32} color={color} />
    </View>
    <View style={styles.statInfo}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.app
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
    ...shadows.sm,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  joinCallContainer: {
    marginTop: spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinCallText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
  },
  greeting: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginTop: spacing.xs,
  },
  specialization: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
    marginTop: spacing.xs / 2,
  },
  notificationButton: {
    padding: spacing.sm,
  },
  notificationIcon: {
    fontSize: 24,
  },
  statsSection: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  statsGrid: {
    gap: spacing.md,
  },
  statsGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statCard: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    ...shadows.sm,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
  },
  statIconWrapper: {
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
    position: 'relative',
  },
  actionCardTablet: {
    width: '31%',
  },
  actionCardDesktop: {
    width: '18.7%',
  },
  actionBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.danger[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionEmoji: {
    fontSize: 30,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
  },
  appointmentCard: {
    marginBottom: spacing.md,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  patientName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
    flexShrink: 1,
  },
  appointmentTime: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default DoctorHomeScreen;
