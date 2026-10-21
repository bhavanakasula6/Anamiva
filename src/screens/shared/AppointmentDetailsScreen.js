/**
 * Appointment Details Screen
 * Shared by Patient & Doctor
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { usePatient } from '../../contexts/PatientContext';
import { useDoctor } from '../../contexts/DoctorContext';

import {
  Card,
  Button,
  Loading,
  Badge,
  Header,
} from '../../components/common';
import Icon from '../../components/Icon';

import { colors, spacing, typography, shadows } from '../../styles/theme';
import {
  ACCESS_REQUEST_STATUS,
  ACCESS_STATUS,
  APPOINTMENT_STATUS,
  CALL_STATUS,
} from '../../data/constants';
import { appointmentAPI, medicalRecordAPI } from '../../services/api';
import socketService from '../../services/socketService';
import { getAppointmentDisplayStatus } from '../../utils/appointmentStatus';

const getRecordId = (record) => record?._id || record?.id;

const getAppointmentRecordId = (appointment) => appointment?._id || appointment?.id;

const getRecordAppointmentId = (record) => {
  const appointmentId = record?.appointmentId;
  return appointmentId?._id || appointmentId?.id || appointmentId;
};

const normalizePrescriptionResponse = (response) =>
  response?.prescription ||
  response?.record ||
  response?.medicalRecord ||
  response?.data?.prescription ||
  response?.data?.record ||
  null;

const AppointmentDetailsScreen = ({ route, navigation }) => {
  const { appointmentId = '', refresh } = route.params || {};
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';
  const isWide = width >= 768;

  const role = user?.role;
  const isPatient = role === 'patient';
  const isDoctor = role === 'doctor';

  const {
    checkConsent,
    accessStatus,
    activeConsent,
    shareConsultationRecords,
    revokeConsent,
    requests,
    approveRequest,
    denyRequest,
    loadRequests,
  } = usePatient();

  const {
    updateAppointmentStatus,
    getPatientAccessStatus,
    requestAccess,
    cancelAccessRequest,
  } = useDoctor();

  const [loading, setLoading] = useState(true);
  const [doctorAccessStatus, setDoctorAccessStatus] = useState({ status: 'NO_ACCESS', type: null });
  const [appointment, setAppointment] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [showAccess, setShowAccess] = useState(isDoctor);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [noShowReason, setNoShowReason] = useState('Patient did not attend the appointment.');

  const isCompleted = appointment?.status === APPOINTMENT_STATUS.COMPLETED;
  const isCancelled = appointment?.status === APPOINTMENT_STATUS.CANCELLED;
  const isNoShow = appointment?.status === APPOINTMENT_STATUS.NO_SHOW;
  const isUpcoming = appointment?.status === APPOINTMENT_STATUS.UPCOMING;
  const isPending = appointment?.status === APPOINTMENT_STATUS.PENDING;
  const isMissed = getAppointmentDisplayStatus(appointment) === 'missed';

  const submitRating = async () => {
    if (!selectedRating) {
      Alert.alert('Rating required', 'Please select a rating from 1 to 5.');
      return;
    }
    setRatingSubmitting(true);
    const response = await appointmentAPI.submitRating(appointment.id, selectedRating, ratingReview);
    setRatingSubmitting(false);
    if (response?.success) {
      setAppointment(response.appointment);
      Alert.alert('Thank you', 'Your rating was submitted successfully.');
    } else {
      Alert.alert('Unable to submit rating', response?.message || 'Please try again.');
    }
  };

  const loadAppointment = async () => {
    const res = await appointmentAPI.getAppointmentById(appointmentId);
    if (res.success) {
      setAppointment(res.appointment);
      if (res.appointment?.prescription) {
        setPrescription(res.appointment.prescription);
      }
    } else {
      Alert.alert('Error', 'Appointment not found');
      navigation.goBack();
    }
  };

  const loadPrescription = async (appointmentValue = appointment) => {
    const lookupAppointmentId = getAppointmentRecordId(appointmentValue) || appointmentId;
    if (!lookupAppointmentId) return null;

    const directResponse = await medicalRecordAPI.getPrescriptionByAppointment(lookupAppointmentId);
    const directPrescription = normalizePrescriptionResponse(directResponse);

    if (directPrescription) {
      setPrescription(directPrescription);
      setAppointment(prev => prev ? {
        ...prev,
        prescription: directPrescription,
        prescriptionId: getRecordId(directPrescription) || prev.prescriptionId,
      } : prev);
      return directPrescription;
    }

    if (!directResponse?.success && appointmentValue?.prescription) {
      setPrescription(appointmentValue.prescription);
      return appointmentValue.prescription;
    }

    const patientId = appointmentValue?.patientId;
    if (patientId) {
      const recordsResponse = await medicalRecordAPI.getMedicalRecords(patientId);
      const records = recordsResponse?.records || [];
      const fallbackPrescription = records.find(record =>
        record?.type === 'prescription' &&
        String(getRecordAppointmentId(record)) === String(lookupAppointmentId)
      );

      if (fallbackPrescription) {
        setPrescription(fallbackPrescription);
        setAppointment(prev => prev ? {
          ...prev,
          prescription: fallbackPrescription,
          prescriptionId: getRecordId(fallbackPrescription) || prev.prescriptionId,
        } : prev);
        return fallbackPrescription;
      }
    }

    setPrescription(null);
    return null;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAppointment();
      if (isPatient) {
        await Promise.all([
          checkConsent(appointmentId),
          loadRequests(),
        ]);
      }
      setLoading(false);
    })();
  }, [appointmentId, refresh]);

  useEffect(() => {
    if (!appointment?.id) return;

    (async () => {
      setPrescription(null);
      await loadPrescription(appointment);
    })();
  }, [appointment?.id, refresh]);

  useEffect(() => {
    if (!isDoctor || !appointment || isCancelled || isCompleted) return;

    (async () => {
      const status = await getPatientAccessStatus({
        patientId: appointment.patientId,
        appointmentId: appointment.id,
      });
      setDoctorAccessStatus(status);
    })();
  }, [appointment?.id, appointment?.status, isDoctor]);

  useEffect(() => {
    if (!appointment?.id) return;

    const refreshPrescriptionHandler = async (data) => {
      if (data?.appointmentId && String(data.appointmentId) !== String(appointment.id)) return;
      await loadPrescription(appointment);
    };

    const refreshAccessHandler = async (data) => {
      if (data?.appointmentId && String(data.appointmentId) !== String(appointment.id)) return;

      if (isPatient) {
        await checkConsent(appointment.id);
        await loadRequests();
      }

      if (isDoctor) {
        const status = await getPatientAccessStatus({
          patientId: appointment.patientId,
          appointmentId: appointment.id,
        });
        setDoctorAccessStatus(status);
      }
    };

    const refreshAppointmentHandler = async (data) => {
      if (data?.appointmentId && String(data.appointmentId) !== String(appointment.id)) return;
      await loadAppointment();
    };

    const registerListeners = () => {
      const socket = socketService.getSocket();
      if (!socket) return false;

      socket.off('prescription-updated', refreshPrescriptionHandler);
      socket.off('appointment-updated', refreshAppointmentHandler);
      socket.off('consent-granted', refreshAccessHandler);
      socket.off('consent-revoked', refreshAccessHandler);
      socket.off('consultation-access-requested', refreshAccessHandler);
      socket.off('access-request-approved', refreshAccessHandler);
      socket.off('access-request-denied', refreshAccessHandler);
      socket.off('access-request-cancelled', refreshAccessHandler);
      socket.off('access-request-updated', refreshAccessHandler);

      socket.on('prescription-updated', refreshPrescriptionHandler);
      socket.on('appointment-updated', refreshAppointmentHandler);
      socket.on('consent-granted', refreshAccessHandler);
      socket.on('consent-revoked', refreshAccessHandler);
      socket.on('consultation-access-requested', refreshAccessHandler);
      socket.on('access-request-approved', refreshAccessHandler);
      socket.on('access-request-denied', refreshAccessHandler);
      socket.on('access-request-cancelled', refreshAccessHandler);
      socket.on('access-request-updated', refreshAccessHandler);

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
        socket.off('prescription-updated', refreshPrescriptionHandler);
        socket.off('appointment-updated', refreshAppointmentHandler);
        socket.off('consent-granted', refreshAccessHandler);
        socket.off('consent-revoked', refreshAccessHandler);
        socket.off('consultation-access-requested', refreshAccessHandler);
        socket.off('access-request-approved', refreshAccessHandler);
        socket.off('access-request-denied', refreshAccessHandler);
        socket.off('access-request-cancelled', refreshAccessHandler);
        socket.off('access-request-updated', refreshAccessHandler);
      }
    };
  }, [appointment?.id, appointment?.patientId, isDoctor, isPatient]);

  const doctorRequest = useMemo(() => {
    if (!isPatient || !appointment) return null;

    return requests.find(
      r => {
        const requestDoctorId = r.doctorId?._id || r.doctorId?.id || r.doctorId;
        const requestAppointmentId = r.appointmentId?._id || r.appointmentId?.id || r.appointmentId;

        return requestDoctorId === appointment.doctorId &&
        requestAppointmentId === appointment.id &&
        r.status === ACCESS_REQUEST_STATUS.PENDING
      }
    );
  }, [requests, appointment, isPatient]);

  const shareAccess = async () => {
    try {
      setActionLoading('share-access');
      await shareConsultationRecords(
        appointment.doctorId,
        appointment.id
      );
      await checkConsent(appointment.id);
    } finally {
      setActionLoading(null);
    }
  };

  const revokeAccess = () => {
    Alert.alert(
      'Revoke Consultation Access?',
      'Doctor will immediately lose access to consultation records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            const consentId = activeConsent?.id || activeConsent?._id;
            if (!consentId) return;
            try {
              setActionLoading('revoke-access');
              await revokeConsent({ consentId });
              await checkConsent(appointmentId);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const confirmAppointment = async () => {
    if (appointment.status !== APPOINTMENT_STATUS.PENDING) return;
    try {
      setActionLoading('accept-appointment');
      const res = await updateAppointmentStatus(
        appointment.id,
        APPOINTMENT_STATUS.UPCOMING
      );
      if (res?.success) {
        setAppointment(res.appointment);
        await checkConsent(appointment.id);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const completeConsultation = () => {
    if (!prescription && !appointment?.prescription && !appointment?.prescriptionId) {
      Alert.alert(
        'Prescription required',
        'You cannot complete this appointment until you add the prescription.'
      );
      return;
    }

    Alert.alert(
      'Complete Consultation?',
      'This will close the consultation and revoke consultation record access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setActionLoading('complete-appointment');
            const res = await updateAppointmentStatus(
              appointment.id,
              APPOINTMENT_STATUS.COMPLETED
            );
            if (res?.success) {
              setAppointment(res.appointment); // 🔑
              await checkConsent(appointment.id);
            } else {
              Alert.alert(
                res?.error === 'PRESCRIPTION_REQUIRED' ? 'Prescription required' : 'Unable to complete appointment',
                res?.message || 'The appointment could not be completed.'
              );
            }
            setActionLoading(null);
          },
        },
      ]
    );
  };

  const cancelAppointment = () => {
    Alert.alert(
      'Cancel Appointment?',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('cancel-appointment');
            const res = await updateAppointmentStatus(
              appointment.id,
              APPOINTMENT_STATUS.CANCELLED
            );
            if (res?.success) {
              setAppointment(res.appointment);
              navigation.goBack();
            }
            setActionLoading(null);
          },
        },
      ]
    );
  };

  const markNoShow = async () => {
    const reason = noShowReason.trim() || 'Patient did not attend the appointment.';
    setActionLoading('no-show-appointment');
    const res = await updateAppointmentStatus(
      appointment.id,
      APPOINTMENT_STATUS.NO_SHOW,
      reason
    );
    setActionLoading(null);
    if (res?.success) {
      setAppointment(res.appointment);
      setShowNoShowModal(false);
    } else {
      Alert.alert('Unable to mark no-show', res?.message || 'Please try again.');
    }
  };

  const requestDoctorAccess = async () => {
    if (!isUpcoming) {
      Alert.alert('Access unavailable', 'Consultation is not active');
      return;
    }

    setActionLoading('request-access');
    const res = await requestAccess({
      patientId: appointment.patientId,
      appointmentId: appointment.id,
    });
    setActionLoading(null);

    if (!res?.success) {
      switch (res?.error) {
        case 'ACCESS_ALREADY_GRANTED':
          Alert.alert('Access already granted');
          break;
        case 'DUPLICATE_PENDING_REQUEST':
          Alert.alert('Access request already pending');
          break;
        case 'ACCESS_DENIED_BY_PATIENT':
          Alert.alert('Patient denied access');
          break;
        default:
          Alert.alert('Unable to request access');
      }
      return;
    }

    // Optimistic update + user feedback
    setDoctorAccessStatus({ status: 'PENDING' });
    Alert.alert('Request Sent', 'Your consultation access request has been sent to the patient.');
  };

  const openPatientRecords = () => {
    navigation.navigate('PatientRecords', {
      patientId: appointment.patientId,
      patientName: appointment.patient?.name || 'Patient Records',
      appointmentId: appointment.id,
      requestId: doctorAccessStatus?.requestId,
    });
  };

  if (!user) {
    return <Loading fullScreen text="Signing out..." />;
  }

  if (loading || !appointment) {
    return <Loading fullScreen text="Loading appointment..." />;
  }
  const visiblePrescription = prescription || appointment?.prescription || null;
  const canViewPrescription = !!visiblePrescription && (isDoctor || isPatient);
  const prescriptionRecordId = getRecordId(visiblePrescription) || appointment.prescriptionId;


  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Appointment Details"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        variant="surface"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={isWeb && styles.webScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, isWeb && styles.webContainer]}>

          {/* Appointment Info */}
          <Card style={[styles.card, isWide && styles.primaryCard]}>
            <View style={styles.titleRow}>
              <Icon name="calendar" size={18} color={colors.primary[500]} />
              <Text style={styles.title}>Appointment</Text>
            </View>

            <View style={styles.metaRow}>
              <Icon name="clock" size={14} color={colors.gray[500]} />
              <Text style={styles.meta}>
                {new Date(appointment.date).toDateString()} · {appointment.time}
              </Text>
            </View>

            <View style={styles.idRow}>
              <Text style={styles.idLabel}>Appointment ID : </Text>
              <Text selectable style={styles.idValue}>
                {appointment.id}
              </Text>
            </View>

            <Badge
              size="sm"
              variant={
                getAppointmentDisplayStatus(appointment) === 'missed'
                  ? 'danger'
                  : appointment.status === APPOINTMENT_STATUS.PENDING
                  ? 'warning'
                  : appointment.status === APPOINTMENT_STATUS.UPCOMING
                    ? 'primary'
                    : appointment.status === APPOINTMENT_STATUS.COMPLETED
                      ? 'success'
                      : 'gray'
              }
            >
              {getAppointmentDisplayStatus(appointment)}
            </Badge>

          </Card>

          {/* Prescription */}
          {canViewPrescription && (
            <Card style={styles.card}>
              <Text style={styles.section}>Prescription</Text>

              {visiblePrescription?.diagnosis ? (
                <Text style={styles.prescriptionDiagnosis}>
                  Diagnosis: {visiblePrescription.diagnosis}
                </Text>
              ) : null}

              <Text style={styles.prescriptionDate}>
                Prescription date: {new Date(
                  visiblePrescription?.recordDate || visiblePrescription?.date || visiblePrescription?.createdAt
                ).toLocaleDateString()}
              </Text>

              {visiblePrescription?.medications?.length ? visiblePrescription.medications.map((med, i) => (
                <View key={i} style={styles.prescriptionItem}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medSub}>
                    {med.dosage} · {med.frequency}
                  </Text>
                  <Text style={styles.medSub}>
                    Duration: {med.duration}
                  </Text>
                </View>
              )) : (
                <Text style={styles.accessMuted}>Prescription details are available in the full record.</Text>
              )}

              <Button
                variant="outline"
                icon="file-text"
                fullWidth
                style={styles.prescriptionRecordButton}
                onPress={() => navigation.navigate('RecordDetails', {
                  recordId: prescriptionRecordId,
                  patientId: appointment.patientId,
                  mode: isPatient ? 'PATIENT' : 'DOCTOR',
                  record: visiblePrescription,
                })}
              >
                Open Full Prescription
              </Button>
            </Card>
          )}

          {/* Access Control */}
          <Card style={styles.card}>
            <TouchableOpacity
              onPress={() => setShowAccess(v => !v)}
            >
              <Text style={styles.section}>Consultation Record Access {showAccess ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {showAccess && (
              <>
                {isPatient && (
                  <>
                    {isPending && (
                      <View style={styles.accessRow}>
                        <Icon name="progress" size={14} color={colors.gray[500]} />
                        <Text style={styles.accessMuted}>
                          Access available after doctor accepts appointment
                        </Text>
                      </View>
                    )}

                    {accessStatus?.status === ACCESS_STATUS.GRANTED && isUpcoming && (
                      <>
                        <View style={styles.accessRow}>
                          <Icon name="unlock" size={14} color={colors.success[600]} />
                          <Text style={styles.accessGranted}>
                            Consultation access granted
                          </Text>
                        </View>
                        <Button
                          variant="danger"
                          loading={actionLoading === 'revoke-access'}
                          disabled={!!actionLoading}
                          onPress={revokeAccess}
                        >
                          Revoke Access
                        </Button>
                      </>
                    )}

                    {accessStatus?.status === ACCESS_STATUS.PENDING && isUpcoming && doctorRequest && (
                      <>
                        <View style={styles.accessRow}>
                          <Icon name="timer" size={14} color={colors.success[600]} />
                          <Text style={styles.accessPending}>
                            Doctor requested access
                          </Text>
                        </View>

                        <Button
                          loading={actionLoading === 'approve-request'}
                          disabled={!!actionLoading}
                          onPress={async () => {
                            try {
                              setActionLoading('approve-request');
                              await approveRequest(doctorRequest);
                              await loadRequests();
                              await checkConsent(appointment.id);
                              Alert.alert('Access Granted', 'Doctor now has access to your consultation records.');
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                        >
                          Approve Request
                        </Button>

                        <Button
                          variant="danger"
                          loading={actionLoading === 'deny-request'}
                          disabled={!!actionLoading}
                          onPress={async () => {
                            try {
                              setActionLoading('deny-request');
                              await denyRequest(doctorRequest);
                              await loadRequests();
                              await checkConsent(appointment.id);

                              Alert.alert(
                                'Access Denied',
                                'You denied the doctor\'s consultation access request.'
                              );
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                        >
                          Deny Request
                        </Button>
                      </>
                    )}

                    {(accessStatus?.status === ACCESS_STATUS.NO_ACCESS ||
                      accessStatus?.status === ACCESS_STATUS.DENIED) && isUpcoming && (
                      <>
                        <View style={styles.accessRow}>
                          <Icon name="lock" size={14} color={colors.gray[500]} />
                          <Text style={styles.accessMuted}>
                            {accessStatus?.status === ACCESS_STATUS.DENIED
                              ? 'Previous request denied. You can still share directly.'
                              : 'Not shared'}
                          </Text>
                        </View>
                        <Button
                          loading={actionLoading === 'share-access'}
                          disabled={!!actionLoading}
                          onPress={shareAccess}
                        >
                          Share Consultation Records
                        </Button>
                      </>
                    )}

                    {isCompleted && (
                      <View style={styles.accessRow}>
                        <Icon name="clock" size={14} color={colors.success[600]} />
                        <Text style={styles.accessDenied}>
                          Consultation completed — access expired
                        </Text>
                      </View>
                    )}

                    {isCancelled && (
                      <View style={styles.accessRow}>
                        <Icon name="close" size={14} color={colors.success[600]} />
                        <Text style={styles.accessDenied}>
                          Appointment cancelled — records were not shared
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {isDoctor && (
                  <>
                    {isPending && (
                      <Text style={styles.accessDenied}>
                        <Icon name="clock" size={14} color={colors.success[600]} /> Appointment not yet accepted — access unavailable
                      </Text>
                    )}
                    {doctorAccessStatus?.status === ACCESS_STATUS.GRANTED && isUpcoming && (
                      <>
                        <View style={styles.accessRow}>
                          <Icon name="unlock" size={14} color={colors.success[600]} />
                          <Text style={styles.accessGranted}>
                            Consultation-only access granted
                          </Text>
                        </View>
                        <Button
                          variant="outline"
                          icon="file-text"
                          onPress={openPatientRecords}
                        >
                          Open Patient Records
                        </Button>
                      </>
                    )}

                    {doctorAccessStatus?.status === ACCESS_STATUS.PENDING && isUpcoming && (
                      <>
                        <View style={styles.accessRow}>
                          <Icon name="progress" size={14} color={colors.success[600]} />
                          <Text style={styles.accessPending}>
                            Access request pending
                          </Text>
                        </View>
                        <Button
                          variant="outline"
                          loading={actionLoading === 'cancel-access-request'}
                          disabled={!!actionLoading}
                          onPress={async () => {
                            const requestId = doctorAccessStatus.requestId;
                            if (!requestId) {
                              Alert.alert('Error', 'The pending request could not be identified.');
                              return;
                            }

                            try {
                              setActionLoading('cancel-access-request');
                              const response = await cancelAccessRequest(requestId);
                              if (!response?.success) {
                                Alert.alert('Error', response?.message || 'Unable to cancel the request.');
                                return;
                              }

                              const status = await getPatientAccessStatus({
                                patientId: appointment.patientId,
                                appointmentId: appointment.id,
                              });
                              setDoctorAccessStatus(status);
                              Alert.alert('Request Cancelled', 'The access request was cancelled.');
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                        >
                          Cancel Request
                        </Button>
                        <Button
                          variant="outline"
                          icon="file-text"
                          onPress={openPatientRecords}
                        >
                          Open Patient Records
                        </Button>
                      </>
                    )}

                    {doctorAccessStatus?.status === ACCESS_STATUS.NO_ACCESS && isUpcoming && (
                      <>
                        <View style={styles.accessRow}>
                          <Icon name="lock" size={14} color={colors.gray[500]} />
                          <Text style={styles.accessMuted}>No access</Text>
                        </View>
                        <Button
                          loading={actionLoading === 'request-access'}
                          disabled={!!actionLoading}
                          onPress={requestDoctorAccess}
                        >
                          Request Consultation Access
                        </Button>
                        <Button
                          variant="outline"
                          icon="file-text"
                          onPress={openPatientRecords}
                        >
                          Open Patient Records
                        </Button>
                      </>
                    )}

                    {isCompleted && (
                      <View style={styles.accessRow}>
                        <Icon name="clock" size={14} color={colors.primary[500]} />
                        <Text style={styles.accessMuted}>Consultation completed — history access expired
                        </Text>
                      </View>
                    )}

                    {isCancelled && (
                      <View style={styles.accessRow}>
                        <Icon name="close" size={14} color={colors.gray[500]} />
                        <Text style={styles.accessMuted}>Appointment cancelled — no access to patient medical history
                        </Text>
                      </View>
                    )}
                    {doctorAccessStatus?.status === ACCESS_STATUS.DENIED && isUpcoming && (
                      <>
                        <View style={styles.accessRow}>
                          <Icon name="close" size={14} color={colors.gray[500]} />
                          <Text style={styles.accessMuted}>Patient denied access to consultation records
                          </Text>
                        </View>
                        <Button
                          variant="outline"
                          icon="file-text"
                          onPress={openPatientRecords}
                        >
                          Open Patient Records
                        </Button>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </Card>

          {/* Video Call */}
          {appointment.type === 'online' && !isCancelled && (
            <Card style={styles.card}>
              <View style={styles.titleRow}>
                <Icon name="video" size={18} color={colors.primary[500]} />
                <Text style={styles.title}>Video Call</Text>
              </View>

              {isDoctor && isUpcoming && (
                <>
                  {(!appointment.callStatus || appointment.callStatus === CALL_STATUS.IDLE) && (
                    <Button
                      variant="primary"
                      onPress={async () => {
                        try {
                          const res = await appointmentAPI.startCall(appointment.id);
                          if (res.success) {
                            setAppointment(res.appointment);
                            navigation.navigate('VideoCall', {
                              appointmentId: appointment.id,
                              roomId: res.appointment.videoCallRoomId,
                              isCaller: true,
                              otherPartyName: appointment.patient?.name || 'Patient',
                            });
                          }
                        } catch (_err) {
                          Alert.alert('Error', 'Failed to start call');
                        }
                      }}
                    >
                      Start Video Call
                    </Button>
                  )}

                  {(appointment.callStatus === CALL_STATUS.RINGING || appointment.callStatus === CALL_STATUS.IN_PROGRESS) && (
                    <>
                      <Text style={styles.accessMuted}>
                        {appointment.callStatus === CALL_STATUS.RINGING ? 'Waiting for patient...' : 'Call in progress'}
                      </Text>
                      <Button
                        variant="primary"
                        onPress={() => {
                          navigation.navigate('VideoCall', {
                            appointmentId: appointment.id,
                            roomId: appointment.videoCallRoomId,
                            isCaller: true,
                            otherPartyName: appointment.patient?.name || 'Patient',
                          });
                        }}
                      >
                        Rejoin Call
                      </Button>
                    </>
                  )}
                </>
              )}

              {isNoShow && appointment.noShowReason ? (
                <Text style={styles.accessMuted}>
                  No-show reason: {appointment.noShowReason}
                </Text>
              ) : null}

              {isPatient && isUpcoming && (
                <>
                  {(!appointment.callStatus || appointment.callStatus === CALL_STATUS.IDLE) && (
                    <Text style={styles.accessMuted}>Doctor will start the call when ready</Text>
                  )}

                  {(appointment.callStatus === CALL_STATUS.RINGING || appointment.callStatus === CALL_STATUS.IN_PROGRESS) && (
                    <Button
                      variant="success"
                      onPress={async () => {
                        try {
                          const res = await appointmentAPI.joinCall(appointment.id);
                          const joinedRoomId = res.appointment?.videoCallRoomId || res.videoCallRoomId;
                          if (res.success && joinedRoomId) {
                            navigation.navigate('VideoCall', {
                              appointmentId: appointment.id,
                              roomId: joinedRoomId,
                              isCaller: false,
                              otherPartyName: appointment.doctor?.name || 'Doctor',
                            });
                          }
                        } catch (_err) {
                          Alert.alert('Error', 'Failed to join call');
                        }
                      }}
                    >
                      Join Video Call
                    </Button>
                  )}
                </>
              )}

              {appointment.callStatus === CALL_STATUS.ENDED && (
                <View style={styles.accessRow}>
                  <Icon name="check" size={14} color={colors.success[600]} />
                  <Text style={styles.accessGranted}>
                    Call completed
                    {appointment.callStartedAt && appointment.callEndedAt && (
                      ` (${Math.round((new Date(appointment.callEndedAt) - new Date(appointment.callStartedAt)) / 60000)} min)`
                    )}
                  </Text>
                </View>
              )}
            </Card>
          )}

          {isPatient && isCompleted && !appointment.rating && (
            <Card style={styles.card}>
              <Text style={styles.section}>Rate your consultation</Text>
              <View style={styles.ratingChoices}>
                {[1, 2, 3, 4, 5].map(value => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.ratingChoice, selectedRating === value && styles.ratingChoiceSelected]}
                    onPress={() => setSelectedRating(value)}
                  >
                    <Text style={styles.ratingChoiceText}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                value={ratingReview}
                onChangeText={setRatingReview}
                placeholder="Optional review"
                placeholderTextColor={colors.gray[400]}
                multiline
              />
              <Button loading={ratingSubmitting} onPress={submitRating}>Submit rating</Button>
            </Card>
          )}

          {/* Doctor Actions */}
          {isDoctor && !isCancelled && !isCompleted && !isNoShow && (
            <Card style={styles.card}>
              <Text style={styles.section}>Doctor Actions</Text>

              {isPending && (
                <Button
                  loading={actionLoading === 'accept-appointment'}
                  disabled={!!actionLoading}
                  onPress={confirmAppointment}
                >
                  Accept Appointment
                </Button>
              )}

              {isUpcoming && (
                <Button
                  variant="primary"
                  onPress={() => {
                    if (appointment.status !== APPOINTMENT_STATUS.UPCOMING) {
                      Alert.alert(
                        'Prescription locked',
                        'Prescription cannot be modified after consultation completion'
                      );
                      return;
                    }
                    navigation.navigate('PrescriptionForm', {
                      appointmentId: appointment.id,
                      appointmentStatus: appointment.status,
                    });
                  }}
                >
                  {prescriptionRecordId ? 'Edit Prescription' : 'Create Prescription'}
                </Button>
              )}

              {isMissed && (isPending || isUpcoming) && (
                <Button
                  variant="danger"
                  loading={actionLoading === 'no-show-appointment'}
                  disabled={!!actionLoading}
                  onPress={() => setShowNoShowModal(true)}
                >
                  Mark as No-show
                </Button>
              )}

              {isUpcoming && (
                <Button
                  variant="success"
                  loading={actionLoading === 'complete-appointment'}
                  disabled={!!actionLoading}
                  onPress={completeConsultation}
                >
                  Complete Consultation
                </Button>
              )}
              {isPending && (
                <Button
                  variant="danger"
                  loading={actionLoading === 'cancel-appointment'}
                  disabled={!!actionLoading}
                  onPress={cancelAppointment}
                >
                  Cancel Appointment
                </Button>
              )}
            </Card>
          )}

          <Modal
            visible={showNoShowModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowNoShowModal(false)}
          >
            <View style={styles.noShowOverlay}>
              <View style={styles.noShowDialog}>
                <Text style={styles.section}>Mark appointment as no-show?</Text>
                <Text style={styles.accessMuted}>
                  This ends consultation access and notifies the patient.
                </Text>
                <TextInput
                  style={styles.noShowInput}
                  value={noShowReason}
                  onChangeText={setNoShowReason}
                  placeholder="Reason"
                  placeholderTextColor={colors.gray[400]}
                  multiline
                />
                <View style={styles.noShowActions}>
                  <Button variant="outline" onPress={() => setShowNoShowModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    loading={actionLoading === 'no-show-appointment'}
                    disabled={!!actionLoading}
                    onPress={markNoShow}
                  >
                    Confirm
                  </Button>
                </View>
              </View>
            </View>
          </Modal>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  scrollView: { flex: 1, backgroundColor: colors.gray[50] },
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.gray[50] },
  webScrollContent: { alignItems: 'center' },
  webContainer: { width: '100%', maxWidth: 920 },
  card: { marginBottom: spacing.md, padding: spacing.lg, ...shadows.sm, gap: spacing.sm },
  primaryCard: { padding: spacing.xl },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  idRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },

  idLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },

  idValue: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.mono || typography.fontFamily.medium,
    color: colors.gray[800],
  },


  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    flexWrap: 'wrap',
  },

  title: {
    flexShrink: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
  },

  meta: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },

  section: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
  },

  accessGranted: {
    flexShrink: 1,
    color: colors.success[600],
    fontSize: typography.fontSize.sm,
  },

  accessPending: {
    flexShrink: 1,
    color: colors.warning[600],
    fontSize: typography.fontSize.sm,
  },

  accessDenied: {
    flexShrink: 1,
    color: colors.danger[500],
    fontSize: typography.fontSize.sm,
  },

  accessMuted: {
    flexShrink: 1,
    color: colors.gray[500],
    fontSize: typography.fontSize.sm,
  },

  prescriptionItem: {
    backgroundColor: colors.gray[100],
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  prescriptionDiagnosis: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  prescriptionDate: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  prescriptionRecordButton: {
    marginTop: spacing.xs,
  },
  ratingChoices: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  ratingChoice: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingChoiceSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  ratingChoiceText: {
    color: colors.gray[800],
    fontFamily: typography.fontFamily.semiBold,
  },
  reviewInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    color: colors.gray[900],
    textAlignVertical: 'top',
  },
  noShowOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  noShowDialog: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  noShowInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: spacing.md,
    color: colors.gray[900],
    textAlignVertical: 'top',
  },
  noShowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  medName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
  },
  medSub: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
  },

});

export default AppointmentDetailsScreen;
