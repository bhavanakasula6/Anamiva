/**
 * Doctor Patients Screen
 * Shows patients with medical record access status
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useDoctor } from '../../contexts/DoctorContext';
import socketService from '../../services/socketService';

import { Card, EmptyState, Loading, Header } from '../../components/common';
import { colors, spacing, typography, shadows } from '../../styles/theme';
import { ACCESS_STATUS, CONSENT_TYPES } from '../../data/constants';
import Icon from '../../components/Icon';

const DoctorPatientsScreen = ({ navigation }) => {
  const { loading, getPatientsWithAccess } = useDoctor();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const [patients, setPatients] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadPatients();
    }, [])
  );

  React.useEffect(() => {
    const refreshPatients = () => {
      loadPatients({ silent: true });
    };

    const registerListeners = () => {
      const socket = socketService.getSocket();
      if (!socket) return false;

      socket.off('consent-granted', refreshPatients);
      socket.off('consent-revoked', refreshPatients);
      socket.off('access-request-approved', refreshPatients);
      socket.off('access-request-denied', refreshPatients);
      socket.off('access-request-cancelled', refreshPatients);
      socket.off('access-request-updated', refreshPatients);
      socket.off('appointment-booked', refreshPatients);
      socket.off('appointment-updated', refreshPatients);
      socket.off('connect', registerListeners);

      socket.on('consent-granted', refreshPatients);
      socket.on('consent-revoked', refreshPatients);
      socket.on('access-request-approved', refreshPatients);
      socket.on('access-request-denied', refreshPatients);
      socket.on('access-request-cancelled', refreshPatients);
      socket.on('access-request-updated', refreshPatients);
      socket.on('appointment-booked', refreshPatients);
      socket.on('appointment-updated', refreshPatients);
      socket.on('connect', registerListeners);
      return true;
    };

    if (!registerListeners()) {
      const interval = setInterval(() => {
        if (registerListeners()) clearInterval(interval);
      }, 500);
      return () => clearInterval(interval);
    }

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('consent-granted', refreshPatients);
        socket.off('consent-revoked', refreshPatients);
        socket.off('access-request-approved', refreshPatients);
        socket.off('access-request-denied', refreshPatients);
        socket.off('access-request-cancelled', refreshPatients);
        socket.off('access-request-updated', refreshPatients);
        socket.off('appointment-booked', refreshPatients);
        socket.off('appointment-updated', refreshPatients);
        socket.off('connect', registerListeners);
      }
    };
  }, []);

  const loadPatients = async ({ silent = false } = {}) => {
    if (!silent) setLocalLoading(true);

    const list = await getPatientsWithAccess();
    setPatients(list);
    if (!silent) setLocalLoading(false);
  };


  const renderStatus = (access) => {
    if (!access || access.status === ACCESS_STATUS.NO_ACCESS) {
      return (
        <View style={styles.statusRow}>
          <Icon name="lock" size={14} color={colors.gray[500]} />
          <Text style={styles.locked}>No Access</Text>
        </View>
      );
    }

    switch (access.status) {
      case ACCESS_STATUS.GRANTED:
        return (
          <View style={styles.statusRow}>
            <Icon name="unlock" size={14} color={colors.success[600]} />
            <Text style={styles.unlocked}>
              {access.type === CONSENT_TYPES.EXTENDED
                ? 'Trusted Patient'
                : 'Consultation'}
            </Text>
          </View>
        );

      case ACCESS_STATUS.PENDING:
        return (
          <View style={styles.statusRow}>
            <Icon name="clock" size={14} color={colors.warning[600]} />
            <Text style={styles.pending}>Request Sent</Text>
          </View>
        );

      case ACCESS_STATUS.DENIED:
        return (
          <View style={styles.statusRow}>
            <Icon name="x-circle" size={14} color={colors.danger[600]} />
            <Text style={styles.denied}>Access Denied</Text>
          </View>
        );

      default:
        return null;
    }
  };


  const openPatient = (patient) => {
    navigation.navigate('PatientRecords', {
      patientId: patient.id,
      patientName: patient.name,
      appointmentId: patient.appointmentId || null,
      requestId: patient.requestId || null,
    });
  };


  const renderPatient = ({ item }) => {
    const access = item.access ?? { status: ACCESS_STATUS.NO_ACCESS, type: null };

    return (
      <Card style={styles.card}>
        <TouchableOpacity onPress={() => openPatient(item)}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name?.charAt(0) || '?'}
              </Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.age} yrs · {item.gender}
              </Text>
            </View>

            <View style={styles.status}>
              {renderStatus(access)}
            </View>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  if (loading || localLoading) {
    return <Loading fullScreen text="Loading patients..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Patients"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />
      <View style={styles.container}>
        <FlatList
          data={patients}
          keyExtractor={item => item.id}
          renderItem={renderPatient}
          contentContainerStyle={[styles.listContent, isWeb && styles.webListContent]}
          numColumns={isTabletUp ? 2 : 1}
          key={isTabletUp ? 'patients-grid' : 'patients-list'}
          columnWrapperStyle={isTabletUp && styles.listColumn}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="No Patients Found"
              description="Patients appear here once access is granted"
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

  header: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.md,
    color: colors.gray[900],
  },
  card: {
    flex: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  avatarText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[600],
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  name: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
    flexShrink: 1,
  },
  meta: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },
  status: {
    marginLeft: spacing.sm,
  },
  unlocked: {
    color: colors.success[600],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
  },
  locked: {
    color: colors.gray[500],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
  },
  pending: {
    color: colors.warning[600],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
  },
  denied: {
    color: colors.danger[600],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
  },
});

export default DoctorPatientsScreen;
