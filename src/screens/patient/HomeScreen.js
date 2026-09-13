/**
 * Patient Home Screen
 * Main dashboard for patients
 */

import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Platform, View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { usePatient } from '../../contexts/PatientContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme';
import { Card, Avatar, Badge, Button, Loading } from '../../components/common';
import Icon from '../../components/Icon';
import { APPOINTMENT_STATUS } from '../../data/constants';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const isDesktop = width >= 1100;
  const {
    appointments,
    medicalRecords,
    activeMedications,
    notifications,
    loading,
    loadAppointments,
    loadMedicalRecords,
    loadActiveMedications,
    requests,
    loadRequests,
    approveRequest,
    denyRequest,
  } = usePatient();
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [processingRequest, setProcessingRequest] = useState(null);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  useFocusEffect(
    React.useCallback(() => {
      loadAppointments();
      loadMedicalRecords();
      loadActiveMedications();
      loadRequests();
    }, [])
  );

  const getRequestDoctorName = request => {
    const doctor = request.doctorId || {};
    const doctorUser = doctor.userId || {};
    return (
      doctorUser.fullName ||
      doctorUser.name ||
      doctor.fullName ||
      doctor.name ||
      'Doctor'
    );
  };

  const handleApproveRequest = async request => {
    const requestId = request.id || request._id;
    try {
      setProcessingRequest(`approve-${requestId}`);
      await approveRequest(request);
      await loadRequests();
      await loadAppointments();
      Alert.alert('Access Granted', `${getRequestDoctorName(request)} can now view the shared medical records.`);
    } catch (_error) {
      Alert.alert('Error', 'Unable to approve the access request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDenyRequest = async request => {
    const requestId = request.id || request._id;
    let success = false;
    try {
      setProcessingRequest(`deny-${requestId}`);
      success = await denyRequest(request);
      await loadRequests();
    } finally {
      setProcessingRequest(null);
    }

    Alert.alert(
      success ? 'Access Denied' : 'Error',
      success ? 'The medical record access request was denied.' : 'Unable to deny the access request.'
    );
  };

  useEffect(() => {
    // Filter upcoming appointments using date + time
    const now = new Date();
    const upcoming = appointments
      .filter(apt => {
        if (apt.status !== APPOINTMENT_STATUS.UPCOMING) return false;
        const aptDate = new Date(apt.date);
        if (apt.time) {
          const [hours, minutes] = apt.time.split(':').map(Number);
          aptDate.setHours(hours, minutes, 0, 0);
        }
        return aptDate > now;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
    setUpcomingAppointments(upcoming);
  }, [appointments]);

  if (loading) {
    return <Loading fullScreen text="Loading..." />;
  }

  const QuickActionCard = ({ title, icon, color, count, onPress }) => (
    <TouchableOpacity
      style={[
        styles.quickActionCard,
        isTabletUp && styles.quickActionCardTablet,
        isDesktop && styles.quickActionCardDesktop,
      ]}
      onPress={onPress}
    >
      {count > 0 && (
        <View style={styles.quickActionBadge}>
          <Text style={styles.quickActionBadgeText}>{count}</Text>
        </View>
      )}
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

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
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>
            {user?.firstName || 'Patient'} <Text style={styles.wave}>👋</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <View style={styles.notificationButton}>
            <Icon name="bell" size={30} color={colors.primary[500]} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            title="Find Doctors"
            icon="doctor"
            color={colors.primary[500]}
            onPress={() => navigation.navigate('DoctorSearch')}
          />
          <QuickActionCard
            title="Emergency"
            icon="alert-triangle"
            color={colors.danger[500]}
            onPress={() => navigation.navigate('EmergencyRequest')}
          />
          <QuickActionCard
            title="My Records"
            icon="file-text"
            color={colors.success[500]}
            count={medicalRecords.length}
            onPress={() => navigation.navigate('MedicalRecords')}
          />
          <QuickActionCard
            title="Medications"
            icon="pills"
            color={colors.warning[500]}
            onPress={() => navigation.navigate('Medications')}
          />
        </View>
      </View>

      {/* Upcoming Appointments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map((appointment) => (
            <Card
              key={appointment.id}
              style={styles.appointmentCard}
              onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: appointment.id })}
            >
              <View style={styles.appointmentHeader}>
                <Avatar
                  source={{ uri: appointment.doctor?.avatar }}
                  size={50}
                  name={appointment.doctor?.name || 'Doctor'}
                />
                <View style={styles.appointmentInfo}>
                  <Text style={styles.doctorName}>{appointment.doctor?.name || 'Doctor'}</Text>
                  <Text style={styles.doctorSpecialty}>{appointment.doctor?.specialization || appointment.doctor?.speciality || ''}</Text>
                </View>
                <Badge variant="primary" size="sm">
                  {appointment.type}
                </Badge>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.appointmentDetailItem}>
                  <Icon
                    name="calendar"
                    size={16}
                    color={colors.gray[600]}
                    style={{ marginRight: spacing.xs }}
                  />

                  <Text style={styles.detailText}>
                    {new Date(appointment.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.appointmentDetailItem}>
                  <Icon
                    name="clock"
                    size={16}
                    color={colors.gray[600]}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text style={styles.detailText}>{appointment.time}</Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming appointments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorSearch')}>
              <Text style={styles.emptyAction}>Book an appointment</Text>
            </TouchableOpacity>
          </Card>
        )}
      </View>

      {requests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Record Access Requests</Text>
          {requests.map(request => (
            <Card key={request.id || request._id} style={styles.accessRequestCard}>
              <View style={styles.accessRequestHeader}>
                <Icon name="file-text" size={22} color={colors.primary[500]} />
                <View style={styles.accessRequestInfo}>
                  <Text style={styles.doctorName}>{getRequestDoctorName(request)}</Text>
                  <Text style={styles.doctorSpecialty}>
                    Requested access to your medical records
                  </Text>
                </View>
              </View>
              <View style={styles.accessRequestActions}>
                <Button
                  size="sm"
                  variant="danger"
                  loading={processingRequest === `deny-${request.id || request._id}`}
                  disabled={!!processingRequest}
                  onPress={() => handleDenyRequest(request)}
                >
                  Deny
                </Button>
                <Button
                  size="sm"
                  loading={processingRequest === `approve-${request.id || request._id}`}
                  disabled={!!processingRequest}
                  onPress={() => handleApproveRequest(request)}
                >
                  Approve
                </Button>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Active Medications */}
      {activeMedications.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Medications</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Medications')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {activeMedications.slice(0, 3).map((medication) => (
            <Card key={medication.id} style={styles.medicationCard}>
              <View style={styles.medicationHeader}>
                <Icon
                  name="pills"
                  size={24}
                  color={colors.warning[500]}
                  style={{ marginRight: spacing.md }}
                />

                <View style={styles.medicationInfo}>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <Text style={styles.medicationDosage}>
                    {medication.dosage} • {medication.frequency}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Health Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Tips</Text>
        <Card style={styles.tipCard}>
          <Icon
            name="lightbulb"
            size={50}
            color={colors.warning[500]}
            style={{ marginBottom: spacing.md }}
          />
          <Text style={styles.tipTitle}>Stay Hydrated</Text>
          <Text style={styles.tipText}>
            Drink at least 8 glasses of water daily to maintain good health.
          </Text>
        </Card>
      </View>

        <View style={styles.bottomPadding} />
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
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: colors.danger[500],
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
  },
  section: {
    padding: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickActionCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 118,
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    position: 'relative',
  },
  quickActionCardTablet: {
    flexBasis: '31%',
  },
  quickActionCardDesktop: {
    flexBasis: '22%',
  },
  quickActionBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionEmoji: {
    fontSize: 30,
  },
  quickActionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
    textAlign: 'center',
    flexShrink: 1,
  },
  appointmentCard: {
    marginBottom: spacing.md,
  },
  accessRequestCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  accessRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accessRequestInfo: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  accessRequestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  doctorName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
    flexShrink: 1,
  },
  doctorSpecialty: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    marginTop: spacing.xs / 2,
    flexShrink: 1,
  },
  appointmentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  appointmentDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailIcon: {
    fontSize: 16,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[700],
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  emptyAction: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[500],
  },
  medicationCard: {
    marginBottom: spacing.sm,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  medicationInfo: {
    flex: 1,
    minWidth: 0,
  },
  medicationName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
    flexShrink: 1,
  },
  medicationDosage: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    marginTop: spacing.xs / 2,
  },
  tipCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  tipIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  tipTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  tipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    textAlign: 'center',
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default HomeScreen;
