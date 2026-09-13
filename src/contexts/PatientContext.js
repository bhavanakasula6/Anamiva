/**
 * Patient Context
 * Manages patient-specific data and operations
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { ACCESS_STATUS, CONSENT_STATUS, EMERGENCY_STATUS } from '../data/constants';
import {
  accessRequestAPI,
  appointmentAPI,
  consentAPI,
  doctorAPI,
  emergencyAPI,
  medicalRecordAPI,
  medicationAPI,
  notificationAPI,
} from '../services/api';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';

const PatientContext = createContext(null);

const getDoctorId = (doctor) => doctor?._id || doctor?.id;
const getEntityId = (entity) => entity?._id || entity?.id || entity;

const normalizeDoctor = (doctor) => {
  if (!doctor) return doctor;

  const userData = doctor.userId || {};
  const fullName =
    userData.fullName ||
    userData.name ||
    (userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : '') ||
    doctor.fullName ||
    doctor.name ||
    'Doctor';

  return {
    ...doctor,
    id: getDoctorId(doctor),
    _id: getDoctorId(doctor),
    fullName,
    name: fullName,
    avatar: userData.profilePicture || userData.avatar || doctor.avatar || '',
    specialization: doctor.speciality || doctor.specialization || 'General Physician',
    speciality: doctor.speciality || doctor.specialization || 'General Physician',
    address: {
      ...(typeof userData.address === 'object' ? userData.address : {}),
      clinic: doctor.clinicInfo?.name || userData.address?.clinic || '',
      street: doctor.clinicInfo?.address || userData.address?.street || '',
    },
    consultationFee: doctor.consultationFee || 0,
    rating: doctor.rating || 0,
    reviewCount: doctor.reviewCount || 0,
    experience: doctor.experience || 0,
  };
};

export const PatientProvider = ({ children }) => {
  const { user, isPatient } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [activeMedications, setActiveMedications] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [emergencyRequest, setEmergencyRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessStatus, setAccessStatus] = useState(null);
  const [activeConsent, setActiveConsent] = useState(null);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (user && user.role === 'patient') {
      loadPatientData();
    }
  }, [user?.id, user?._id, user?.role]);

  // Listen for real-time appointment status updates via socket
  useEffect(() => {
    if (!user || user.role !== 'patient') return;

    let interval = null;

    const handleAppointmentUpdated = () => {
      loadAppointments();
      loadNotifications();
    };

    const handleNotificationCreated = () => loadNotifications();

    const handlePrescriptionUpdated = () => {
      loadAppointments();
      loadMedicalRecords();
      loadActiveMedications();
      loadNotifications();
    };

    const handleMedicalRecordUpdated = () => {
      loadMedicalRecords();
      loadNotifications();
    };

    const handleMedicalRecordCreated = () => {
      loadMedicalRecords();
    };

    const handleMedicationUpdated = () => {
      loadActiveMedications();
      loadNotifications();
    };

    const handleConsentRevoked = () => {
      setActiveConsent(null);
      setAccessStatus({ status: ACCESS_STATUS.NO_ACCESS, type: null });
      loadRequests();
      loadNotifications();
    };

    const handleConsultationAccessRequested = () => {
      loadRequests();
      loadNotifications();
    };

    const handleAccessRequestCancelled = () => {
      loadRequests();
    };

    const handleAccessRequestUpdated = () => {
      loadRequests();
      loadNotifications();
    };

    const handleEmergencyAccepted = (data) => {
      setEmergencyRequest(prev =>
        prev
          ? { ...prev, status: EMERGENCY_STATUS.ACCEPTED, acceptedAt: data.acceptedAt }
          : prev
      );
      loadNotifications();
    };

    const handleEmergencyStatusUpdated = (data) => {
      if (data.status === EMERGENCY_STATUS.CANCELLED || data.status === EMERGENCY_STATUS.COMPLETED) {
        setEmergencyRequest(null);
      } else {
        setEmergencyRequest(prev => prev ? { ...prev, status: data.status } : prev);
      }
      loadNotifications();
    };

    const registerListeners = () => {
      const socket = socketService.getSocket();
      if (!socket) return false;

      socket.off('appointment-updated', handleAppointmentUpdated);
      socket.off('notification-created', handleNotificationCreated);
      socket.off('prescription-updated', handlePrescriptionUpdated);
      socket.off('medical-record-updated', handleMedicalRecordUpdated);
      socket.off('medical-record-created', handleMedicalRecordCreated);
      socket.off('medication-updated', handleMedicationUpdated);
      socket.off('consent-revoked', handleConsentRevoked);
      socket.off('consultation-access-requested', handleConsultationAccessRequested);
      socket.off('access-request-cancelled', handleAccessRequestCancelled);
      socket.off('access-request-updated', handleAccessRequestUpdated);
      socket.off('emergency-accepted', handleEmergencyAccepted);
      socket.off('emergency-status-updated', handleEmergencyStatusUpdated);
      socket.off('connect', registerListeners);

      socket.on('appointment-updated', handleAppointmentUpdated);
      socket.on('notification-created', handleNotificationCreated);
      socket.on('prescription-updated', handlePrescriptionUpdated);
      socket.on('medical-record-updated', handleMedicalRecordUpdated);
      socket.on('medical-record-created', handleMedicalRecordCreated);
      socket.on('medication-updated', handleMedicationUpdated);
      socket.on('consent-revoked', handleConsentRevoked);
      socket.on('consultation-access-requested', handleConsultationAccessRequested);
      socket.on('access-request-cancelled', handleAccessRequestCancelled);
      socket.on('access-request-updated', handleAccessRequestUpdated);
      socket.on('emergency-accepted', handleEmergencyAccepted);
      socket.on('emergency-status-updated', handleEmergencyStatusUpdated);

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
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('appointment-updated', handleAppointmentUpdated);
        socket.off('notification-created', handleNotificationCreated);
        socket.off('prescription-updated', handlePrescriptionUpdated);
        socket.off('medical-record-updated', handleMedicalRecordUpdated);
        socket.off('medical-record-created', handleMedicalRecordCreated);
        socket.off('medication-updated', handleMedicationUpdated);
        socket.off('consent-revoked', handleConsentRevoked);
        socket.off('consultation-access-requested', handleConsultationAccessRequested);
        socket.off('access-request-cancelled', handleAccessRequestCancelled);
        socket.off('access-request-updated', handleAccessRequestUpdated);
        socket.off('emergency-accepted', handleEmergencyAccepted);
        socket.off('emergency-status-updated', handleEmergencyStatusUpdated);
        socket.off('connect', registerListeners);
      }
    };
  }, [user?.id, user?._id, user?.role]);


  const loadPatientData = async () => {
    try {
      setLoading(true);
      // Load appointments first so dashboard appears quickly
      await loadAppointments();
      setLoading(false);
      // Load remaining data in background
      await Promise.all([
        loadMedicalRecords(),
        loadActiveMedications(),
        loadFavorites(),
        loadNotifications(),
        loadRequests(),
      ]);
    } catch (error) {
      console.error('Error loading patient data:', error);
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
        setAppointments(response.appointments);
      }
      return response;
    } catch (error) {
      console.error('Error loading appointments:', error);
      return { success: false, message: 'Failed to load appointments' };
    }
  };

  const bookAppointment = async (appointmentData) => {
    try {
      const response = await appointmentAPI.bookAppointment(appointmentData);
      if (response.success) {
        setAppointments(prev => [response.appointment, ...prev]);
      }
      return response;
    } catch (error) {
      console.error('Error booking appointment:', error);
      return { success: false, message: 'Failed to book appointment' };
    }
  };

  const cancelAppointment = async (appointmentId, reason) => {
    try {
      const response = await appointmentAPI.cancelAppointment(appointmentId, reason);
      if (response.success) {
        setAppointments(prev =>
          prev.map(apt => apt.id === appointmentId ? response.appointment : apt)
        );
      }
      return response;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      return { success: false, message: 'Failed to cancel appointment' };
    }
  };

  const getAppointmentById = async (appointmentId) => {
    try {
      const response = await appointmentAPI.getAppointmentById(appointmentId);
      return response;
    } catch (error) {
      console.error('Error getting appointment:', error);
      return { success: false, message: 'Failed to get appointment' };
    }
  };


  const rescheduleAppointment = async (appointmentId, newDate, newTime) => {
    try {
      const response = await appointmentAPI.rescheduleAppointment(appointmentId, newDate, newTime);
      if (response.success) {
        setAppointments(prev =>
          prev.map(apt => apt.id === appointmentId ? response.appointment : apt)
        );
      }
      return response;
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      return { success: false, message: 'Failed to reschedule appointment' };
    }
  };

  // ============================================
  // Doctors
  // ============================================

  const searchDoctors = async (filters = {}) => {
    try {
      const response = await doctorAPI.searchDoctors(filters);
      if (response.success) {
        return {
          ...response,
          doctors: (response.doctors || []).map(normalizeDoctor),
        };
      }
      return response;
    } catch (error) {
      console.error('Error searching doctors:', error);
      return { success: false, message: 'Failed to search doctors' };
    }
  };

  const getDoctorDetails = async (doctorId) => {
    try {
      const response = await doctorAPI.getDoctorById(doctorId);
      if (response.success) {
        return {
          ...response,
          doctor: normalizeDoctor(response.doctor),
        };
      }
      return response;
    } catch (error) {
      console.error('Error getting doctor details:', error);
      return { success: false, message: 'Failed to get doctor details' };
    }
  };

  const getDoctorAvailability = async (doctorId, date) => {
    try {
      const response = await doctorAPI.getDoctorAvailability(doctorId, date);
      return response;
    } catch (error) {
      console.error('Error getting doctor availability:', error);
      return { success: false, message: 'Failed to get availability' };
    }
  };

  const toggleFavorite = async (doctorId) => {
    const wasFavorite = favorites.some(d => getDoctorId(d) === doctorId);
    setFavorites(prev =>
      wasFavorite
        ? prev.filter(d => getDoctorId(d) !== doctorId)
        : [...prev, { id: doctorId }]
    );

    try {
      const response = await doctorAPI.toggleFavorite(doctorId);
      if (!response.success) throw new Error('API failed');

      await loadFavorites();

      return response;
    } catch (error) {
      console.error('Toggle favorite failed:', error);

      setFavorites(prev =>
        wasFavorite
          ? [...prev, { id: doctorId }]
          : prev.filter(d => getDoctorId(d) !== doctorId)
      );
      return { success: false };
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await doctorAPI.getFavorites();
      if (response.success) {
        setFavorites((response.doctors || []).map(normalizeDoctor));
      }
      return response;
    } catch (error) {
      console.error('Error loading favorites:', error);
      return { success: false };
    }
  };

  // ============================================
  // Emergency
  // ============================================

  const createEmergencyRequest = async (requestData) => {
    try {
      const response = await emergencyAPI.createEmergencyRequest(requestData);
      if (response.success) {
        setEmergencyRequest(response.request);
      }
      return response;
    } catch (error) {
      console.error('Error creating emergency request:', error);
      return { success: false, message: 'Failed to create emergency request' };
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

  const clearEmergencyRequest = () => {
    setEmergencyRequest(null);
  };


  // ============================================
  // Medical Records
  // ============================================

  const refreshMedicalRecords = async () => {
    await loadMedicalRecords();
  };


  const loadMedicalRecords = async () => {
    try {
      const patientId = user?.id || user?._id;
      const response = await medicalRecordAPI.getMedicalRecords(patientId);
      if (response.success) {
        setMedicalRecords(response.records);
      }
      return response;
    } catch (error) {
      console.error('Error loading medical records:', error);
      return { success: false };
    }
  };


  const uploadMedicalRecord = async (recordData) => {
    try {
      const response = await medicalRecordAPI.uploadRecord(recordData);
      if (response.success) {
        setMedicalRecords(prev => [response.record, ...prev]);
      }
      return response;
    } catch (error) {
      console.error('Error uploading medical record:', error);
      return { success: false, message: 'Failed to upload medical record' };
    }
  };

  const pendingRecords = medicalRecords.filter(r => r.status === 'pending');
  const rejectedRecords = medicalRecords.filter(r => r.status === 'rejected');
  const verifiedRecords = medicalRecords.filter(r => r.status === 'verified');


  // ============================================
  // Medications
  // ============================================

  const loadActiveMedications = async () => {
    try {
      const response = await medicationAPI.getActiveMedications();
      if (response.success) {
        setActiveMedications(response.medications);
      }
      return response;
    } catch (error) {
      console.error('Error loading medications:', error);
      return { success: false, message: 'Failed to load medications' };
    }
  };

  const updateMedicationReminder = async (medicationId, reminderData) => {
    try {
      const response = await medicationAPI.updateMedication(medicationId, reminderData);
      if (response.success) {
        setActiveMedications(prev =>
          prev.map(med => med.id === medicationId ? response.medication : med)
        );
      }
      return response;
    } catch (error) {
      console.error('Error updating medication reminder:', error);
      return { success: false, message: 'Failed to update reminder' };
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

  // ============================================
  // Consent (Patient-controlled)
  // ============================================

  const shareConsultationRecords = async (doctorId, appointmentId) => {
    try {
      const res = await consentAPI.createConsultationConsent({
        doctorId,
        appointmentId,
      });

      if (!res.success) throw new Error(res.error);

      setActiveConsent(res.consent);
      return res.consent;
    } catch (error) {
      console.error('Share consultation consent failed:', error);
      throw error;
    }
  };

  const shareExtendedRecords = async (doctorId) => {
    try {
      const res = await consentAPI.createExtendedConsent({ doctorId });

      if (!res.success) {
        console.warn('Share extended consent not available:', res.error);
        return { success: false, message: 'Consent feature not available' };
      }

      setActiveConsent(res.consent);
      return { success: true, consent: res.consent };
    } catch (error) {
      console.warn('Share extended consent failed (route may not exist):', error.message);
      // Return graceful failure since consent routes may not be implemented
      return { success: false, message: 'Consent feature not available' };
    }
  };

  const checkConsent = async (appointmentId) => {
    try {
      const res = await getAppointmentById(appointmentId);
      if (!res.success) {
        setAccessStatus(null);
        setActiveConsent(null);
        return;
      }
      const apt = res?.appointment;

      if (!apt) {
        setAccessStatus(null);
        return;
      }

      const access = await consentAPI.getAccessStatus({
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        appointmentId: apt.id,
      });

      setAccessStatus(access);
      if (access.status === ACCESS_STATUS.GRANTED) {
        const consent = await consentAPI.getConsents();
        const match = consent.consents?.find(
          c => {
            const samePatient = getEntityId(c.patientId) === apt.patientId;
            const sameDoctor = getEntityId(c.doctorId) === apt.doctorId;
            const sameAppointment = getEntityId(c.appointmentId) === apt.id;
            const active = c.status === CONSENT_STATUS.ACTIVE;

            return active && samePatient && sameDoctor && (
              c.type === 'extended' || sameAppointment
            );
          }
        );

        setActiveConsent(match || null);
      }

      if (access.status === ACCESS_STATUS.DENIED) {
        setActiveConsent(null);
      }

    } catch (error) {
      console.error('Check consent failed:', error);
      setAccessStatus(null);
    }
  };


  const revokeConsent = async ({ consentId, doctorId }) => {
    try {
      if (consentId) {
        await consentAPI.revokeConsent(consentId);
        setActiveConsent(null);
        setAccessStatus({ status: ACCESS_STATUS.NO_ACCESS, type: null });
        return;
      }

      if (doctorId) {
        await consentAPI.revokeExtendedConsent({
          doctorId,
        });
        setActiveConsent(null);
        setAccessStatus({ status: ACCESS_STATUS.NO_ACCESS, type: null });
      }
    } catch (error) {
      console.error('Revoke consent failed:', error);
      throw error;
    }
  };


  const getAccessStatus = async ({ doctorId, appointmentId = null }) => {
    const res = await consentAPI.getAccessStatus({
      patientId: user.id,
      doctorId,
      appointmentId,
    });

    if (!res.success) {
      return { status: ACCESS_STATUS.NO_ACCESS, type: null };
    }

    return {
      status: res.status,
      type: res.type,
    };
  };


  const loadRequests = async () => {
    if (!(user?.id || user?._id)) return;
    const res = await accessRequestAPI.getPendingRequests();
    if (res.success) {
      setRequests(res.requests || []);
    }
  };

  const approveRequest = async (req) => {
    if (!req.appointmentId) {
      throw new Error('Consultation access requires appointment');
    }

    try {
      const requestId = req.id || req._id;
      const res = await accessRequestAPI.approveRequest(requestId);

      if (!res.success) throw new Error(res.error);

      setActiveConsent(res.consent);
      setRequests(prev => prev.filter(r => (r.id || r._id) !== requestId));

      return res.consent;
    } catch (error) {
      console.error('Approve request failed:', error);
      throw error;
    }
  };

  const denyRequest = async (req) => {
    try {
      const requestId = req.id || req._id;
      const res = await accessRequestAPI.denyRequest(requestId);

      if (!res.success) throw new Error(res.error);

      setRequests(prev => prev.filter(r => (r.id || r._id) !== requestId));
      return true;
    } catch (error) {
      console.error('Deny request failed:', error);
      return false;
    }
  };

  const value = {
    appointments,
    medicalRecords,
    activeMedications,
    favorites,
    notifications,
    emergencyRequest,
    loading,
    requests,
    accessStatus,
    activeConsent,
    pendingRecords,
    rejectedRecords,
    verifiedRecords,
    loadAppointments,
    bookAppointment,
    cancelAppointment,
    getAppointmentById,
    rescheduleAppointment,
    searchDoctors,
    getDoctorDetails,
    getDoctorAvailability,
    toggleFavorite,
    loadFavorites,
    createEmergencyRequest,
    sendEmergencyMessage,
    getEmergencyMessages,
    clearEmergencyRequest,
    loadMedicalRecords,
    uploadMedicalRecord,
    loadActiveMedications,
    updateMedicationReminder,
    loadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshData: loadPatientData,
    shareConsultationRecords,
    shareExtendedRecords,
    getAccessStatus,
    revokeConsent,
    checkConsent,
    approveRequest,
    denyRequest,
    loadRequests,
  };

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
};

// Custom hook to use patient context
export const usePatient = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
};

export default PatientContext;
