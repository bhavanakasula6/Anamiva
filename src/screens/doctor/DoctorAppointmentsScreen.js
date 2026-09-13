/**
 * Doctor Appointments Screen
 * Manage doctor appointments
 */

import { useEffect, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Badge, Card, EmptyState, Header, Loading } from '../../components/common';
import Icon from '../../components/Icon';
import { useDoctor } from '../../contexts/DoctorContext';
import { APPOINTMENT_STATUS } from '../../data/constants';
import { colors, spacing, typography } from '../../styles/theme';

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth || dateOfBirth === 'undefined') return null;

  const value = String(dateOfBirth).trim();
  let birthDate;

  const ddMmYyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMmYyyy) {
    const [, day, month, year] = ddMmYyyy.map(Number);
    birthDate = new Date(year, month - 1, day);
  } else {
    birthDate = new Date(value);
  }

  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

const DoctorAppointmentsScreen = ({ navigation }) => {
  const { appointments, loading } = useDoctor();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const [activeTab, setActiveTab] = useState(APPOINTMENT_STATUS.PENDING);
  const [filteredAppointments, setFilteredAppointments] = useState([]);

  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    const filtered = appointments.filter(apt => apt.status === activeTab);
    setFilteredAppointments(filtered);
  }, [activeTab, appointments]);

  const AppointmentCard = ({ appointment }) => {
    const age = appointment.patient?.age && appointment.patient.age !== '-'
      ? appointment.patient.age
      : calculateAge(appointment.patient?.dateOfBirth);
    const patientDetails = [
      age !== null && age !== undefined ? `${age} years` : null,
      appointment.patient?.gender && appointment.patient.gender !== '-' ? appointment.patient.gender : null,
    ].filter(Boolean).join(', ');

    return (
      <Card style={styles.card} onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: appointment.id })}>
        <View style={styles.cardHeader}>
          <Avatar source={{ uri: appointment.patient?.avatar }} size={50} name={appointment.patient?.name} />
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{appointment.patient?.name || 'Unknown Patient'}</Text>
            <Text style={styles.patientDetails}>{patientDetails || '-'}</Text>
          </View>
          <Badge
            variant={
              appointment.status === APPOINTMENT_STATUS.PENDING
                ? 'warning'
                : appointment.status === APPOINTMENT_STATUS.UPCOMING
                  ? 'primary'
                  : appointment.status === APPOINTMENT_STATUS.COMPLETED
                    ? 'success'
                    : 'gray'
            }
            size="sm"
          >
            {appointment.status}
          </Badge>

        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Icon
              name="calendar"
              size={14}
              color={colors.gray[600]}
              style={{ marginRight: spacing.xs }}
            />
            <Text style={styles.detailText}>
              {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon
              name="clock"
              size={14}
              color={colors.gray[600]}
              style={{ marginRight: spacing.xs }}
            />
            <Text style={styles.detailText}>{appointment.time}</Text>
          </View>
          {appointment.symptoms && (
            <View style={styles.detailRow}>
              <Icon
                name="stethoscope"
                size={14}
                color={colors.gray[600]}
                style={{ marginRight: spacing.xs }}
              />
              <Text style={styles.detailText}>{appointment.symptoms}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <Header
          title="Appointments"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
          variant="surface"
        />

        {/* Tabs */}
        <View style={[styles.tabsContainer, isWeb && styles.webTabsContainer]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={filteredAppointments}
          renderItem={({ item }) => <AppointmentCard appointment={item} />}
          keyExtractor={(item, index) => item.id?.toString() || `apt-${index}`}
          contentContainerStyle={[styles.listContent, isWeb && styles.webListContent]}
          numColumns={isTabletUp ? 2 : 1}
          key={isTabletUp ? 'tablet-grid' : 'mobile-list'}
          columnWrapperStyle={isTabletUp && styles.listColumn}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={
                <Icon
                  name="calendar"
                  size={64}
                  color={colors.primary[400]}
                />
              }
              title="No Appointments"
              description={`No ${activeTab} appointments`}
            />
          }
        />
      </View>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  webTabsContainer: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[500],
  },
  tabTextActive: {
    color: colors.primary[500],
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary[500],
  },
  listContent: {
    padding: spacing.lg,
  },
  webListContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingBottom: spacing['2xl'],
  },
  listColumn: {
    gap: spacing.md,
  },
  card: {
    flex: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  patientInfo: {
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
  patientDetails: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    marginTop: spacing.xs / 2,
  },
  cardBody: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: {
    fontSize: 14,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[700],
  },
  emptyIcon: {
    fontSize: 64,
  },
});

export default DoctorAppointmentsScreen;
