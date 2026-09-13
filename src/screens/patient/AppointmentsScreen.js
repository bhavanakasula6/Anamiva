/**
 * Appointments List Screen
 * View all appointments with tabs for different statuses
 */
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Badge, Card, EmptyState, Header, Loading } from '../../components/common';
import Icon from '../../components/Icon';
import { usePatient } from '../../contexts/PatientContext';
import { APPOINTMENT_STATUS } from '../../data/constants';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';

const AppointmentsScreen = ({ navigation }) => {
  const { appointments, loading, loadAppointments } = usePatient();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const [activeTab, setActiveTab] = useState(APPOINTMENT_STATUS.PENDING);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [])
  );

  const tabs = [
    { id: APPOINTMENT_STATUS.PENDING, label: 'Pending' },
    { id: APPOINTMENT_STATUS.UPCOMING, label: 'Upcoming' },
    { id: APPOINTMENT_STATUS.COMPLETED, label: 'Completed' },
    { id: APPOINTMENT_STATUS.CANCELLED, label: 'Cancelled' },
  ];

  useEffect(() => {
    const now = new Date();
    const filtered = appointments
      .filter(a => {
        if (a.status !== activeTab) return false;
        if (activeTab === APPOINTMENT_STATUS.UPCOMING) {
          // Build full datetime from date + time
          const aptDate = new Date(a.date);
          if (a.time) {
            const [hours, minutes] = a.time.split(':').map(Number);
            aptDate.setHours(hours, minutes, 0, 0);
          }
          return aptDate > now;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    setFilteredAppointments(filtered);
  }, [activeTab, appointments]);

  const AppointmentCard = ({ appointment }) => {
    // Handle both frontend 'doctor' and backend 'doctorId' field names
    const doctor = appointment.doctor || appointment.doctorId || {};
    const doctorName = doctor.userId?.name || doctor.name || doctor.fullName || 'Doctor';
    const doctorAvatar = doctor.userId?.profilePicture || doctor.avatar;
    const doctorSpecialty = doctor.speciality || doctor.specialization || '';

    return (
      <Card
        style={styles.appointmentCard}
        onPress={() =>
          navigation.navigate('AppointmentDetails', {
            appointmentId: appointment._id || appointment.id,
          })
        }
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <Avatar
            source={{ uri: doctorAvatar }}
            size={50}
            name={doctorName}
          />

          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{doctorName}</Text>
            <Text style={styles.specialty}>{doctorSpecialty}</Text>
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

        {/* Details */}
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Icon name="calendar" size={14} color={colors.gray[600]} />
            <Text style={styles.detailText}>
              {new Date(appointment.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="clock" size={14} color={colors.gray[600]} />
            <Text style={styles.detailText}>{appointment.time}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="wallet" size={14} color={colors.gray[600]} />
            <Text style={styles.detailText}>₹{doctor.consultationFee || appointment.fee || 0}</Text>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return <Loading fullScreen text="Loading appointments..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Appointments"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      {/* Tabs */}
      <View style={styles.container}>

        <View style={[styles.tabsContainer, isWeb && styles.webTabsContainer]}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={filteredAppointments}
          keyExtractor={item => item._id || item.id}
          renderItem={({ item }) => (
            <AppointmentCard appointment={item} />
          )}
          contentContainerStyle={[styles.listContent, isWeb && styles.webListContent]}
          numColumns={isTabletUp ? 2 : 1}
          key={isTabletUp ? 'appointments-grid' : 'appointments-list'}
          columnWrapperStyle={isTabletUp && styles.listColumn}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Icon name="calendar" size={48} color={colors.primary[400]} />}
              title="No appointments"
              description={`You don't have any ${activeTab} appointments`}
              actionLabel="Book Appointment"
              onAction={() => navigation.navigate('DoctorSearch')}
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
    marginTop: spacing.xs,
    height: 3,
    width: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
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
  appointmentCard: {
    flex: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  doctorInfo: {
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

  specialty: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
    flexShrink: 1,
  },

  cardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
});

export default AppointmentsScreen;
