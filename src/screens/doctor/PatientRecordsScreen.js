/**
 * Patient Records Screen (Doctor View)
 * Access-controlled medical records
 */

import React, { useState } from 'react';
import {
  Alert,
  View,
  Text,
  FlatList,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useDoctor } from '../../contexts/DoctorContext';
import socketService from '../../services/socketService';

import { Card, EmptyState, Loading, Button, Header } from '../../components/common';
import { colors, spacing, typography, shadows } from '../../styles/theme';
import { ACCESS_STATUS } from '../../data/constants';
import Icon from '../../components/Icon';

const PatientRecordsScreen = ({ route, navigation }) => {
  const { patientId = '', patientName = 'Patient Records', appointmentId = null, requestId = null } = route.params || {};
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;

  const {
    getPatientMedicalRecords,
    getAccessStatus,
    requestAccess,
    cancelAccessRequest,
  } = useDoctor();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [access, setAccess] = useState({ status: ACCESS_STATUS.NO_ACCESS, type: null });
  const accessState = access.status;
  const consentType = access.type;
  const activeRequestId = access.requestId || requestId || null;

  useFocusEffect(
    React.useCallback(() => {
      validateAndLoad();
    }, [patientId])
  );

  React.useEffect(() => {
    const refreshHandler = (data = {}) => {
      if (data.patientId && String(data.patientId) !== String(patientId)) return;
      if (data.appointmentId && appointmentId && String(data.appointmentId) !== String(appointmentId)) return;
      validateAndLoad();
    };

    const registerListeners = () => {
      const socket = socketService.getSocket();
      if (!socket) return false;

      socket.off('consent-granted', refreshHandler);
      socket.off('consent-revoked', refreshHandler);
      socket.off('access-request-approved', refreshHandler);
      socket.off('access-request-denied', refreshHandler);
      socket.off('access-request-cancelled', refreshHandler);
      socket.off('access-request-updated', refreshHandler);
      socket.off('medical-record-updated', refreshHandler);
      socket.off('medical-record-created', refreshHandler);
      socket.off('prescription-updated', refreshHandler);

      socket.on('consent-granted', refreshHandler);
      socket.on('consent-revoked', refreshHandler);
      socket.on('access-request-approved', refreshHandler);
      socket.on('access-request-denied', refreshHandler);
      socket.on('access-request-cancelled', refreshHandler);
      socket.on('access-request-updated', refreshHandler);
      socket.on('medical-record-updated', refreshHandler);
      socket.on('medical-record-created', refreshHandler);
      socket.on('prescription-updated', refreshHandler);

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
        socket.off('consent-granted', refreshHandler);
        socket.off('consent-revoked', refreshHandler);
        socket.off('access-request-approved', refreshHandler);
        socket.off('access-request-denied', refreshHandler);
        socket.off('access-request-cancelled', refreshHandler);
        socket.off('access-request-updated', refreshHandler);
        socket.off('medical-record-updated', refreshHandler);
        socket.off('medical-record-created', refreshHandler);
        socket.off('prescription-updated', refreshHandler);
      }
    };
  }, [patientId, appointmentId]);

  const validateAndLoad = async () => {
    setLoading(true);

    const resolved = await getAccessStatus({
      patientId,
      appointmentId,
    });

    setAccess(resolved);

    if (resolved.status === ACCESS_STATUS.GRANTED) {
      const response = await getPatientMedicalRecords(patientId);
      setRecords(response?.success ? response.records : []);
    } else {
      setRecords([]);
    }

    setLoading(false);
  };

  const handleRequestAccess = async () => {
    let res;
    try {
      setActionLoading('request-access');
      res = await requestAccess({
        patientId,
        appointmentId,
      });
    } finally {
      setActionLoading(null);
    }

    if (res?.success) {
      await validateAndLoad();
      Alert.alert('Request Sent', 'The patient can now approve or deny the medical record access request.');
      return;
    }
    switch (res?.error) {
      case 'ACCESS_ALREADY_GRANTED':
        alert('You already have access to this patient’s records.');
        break;
      case 'DUPLICATE_PENDING_REQUEST':
      case 'REQUEST_ALREADY_PENDING':
        await validateAndLoad();
        Alert.alert('Request Pending', 'An access request is already pending.');
        break;
      case 'APPOINTMENT_NOT_UPCOMING':
        alert('Access can only be requested for upcoming appointments.');
        break;
      default:
        Alert.alert('Error', res?.message || 'Unable to request access at this time.');
    }
  };

  const handleCancelRequest = async () => {
    if (!activeRequestId) {
      Alert.alert('Error', 'The pending request could not be identified. Refresh and try again.');
      return;
    }

    let response;
    try {
      setActionLoading('cancel-request');
      response = await cancelAccessRequest(activeRequestId);
    } finally {
      setActionLoading(null);
    }

    if (!response?.success) {
      Alert.alert('Error', response?.message || 'Unable to cancel the access request.');
      return;
    }

    await validateAndLoad();
    Alert.alert('Request Cancelled', 'The pending access request was cancelled.');
  };


  const renderBanner = () => {
    switch (accessState) {
      case ACCESS_STATUS.PENDING:
        return (
          <View style={styles.bannerPending}>
            <Text style={styles.bannerText}>
              <Icon name="clock" size={15}/>  Access request pending for patient approval
            </Text>

            <Button
              size="sm"
              variant="outline"
              loading={actionLoading === 'cancel-request'}
              onPress={handleCancelRequest}
              disabled={!activeRequestId || !!actionLoading}
            >
              Cancel Request
            </Button>
          </View>
        );


      case ACCESS_STATUS.DENIED:
        return (
          <View style={styles.bannerDenied}>
            <Text style={styles.bannerText}>
              <Icon name="close" size={15}/>  Patient denied access to medical history
            </Text>
            <Text style={styles.disclaimer}>
              You cannot view records unless the patient shares access again.
            </Text>
          </View>
        );
      case ACCESS_STATUS.GRANTED:
        return (
          <View style={styles.bannerGranted}>
            <Text style={styles.bannerText}>
              <Icon name="unlock" size={15}/>  {consentType === 'consultation'
                ? 'Consultation-only access (expires after consultation)'
                : 'Extended access (patient shared)'}
            </Text>
            <Text style={styles.disclaimer}>
              Shared for diagnosis & treatment only
            </Text>
          </View>
        );

      case ACCESS_STATUS.NO_ACCESS:
      default:
        return (
          <View style={styles.bannerDefault}>
            <Text style={styles.bannerText}>
               <Icon name="lock" size={15}/> No access to medical history
            </Text>

            {appointmentId && (
              <Button
                size="sm"
                loading={actionLoading === 'request-access'}
                disabled={!!actionLoading}
                onPress={handleRequestAccess}
              >
                Request Consultation Access
              </Button>
            )}
          </View>
        );
    }
  };


  const renderRecord = ({ item }) => (
    <Card
      style={styles.card}
      onPress={() =>
        navigation.navigate('RecordDetails', {
          recordId: item.id,
          patientId,
          mode: 'DOCTOR',
        })
      }
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.sub}>
        {new Date(item.recordDate || item.date || item.createdAt).toDateString()}
      </Text>
      <Text style={styles.badge}>{item.status}</Text>
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading medical records..." />;
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={patientName}
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />
      <View style={styles.container}>
        <View style={[styles.content, isWeb && styles.webContent]}>

        {renderBanner()}

        {accessState === ACCESS_STATUS.GRANTED && (
          <FlatList
            data={records}
            keyExtractor={item => item.id}
            renderItem={renderRecord}
            contentContainerStyle={styles.listContent}
            numColumns={isTabletUp ? 2 : 1}
            key={isTabletUp ? 'records-grid' : 'records-list'}
            columnWrapperStyle={isTabletUp && styles.listColumn}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                title="No Records"
                description="No medical records available"
              />
            }
          />

        )}
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  content: {
    flex: 1,
    width: '100%',
  },
  webContent: {
    maxWidth: 1180,
    alignSelf: 'center',
  },

  header: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadows.sm,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
  },
  sub: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: 4,
  },
  badge: {
    marginTop: 6,
    fontSize: typography.fontSize.xs,
    color: colors.primary[600],
    textTransform: 'uppercase',
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  listColumn: {
    gap: spacing.md,
  },

  bannerGranted: {
    padding: spacing.sm,
    backgroundColor: colors.success[50],
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  bannerPending: {
    padding: spacing.sm,
    backgroundColor: colors.warning[50],
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  bannerDenied: {
    padding: spacing.sm,
    backgroundColor: colors.danger[50],
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  bannerDefault: {
    padding: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  bannerText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[800],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  disclaimer: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    textAlign: 'center',
  },
});

export default PatientRecordsScreen;
