/**
 * Doctor Context
 * Manages doctor-specific data and operations
 */

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import {
  appointmentAPI,
  emergencyAPI,
  medicalRecordAPI,
  medicationAPI,
  analyticsAPI,
  notificationAPI,
  consentAPI,
  accessRequestAPI,
} from '../services/api';
import { useAuth } from './AuthContext';
import { APPOINTMENT_STATUS, CONSENT_STATUS, CONSENT_TYPES, ACCESS_STATUS } from '../data/constants';
import socketService from '../services/socketService';

const DoctorContext = createContext(null);

export const DoctorProvider = ({ children }) => {
  const { user, isDoctor } = useAuth();

  // State
  const [appointments, setAppointments] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analyticsFilter, setAnalyticsFilter] = useState({
    period: 'month',
    startDate: null,
    endDate: null,
  });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);

  const getCurrentDoctorId = () => user?.doctorProfileId || user?.doctorInfo || user?._id || user?.id;

  // Load doctor data on mount
  useEffect(() => {
    if (user && user.role === 'doctor') {
      loadDoctorData();
    }
  }, [user?.id, user?._id, user?.role]);

  // Listen for real-time events from patients
  // Uses an interval to check socket availability since SocketContext may reconnect
  const socketListenersRegistered = useRef(false);

  useEffect(() => {
    if (!user || user.role !== 'doctor') return;

    const handleConsentGranted = () => {
      loadDoctorData();
    };

    const handleConsentRevoked = () => {
      loadDoctorData();
    };

    const handleAccessRequestApproved = () => {
      loadDoctorData();
    };

    const handleAccessRequestDenied = () => {
      loadDoctorData();
    };

    const handleAccessRequestUpdated = () => {
      loadDoctorData();
    };

    const handleAppointmentBooked = () => {
      loadAppointments();
      loadNotifications();
    };

    const handleNotificationCreated = () => loadNotifications();

    const handleAppointmentUpdated = () => {
      loadAppointments();
      loadNotifications();
    };

    const handleMedicalRecordCreated = () => {
      loadPendingRecords();
      loadNotifications();
    };

    const handleMedicalRecordUpdated = () => {
      loadPendingRecords();
      loadNotifications();
    };

    const handleEmergencyCreated = () => {
      if (lastLocation) {
        loadNearbyEmergencies(lastLocation.lat, lastLocation.lng);
      }
      loadNotifications();
    };

    const handleEmergencyStatusUpdated = (data) => {
      if (data.status === 'cancelled' || data.status === 'completed') {
        setActiveEmergency(prev =>
          prev && (prev._id || prev.id) === data.emergencyId ? null : prev
        );
        setEmergencyRequests(prev =>
          prev.filter(req => (req._id || req.id) !== data.emergencyId)
        );
      } else {
        loadActiveEmergency();
      }
    };

    const registerListeners = () => {
      const sock = socketService.getSocket();
      if (!sock) return false;

      // Avoid duplicate listeners
      sock.off('consent-granted', handleConsentGranted);
      sock.off('consent-revoked', handleConsentRevoked);
      sock.off('access-request-approved', handleAccessRequestApproved);
      sock.off('access-request-denied', handleAccessRequestDenied);
      sock.off('access-request-updated', handleAccessRequestUpdated);
      sock.off('appointment-booked', handleAppointmentBooked);
      sock.off('notification-created', handleNotificationCreated);
      sock.off('appointment-updated', handleAppointmentUpdated);
      sock.off('medical-record-created', handleMedicalRecordCreated);
      sock.off('medical-record-updated', handleMedicalRecordUpdated);
      sock.off('emergency-created', handleEmergencyCreated);
      sock.off('emergency-status-updated', handleEmergencyStatusUpdated);
      sock.off('connect', registerListeners);

      sock.on('consent-granted', handleConsentGranted);
      sock.on('consent-revoked', handleConsentRevoked);
      sock.on('access-request-approved', handleAccessRequestApproved);
      sock.on('access-request-denied', handleAccessRequestDenied);
      sock.on('access-request-updated', handleAccessRequestUpdated);
      sock.on('appointment-booked', handleAppointmentBooked);
      sock.on('notification-created', handleNotificationCreated);
      sock.on('appointment-updated', handleAppointmentUpdated);
      sock.on('medical-record-created', handleMedicalRecordCreated);
      sock.on('medical-record-updated', handleMedicalRecordUpdated);
      sock.on('emergency-created', handleEmergencyCreated);
      sock.on('emergency-status-updated', handleEmergencyStatusUpdated);

      // Re-register listeners on socket reconnect
      sock.on('connect', registerListeners);

      socketListenersRegistered.current = true;
      return true;
    };

    // Try immediately, then poll until socket is available
    if (!registerListeners()) {
      const interval = setInterval(() => {
        if (registerListeners()) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }

    return () => {
      const sock = socketService.getSocket();
      if (sock) {
        sock.off('consent-granted', handleConsentGranted);
        sock.off('consent-revoked', handleConsentRevoked);
        sock.off('access-request-approved', handleAccessRequestApproved);
        sock.off('access-request-denied', handleAccessRequestDenied);
        sock.off('access-request-updated', handleAccessRequestUpdated);
        sock.off('appointment-booked', handleAppointmentBooked);
        sock.off('notification-created', handleNotificationCreated);
        sock.off('appointment-updated', handleAppointmentUpdated);
        sock.off('medical-record-created', handleMedicalRecordCreated);
        sock.off('medical-record-updated', handleMedicalRecordUpdated);
        sock.off('emergency-created', handleEmergencyCreated);
        sock.off('emergency-status-updated', handleEmergencyStatusUpdated);
        sock.off('connect', registerListeners);
      }
      socketListenersRegistered.current = false;
    };
  }, [user?.id, user?._id, user?.role, lastLocation?.lat, lastLocation?.lng]);

  const loadDoctorData = async () => {
    try {
      setLoading(true);
      // Load appointments first so dashboard appears quickly
      await loadAppointments();
      setLoading(false);
      // Load remaining data in background
      await Promise.all([
        loadActiveEmergency(),
        loadPendingRecords(),
        loadNotifications(),
        loadAnalytics(),
      ]);
    } catch (error) {
      console.error('Error loading doctor data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Appointments
  // ============================================

  const loadAppointments = async (filters = {}) => {
    try {
      const response = await appointmentAPI.getAppointments(filters);
      if (response.success) {
        setAppointments(response.appointments || []);
      }
      return response;
    } catch (error) {
      console.error('[DoctorContext] Error loading appointments:', error?.message || error);
      return { success: false, message: 'Failed to load appointments' };
    }
  };


  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      const response = await appointmentAPI.updateAppointmentStatus(appointmentId, status);
      if (response.success) {
        setAppointments(prev =>
          prev.map(apt => (apt.id || apt._id) === appointmentId ? response.appointment : apt)
        );
        // Also reload from server to ensure state is fully in sync
        loadAppointments();
      }
      return response;
    } catch (error) {
      console.error('Error updating appointment status:', error);
      return { success: false, message: 'Failed to update appointment status' };
    }
  };

  const addClinicalNotes = async (appointmentId, notes, diagnosis) => {
    try {
      const response = await appointmentAPI.addClinicalNotes(appointmentId, notes, diagnosis);
      if (response.success) {
        setAppointments(prev =>
          prev.map(apt => apt.id === appointmentId ? response.appointment : apt)
        );
      }
      return response;
    } catch (error) {
      console.error('Error adding clinical notes:', error);
      return { success: false, message: 'Failed to add clinical notes' };
    }
  };

  const createPrescription = async (
    appointmentId,
    { medications, diagnosis, notes, recordDate }
  ) => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);

      if (!appointment) {
        return { success: false, message: 'Appointment not found' };
      }

      if (appointment.prescriptionId) {
        return { success: false, error: 'PRESCRIPTION_ALREADY_EXISTS' };
      }

      if (appointment.status !== APPOINTMENT_STATUS.UPCOMING) {
        return { success: false, error: 'INVALID_APPOINTMENT_STATE' };
      }

      const response = await appointmentAPI.createPrescription(
        appointmentId,
        { medications, diagnosis, notes, recordDate }
      );

      if (response.success) {
        await loadAppointments();
      }

      return response;
    } catch (error) {
      console.error('Error creating prescription:', error);
      return { success: false, message: 'Failed to create prescription' };
    }
  };

  const updatePrescription = async (recordId, updates) => {
    try {
      const res = await medicalRecordAPI.updatePrescription(recordId, updates);
      if (res.success) {
        await loadAppointments();
      }
      return res;
    } catch (error) {
      console.error('Error updating prescription:', error);
      return { success: false };
    }
  };

  // ============================================
  // Emergency
  // ============================================

  const loadActiveEmergency = async () => {
    try {
      const response = await emergencyAPI.getActiveEmergency();
      if (response.success) {
        setActiveEmergency(response.emergency || null);
      }
      return response;
    } catch (error) {
      console.error('[DoctorContext] Error loading active emergency:', error?.message || error);
      return { success: false };
    }
  };

  const loadNearbyEmergencies = async (latitude, longitude, radius = 50) => {
    try {
      const response = await emergencyAPI.getNearbyEmergencyRequests(latitude, longitude, radius);
      if (response.success) {
        setEmergencyRequests(response.emergencies || response.requests || []);
        setLastLocation({ lat: latitude, lng: longitude });
      }
      return response;
    } catch (error) {
      console.error('Error loading emergency requests:', error);
      return { success: false, message: 'Failed to load emergency requests' };
    }
  };

  const acceptEmergencyRequest = async (requestId) => {
    try {
      const response = await emergencyAPI.acceptEmergencyRequest(requestId);
      if (response.success) {
        setEmergencyRequests(prev =>
          prev.filter(req => (req._id || req.id) !== requestId)
        );
        // Reload from server to get fully populated emergency data for the dashboard
        await loadActiveEmergency();
      }
      return response;
    } catch (error) {
      console.error('Error accepting emergency request:', error);
      return { success: false, message: 'Failed to accept emergency request' };
    }
  };

  const updateEmergencyStatus = async (requestId, status) => {
    try {
      const response = await emergencyAPI.updateEmergencyStatus(requestId, status);
      if (lastLocation) {
        await loadNearbyEmergencies(lastLocation.lat, lastLocation.lng);
      }
      return response;
    } catch (error) {
      console.error('Error updating emergency status:', error);
      return { success: false, message: 'Failed to update emergency status' };
    }
  };

  const sendEmergencyMessage = async (requestId, message) => {
    try {
      const response = await emergencyAPI.sendChatMessage(requestId, message);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, message: 'Failed to send message' };
    }
  };

  const getEmergencyMessages = async (requestId) => {
    try {
      const response = await emergencyAPI.getChatMessages(requestId);
      return response;
    } catch (error) {
      console.error('Error getting messages:', error);
      return { success: false, message: 'Failed to get messages' };
    }
  };

  // ============================================
  // Medical Records & Verification
  // ============================================

  const loadPendingRecords = async () => {
    try {
      const response = await medicalRecordAPI.loadPendingRecords();
      if (response.success) {
        setPendingRecords(response.records);
      }
      return response;
    } catch (error) {
      console.error('Error loading records for verification:', error);
      return { success: false };
    }
  };

  const verifyRecord = async (recordId) => {
    try {
      const res = await medicalRecordAPI.verifyRecord(recordId);
      if (res.success) {
        // remove from pending list immediately
        setPendingRecords(prev =>
          prev.filter(r => r.id !== recordId)
        );
      }
      return res;
    } catch (error) {
      console.error('Verify record failed:', error);
      return { success: false };
    }
  };

  const rejectRecord = async (recordId, reason) => {
    try {
      const res = await medicalRecordAPI.rejectRecord(recordId, reason);
      if (res.success) {
        setPendingRecords(prev =>
          prev.filter(r => r.id !== recordId)
        );
      }
      return res;
    } catch (error) {
      console.error('Reject record failed:', error);
      return { success: false };
    }
  };

  const getPatientMedicalRecords = async (patientId) => {
    try {
      const response = await medicalRecordAPI.getMedicalRecords(patientId);
      return response;
    } catch (error) {
      console.error('Error getting patient records:', error);
      return { success: false, message: 'Failed to get patient records' };
    }
  };
  const getAppointmentPrescription = async (appointmentId) => {
    try {
      return await medicalRecordAPI.getPrescriptionByAppointment(appointmentId);
    } catch (e) {
      console.error('Failed to load prescription', e);
      return { success: false };
    }
  };

  const getPatientMedications = async (patientId) => {
    try {
      return await medicationAPI.getActiveMedications(patientId);
    } catch (error) {
      console.error('Error getting patient medications:', error);
      return { success: false, message: 'Failed to get patient medications' };
    }
  };

  // ============================================
  // Analytics
  // ============================================

  const loadAnalytics = async (filter = analyticsFilter) => {
    try {
      setAnalyticsFilter(filter);
      const response = await analyticsAPI.getDoctorAnalytics(filter);
      if (response.success) {
        setAnalytics({
          summary: response.summary,
          chartData: response.chartData,
          demographics: response.demographics,
        });
      }
      return response;
    } catch (error) {
      console.error('Error loading analytics:', error);
      return { success: false, message: 'Failed to load analytics' };
    }
  };

  // ============================================
  // Notifications
  // ============================================

  const loadNotifications = async () => {
    try {
      const response = await notificationAPI.getNotifications();
      if (response.success) {
        setNotifications((response.notifications || []).map(notification => ({
          ...notification,
          id: notification.id || notification._id,
        })));
      }
      return response;
    } catch (error) {
      console.error('Error loading notifications:', error);
      return { success: false, message: 'Failed to load notifications' };
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await notificationAPI.markAsRead(notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(notif => String(notif.id || notif._id) === String(notificationId)
            ? { ...notif, read: true }
            : notif)
        );
      }
      return response;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, message: 'Failed to mark as read' };
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await notificationAPI.markAllAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      }
      return response;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return { success: false, message: 'Failed to mark all as read' };
    }
  };

  const getPatientAccessStatus = async ({ patientId, appointmentId }) => {
    const doctorId = getCurrentDoctorId();
    const res = await consentAPI.getAccessStatus({
      patientId,
      doctorId,
      appointmentId,
    });

    if (!res.success) {
      return { status: ACCESS_STATUS.NO_ACCESS, type: null };
    }

    return {
      status: res.status,
      type: res.type,
      requestId: res.requestId || null,
      consentId: res.consentId || null,
    };
  };


  const requestAccess = async ({ patientId, appointmentId }) => {
    const status = await getPatientAccessStatus({ patientId, appointmentId });

    if (status.status === ACCESS_STATUS.PENDING) {
      return { success: false, error: 'REQUEST_ALREADY_PENDING' };
    }

    if (status.status === ACCESS_STATUS.GRANTED) {
      return { success: false, error: 'ACCESS_ALREADY_GRANTED' };
    }

    if (status.status === ACCESS_STATUS.DENIED) {
      return { success: false, error: 'ACCESS_DENIED_BY_PATIENT' };
    }

    try {
      const res = await accessRequestAPI.requestAccess(patientId, appointmentId);
      return res;
    } catch (error) {
      console.error('Error requesting access:', error);
      return { success: false, message: 'Failed to request access' };
    }
  };

  const cancelAccessRequest = async (requestId) => {
    try {
      return await accessRequestAPI.cancelRequest(requestId);
    } catch (error) {
      console.error('Error canceling access request:', error);
      return { success: false };
    }
  };

  const getAccessStatus = async ({ patientId, appointmentId = null }) => {
    const res = await consentAPI.getAccessStatus({
      patientId,
      doctorId: getCurrentDoctorId(),
      appointmentId,
    });

    return res.success
      ? {
          status: res.status,
          type: res.type,
          requestId: res.requestId || null,
          consentId: res.consentId || null,
        }
      : { status: ACCESS_STATUS.NO_ACCESS, type: null };
  };

  const getPatientsWithAccess = async () => {
    const map = new Map();
    const getId = value => value?._id || value?.id || value;
    const getName = patient =>
      patient?.fullName ||
      patient?.name ||
      (patient?.firstName ? `${patient.firstName} ${patient.lastName || ''}`.trim() : '') ||
      'Patient';
    const getAge = dateOfBirth => {
      if (!dateOfBirth) return '-';
      const birthDate = new Date(dateOfBirth);
      if (Number.isNaN(birthDate.getTime())) return '-';
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const month = today.getMonth() - birthDate.getMonth();
      if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) age -= 1;
      return age;
    };

    // 1️⃣ UPCOMING appointments
    const aptRes = await appointmentAPI.getAppointments({
      status: APPOINTMENT_STATUS.UPCOMING,
    });

    if (aptRes.success) {
      for (const apt of aptRes.appointments) {
        const access = await consentAPI.getAccessStatus({
          patientId: apt.patientId,
          doctorId: getCurrentDoctorId(),
          appointmentId: apt.id,
        });

        let requestId = null;

        if (access.status === ACCESS_STATUS.PENDING) {
          requestId = access.requestId || null;
        }

        map.set(apt.patientId, {
          id: apt.patientId,
          name: apt.patient.name,
          age: apt.patient.age,
          gender: apt.patient.gender,
          appointmentId: apt.id,
          access,
          requestId,
        });
      }
    }

    // 2️⃣ Extended-consent patients (no appointment)
    const consentRes = await consentAPI.getConsents();

    if (consentRes.success) {
      const extended = consentRes.consents.filter(
        c => c.type === CONSENT_TYPES.EXTENDED && c.status === CONSENT_STATUS.ACTIVE
      );

      for (const consent of extended) {
        const patient = consent.patientId;
        const patientId = getId(patient);
        if (!patientId || map.has(patientId)) continue;

        map.set(patientId, {
          id: patientId,
          name: getName(patient),
          age: getAge(patient?.dateOfBirth),
          gender: patient?.gender || '-',
          appointmentId: null,
          access: { status: ACCESS_STATUS.GRANTED, type: CONSENT_TYPES.EXTENDED },
        });
      }
    }

    return Array.from(map.values());
  };


  const value = {
    appointments,
    emergencyRequests,
    activeEmergency,
    pendingRecords,
    notifications,
    analytics,
    analyticsFilter,
    loading,
    requestAccess,
    cancelAccessRequest,
    getPatientAccessStatus,
    getAccessStatus,
    getPatientsWithAccess,
    loadActiveEmergency,
    loadAppointments,
    updateAppointmentStatus,
    addClinicalNotes,
    createPrescription,
    updatePrescription,
    loadNearbyEmergencies,
    acceptEmergencyRequest,
    updateEmergencyStatus,
    sendEmergencyMessage,
    getEmergencyMessages,
    loadPendingRecords,
    verifyRecord,
    rejectRecord,
    getPatientMedicalRecords,
    getAppointmentPrescription,
    getPatientMedications,
    setAnalyticsFilter,
    loadAnalytics,
    loadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshData: loadDoctorData,
  };

  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
};

// Custom hook to use doctor context
export const useDoctor = () => {
  const context = useContext(DoctorContext);
  if (!context) {
    throw new Error('useDoctor must be used within a DoctorProvider');
  }
  return context;
};

export default DoctorContext;
