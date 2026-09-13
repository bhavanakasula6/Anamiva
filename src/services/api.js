/**
 * API Service
 * Makes real HTTP calls to the backend server
 */

import httpClient, { getToken, removeToken, setToken, API_BASE_URL } from './httpClient';

import {
  CONSENT_TYPES,
  EMERGENCY_STATUS
} from '../data/constants';

// Current authenticated user (cached locally)
let currentUser = null;

export const setCurrentUser = (user) => {
  currentUser = user;
};

export const getCurrentUserLocal = () => currentUser;

const isBrowserFile = (file) =>
  typeof File !== 'undefined' && file instanceof File;

const appendUploadFile = (formData, fieldName, file, fallbackName) => {
  if (!file) return;

  if (isBrowserFile(file)) {
    formData.append(fieldName, file, file.name || fallbackName);
    return;
  }

  if (file.file && isBrowserFile(file.file)) {
    formData.append(fieldName, file.file, file.name || file.file.name || fallbackName);
    return;
  }

  const uri = typeof file === 'string' ? file : file.uri;
  const name = file.name || uri?.split('/').pop() || fallbackName;
  const ext = name.split('.').pop()?.toLowerCase();
  const type =
    file.mimeType ||
    (file.type?.includes('/') ? file.type : null) ||
    (ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg');

  formData.append(fieldName, {
    uri,
    name,
    type,
  });
};

// ============================================
// Authentication APIs
// ============================================

export const authAPI = {
  // Send OTP to email
  sendOTP: async (email) => {
    const response = await httpClient.post('/auth/send-otp', { email });
    return response;
  },

  // Verify OTP
  verifyOTP: async (email, otp) => {
    const response = await httpClient.post('/auth/verify-otp', { email, otp });

    // Store token if login successful (existing user)
    if (response.success && response.token) {
      await setToken(response.token);
      if (response.user) {
        currentUser = response.user;
      }
    }

    // Store tempToken for new users (needed for select-role and complete-profile)
    if (response.success && response.tempToken) {
      await setToken(response.tempToken);
    }

    return response;
  },

  // Select role (for new users)
  selectRole: async (email, role) => {
    const response = await httpClient.post('/auth/select-role', { email, role });
    return response;
  },

  // Complete profile (for new users)
  completeProfile: async (profileData) => {
    const response = await httpClient.post('/auth/complete-profile', profileData);

    // Store token if profile completed
    if (response.success && response.token) {
      await setToken(response.token);
      if (response.user) {
        currentUser = response.user;
      }
    }

    return response;
  },

  // Get current user
  getCurrentUser: async () => {
    const token = await getToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await httpClient.get('/auth/me');

    if (response.success && response.user) {
      currentUser = response.user;
    }

    return response;
  },

  // Logout
  logout: async () => {
    const response = await httpClient.post('/auth/logout', {});
    await removeToken();
    currentUser = null;
    return response;
  },

  // Update profile
  updateProfile: async (updates) => {
    const response = await httpClient.put('/auth/profile', updates);

    if (response.success && response.user) {
      currentUser = response.user;
    }

    return response;
  },

  // Upload avatar image (multipart/form-data)
  uploadAvatar: async (imageUri) => {
    try {
      const token = await getToken();

      if (!token) {
        return { success: false, message: 'Not authenticated. Please login again.' };
      }

      const formData = new FormData();
      appendUploadFile(formData, 'avatar', imageUri, `avatar_${Date.now()}.jpg`);

      const url = `${API_BASE_URL}/auth/upload-avatar`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Do NOT set Content-Type — fetch sets it automatically with boundary for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('uploadAvatar: server error', data);
        return { success: false, message: data.message || 'Upload failed' };
      }

      if (data.success && data.user) {
        currentUser = data.user;
      }

      return { success: true, ...data };
    } catch (error) {
      console.error('Avatar upload error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  },
};

// ============================================
// Patient APIs
// ============================================

export const patientAPI = {
  getPatientById: async (patientId) => {
    const response = await httpClient.get(`/patients/${patientId}`);
    return response;
  },
};

// ============================================
// Doctor APIs
// ============================================

export const doctorAPI = {
  // Search doctors
  searchDoctors: async (filters = {}) => {
    // Build query string from filters
    const params = new URLSearchParams();

    if (filters.specialization) params.append('specialization', filters.specialization);
    if (filters.availableNow) params.append('availableNow', 'true');
    if (filters.acceptingEmergency) params.append('acceptingEmergency', 'true');
    if (filters.latitude) params.append('latitude', filters.latitude);
    if (filters.longitude) params.append('longitude', filters.longitude);
    if (filters.radius) params.append('radius', filters.radius);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.query) params.append('query', filters.query);
    if (filters.city) params.append('city', filters.city);

    const queryString = params.toString();
    const endpoint = queryString ? `/doctors?${queryString}` : '/doctors';

    const response = await httpClient.get(endpoint);
    return response;
  },

  // Get doctor by ID
  getDoctorById: async (doctorId) => {
    const response = await httpClient.get(`/doctors/${doctorId}`);
    return response;
  },

  // Get doctor's availability
  getDoctorAvailability: async (doctorId, date) => {
    const params = date ? `?date=${encodeURIComponent(date)}` : '';
    const response = await httpClient.get(`/doctors/${doctorId}/availability${params}`);
    return response;
  },

  // Toggle favorite
  toggleFavorite: async (doctorId) => {
    const response = await httpClient.post(`/doctors/${doctorId}/favorite`, {});
    return response;
  },

  // Get favorite doctors
  getFavorites: async () => {
    const response = await httpClient.get('/doctors/favorites');
    return response;
  },
};

// ============================================
// Appointment APIs
// ============================================

export const appointmentAPI = {
  // Book appointment
  bookAppointment: async (appointmentData) => {
    const response = await httpClient.post('/appointments', appointmentData);
    return response;
  },

  // Get appointments
  getAppointments: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const endpoint = queryString ? `/appointments?${queryString}` : '/appointments';

    const response = await httpClient.get(endpoint);
    return response;
  },

  // Get appointment by ID
  getAppointmentById: async (appointmentId) => {
    const response = await httpClient.get(`/appointments/${appointmentId}`);
    return response;
  },

  // Update appointment status
  updateAppointmentStatus: async (appointmentId, status) => {
    const response = await httpClient.patch(`/appointments/${appointmentId}/status`, { status });
    return response;
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId, reason) => {
    const response = await httpClient.post(`/appointments/${appointmentId}/cancel`, { reason });
    return response;
  },

  // Reschedule appointment
  rescheduleAppointment: async (appointmentId, newDate, newTime) => {
    const response = await httpClient.patch(`/appointments/${appointmentId}/reschedule`, {
      date: newDate,
      time: newTime,
    });
    return response;
  },

  // Add clinical notes (doctor only)
  addClinicalNotes: async (appointmentId, notes, diagnosis) => {
    const response = await httpClient.post(`/appointments/${appointmentId}/notes`, {
      notes,
      diagnosis,
    });
    return response;
  },

  // Create prescription
  createPrescription: async (appointmentId, prescriptionData) => {
    const response = await httpClient.post(`/appointments/${appointmentId}/prescription`, prescriptionData);
    return response;
  },

  // Start video call (doctor only)
  startCall: async (appointmentId) => {
    const response = await httpClient.post(`/appointments/${appointmentId}/call/start`);
    return response;
  },

  // Join video call (patient only)
  joinCall: async (appointmentId) => {
    const response = await httpClient.post(`/appointments/${appointmentId}/call/join`);
    return response;
  },

  // End video call (either party)
  endCall: async (appointmentId) => {
    const response = await httpClient.post(`/appointments/${appointmentId}/call/end`);
    return response;
  },
};

// ============================================
// Emergency APIs
// ============================================

export const emergencyAPI = {
  // Create emergency request
  createEmergencyRequest: async (requestData) => {
    const response = await httpClient.post('/emergency/request', requestData);
    return response;
  },

  // Get nearby emergency requests (doctor only)
  getNearbyEmergencyRequests: async (latitude, longitude, radius = 5) => {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
    });
    const response = await httpClient.get(`/emergency/nearby?${params.toString()}`);
    return response;
  },

  // Accept emergency request (doctor only)
  acceptEmergencyRequest: async (requestId) => {
    const response = await httpClient.post(`/emergency/${requestId}/accept`, {});
    return response;
  },

  // Update emergency status
  updateEmergencyStatus: async (requestId, status) => {
    const response = await httpClient.put(`/emergency/${requestId}/status`, { status });
    return response;
  },

  // Get emergency chat messages
  getChatMessages: async (requestId) => {
    const response = await httpClient.get(`/emergency/${requestId}/messages`);
    return response;
  },

  // Send chat message
  sendChatMessage: async (requestId, message) => {
    const response = await httpClient.post(`/emergency/${requestId}/messages`, { message });
    return response;
  },

  // Get active emergency for patient
  getActiveEmergency: async () => {
    const response = await httpClient.get('/emergency/active');
    return response;
  },

  // Cancel emergency
  cancelEmergency: async (requestId) => {
    const response = await httpClient.put(`/emergency/${requestId}/status`, {
      status: EMERGENCY_STATUS.CANCELLED,
    });
    return response;
  },
};

// ============================================
// Medical Records APIs
// ============================================

export const medicalRecordsAPI = {
  // Get all medical records
  getRecords: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.patientId) params.append('patientId', filters.patientId);
    if (filters.type) params.append('type', filters.type);

    const queryString = params.toString();
    const endpoint = queryString ? `/medical-records?${queryString}` : '/medical-records';

    const response = await httpClient.get(endpoint);
    return response;
  },

  // Alias for backward compatibility
  getMedicalRecords: async (patientId) => {
    const endpoint = patientId ? `/medical-records?patientId=${patientId}` : '/medical-records';
    const response = await httpClient.get(endpoint);
    return response;
  },

  // Get record by ID
  getRecordById: async (recordId) => {
    const response = await httpClient.get(`/medical-records/${recordId}`);
    return response;
  },

  // Upload medical record
  uploadRecord: async (recordData) => {
    const formData = new FormData();
    formData.append('title', recordData.title || '');
    formData.append('type', recordData.type || 'other');
    if (recordData.description) formData.append('description', recordData.description);
    if (recordData.recordDate) formData.append('recordDate', recordData.recordDate);

    const files = recordData.files || (recordData.file ? [recordData.file] : []);
    files.forEach((file, index) => {
      appendUploadFile(formData, 'files', file, `record_${Date.now()}_${index}.jpg`);
    });

    const response = await httpClient.post('/medical-records', formData);
    return response;
  },

  // Delete record
  deleteRecord: async (recordId) => {
    const response = await httpClient.delete(`/medical-records/${recordId}`);
    return response;
  },

  // Update record status
  updateRecordStatus: async (recordId, status) => {
    const response = await httpClient.patch(`/medical-records/${recordId}/status`, { status });
    return response;
  },

  // Load pending records for doctor verification
  loadPendingRecords: async () => {
    const response = await httpClient.get('/medical-records/pending');
    return response;
  },

  // Update prescription
  updatePrescription: async (recordId, updates) => {
    const response = await httpClient.patch(`/medical-records/${recordId}/prescription`, updates);
    return response;
  },

  // Verify a medical record (doctor only)
  verifyRecord: async (recordId) => {
    const response = await httpClient.patch(`/medical-records/${recordId}/verify`, {});
    return response;
  },

  // Reject a medical record (doctor only)
  rejectRecord: async (recordId, reason) => {
    const response = await httpClient.patch(`/medical-records/${recordId}/reject`, { reason });
    return response;
  },

  // Get prescription by appointment ID
  getPrescriptionByAppointment: async (appointmentId) => {
    const response = await httpClient.get(`/appointments/${appointmentId}/prescription`);
    return response;
  },
};

// ============================================
// Medication APIs
// ============================================

export const medicationAPI = {
  // Get medications
  getMedications: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.patientId) params.append('patientId', filters.patientId);
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/medications?${queryString}` : '/medications';

    const response = await httpClient.get(endpoint);
    return response;
  },

  // Alias for backward compatibility - get active medications
  getActiveMedications: async (patientId) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    const queryString = params.toString();
    const endpoint = queryString ? `/medications/active?${queryString}` : '/medications/active';
    const response = await httpClient.get(endpoint);
    return response;
  },

  // Add medication
  addMedication: async (medicationData) => {
    const response = await httpClient.post('/medications', medicationData);
    return response;
  },

  // Update medication
  updateMedication: async (medicationId, updates) => {
    const response = await httpClient.patch(`/medications/${medicationId}`, updates);
    return response;
  },

  // Update medication status
  updateMedicationStatus: async (medicationId, status) => {
    const response = await httpClient.patch(`/medications/${medicationId}/status`, { status });
    return response;
  },
};

// ============================================
// Notification APIs
// ============================================

export const notificationAPI = {
  // Get notifications
  getNotifications: async () => {
    const response = await httpClient.get('/notifications');
    return response;
  },

  // Mark as read
  markAsRead: async (notificationId) => {
    const response = await httpClient.patch(`/notifications/${notificationId}/read`, {});
    return response;
  },

  // Mark all as read
  markAllAsRead: async () => {
    const response = await httpClient.post('/notifications/read-all', {});
    return response;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await httpClient.get('/notifications/unread-count');
    return response;
  },
};

// ============================================
// Consent APIs
// ============================================

export const consentAPI = {
  // Get patient consents
  getConsents: async () => {
    const response = await httpClient.get('/consents');
    return response;
  },

  // Grant consultation consent
  grantConsultationConsent: async (doctorId, appointmentId) => {
    const response = await httpClient.post('/consents', {
      doctorId,
      appointmentId,
      type: CONSENT_TYPES.CONSULTATION,
    });
    return response;
  },

  // Create consultation consent (alias)
  createConsultationConsent: async ({ doctorId, appointmentId }) => {
    const response = await httpClient.post('/consents', {
      doctorId,
      appointmentId,
      type: CONSENT_TYPES.CONSULTATION,
    });
    return response;
  },

  // Grant extended consent
  grantExtendedConsent: async (doctorId) => {
    const response = await httpClient.post('/consents', {
      doctorId,
      type: CONSENT_TYPES.EXTENDED,
    });
    return response;
  },

  // Create extended consent (alias)
  createExtendedConsent: async ({ doctorId }) => {
    const response = await httpClient.post('/consents', {
      doctorId,
      type: CONSENT_TYPES.EXTENDED,
    });
    return response;
  },

  // Revoke consent
  revokeConsent: async (consentId) => {
    const response = await httpClient.delete(`/consents/${consentId}`);
    return response;
  },

  // Revoke extended consent
  revokeExtendedConsent: async ({ doctorId }) => {
    const response = await httpClient.delete('/consents/extended', {
      body: { doctorId }
    });
    return response;
  },

  // Check access status
  checkAccess: async (doctorId, patientId) => {
    const params = new URLSearchParams({ doctorId, patientId });
    const response = await httpClient.get(`/consents/access?${params.toString()}`);
    return response;
  },

  // Get access status (alias used by PatientContext)
  getAccessStatus: async ({ patientId, doctorId, appointmentId }) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    if (doctorId) params.append('doctorId', doctorId);
    if (appointmentId) params.append('appointmentId', appointmentId);

    try {
      const response = await httpClient.get(`/consents/access?${params.toString()}`);
      return response;
    } catch (_error) {
      // Return default status if endpoint doesn't exist
      return { success: true, status: 'NO_ACCESS', type: null };
    }
  },
};

// ============================================
// Access Request APIs
// ============================================

export const accessRequestAPI = {
  // Request access to patient records
  requestAccess: async (patientId, appointmentId) => {
    const response = await httpClient.post('/access-requests', {
      patientId,
      appointmentId,
    });
    return response;
  },

  // Get pending access requests (for patient)
  getPendingRequests: async () => {
    const response = await httpClient.get('/access-requests/pending');
    return response;
  },

  // Approve access request
  approveRequest: async (requestId) => {
    const response = await httpClient.put(`/access-requests/${requestId}/approve`, {});
    return response;
  },

  // Deny access request
  denyRequest: async (requestId) => {
    const response = await httpClient.put(`/access-requests/${requestId}/deny`, {});
    return response;
  },

  // Cancel access request
  cancelRequest: async (requestId) => {
    const response = await httpClient.put(`/access-requests/${requestId}/cancel`, {});
    return response;
  },
};

// ============================================
// Analytics APIs (Doctor only)
// ============================================

export const analyticsAPI = {
  // Get doctor analytics
  getAnalytics: async (period = 'month') => {
    const response = await httpClient.get(`/analytics?period=${period}`);
    return response;
  },

  // Get doctor analytics with filter options (used by DoctorContext)
  getDoctorAnalytics: async (filter = {}) => {
    const params = new URLSearchParams();
    if (filter.period) params.append('period', filter.period);
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);

    const queryString = params.toString();
    const endpoint = queryString ? `/analytics/doctor?${queryString}` : '/analytics/doctor';

    const response = await httpClient.get(endpoint);
    return response;
  },

  // Get revenue analytics
  getRevenueAnalytics: async (period = 'month') => {
    const response = await httpClient.get(`/analytics/revenue?period=${period}`);
    return response;
  },

  // Get patient analytics
  getPatientAnalytics: async (period = 'month') => {
    const response = await httpClient.get(`/analytics/patients?period=${period}`);
    return response;
  },
};

// Alias for backward compatibility (singular name)
export const medicalRecordAPI = medicalRecordsAPI;

// Default export for backward compatibility
export default {
  authAPI,
  patientAPI,
  doctorAPI,
  appointmentAPI,
  emergencyAPI,
  medicalRecordsAPI,
  medicalRecordAPI,
  medicationAPI,
  notificationAPI,
  consentAPI,
  accessRequestAPI,
  analyticsAPI,
  setCurrentUser,
  getCurrentUserLocal,
};
