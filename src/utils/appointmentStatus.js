import { APPOINTMENT_STATUS } from '../data/constants';

export const isAppointmentSlotPast = (appointment, now = new Date()) => {
  if (!appointment?.date) return false;

  const appointmentDate = new Date(appointment.date);
  if (Number.isNaN(appointmentDate.getTime())) return false;

  const [hours, minutes] = String(appointment.time || '00:00').split(':').map(Number);
  appointmentDate.setHours(hours || 0, minutes || 0, 0, 0);
  appointmentDate.setMinutes(appointmentDate.getMinutes() + 30);
  return appointmentDate < now;
};

export const isMissedAppointment = (appointment, now = new Date()) =>
  [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.UPCOMING].includes(appointment?.status) &&
  isAppointmentSlotPast(appointment, now);

export const getAppointmentDisplayStatus = (appointment) =>
  isMissedAppointment(appointment) ? 'missed' : appointment?.status;
