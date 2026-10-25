import { APPOINTMENT_STATUS } from '../data/constants';

export const isAppointmentSlotPast = (appointment, now = new Date()) => {
  const appointmentStart = getAppointmentStartDate(appointment);
  if (!appointmentStart) return false;
  appointmentStart.setMinutes(appointmentStart.getMinutes() + 30);
  return appointmentStart < now;
};

// Appointment dates are stored as date-only values while time is stored separately.
// Build the instant in India time instead of allowing Date.parse to shift the date.
export const getAppointmentStartDate = (appointment) => {
  if (!appointment?.date) return null;
  const rawDate = String(appointment.date);
  const dateKey = /^\d{4}-\d{2}-\d{2}/.test(rawDate)
    ? rawDate.slice(0, 10)
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(appointment.date));
  const time = String(appointment.time || '00:00').slice(0, 5);
  const result = new Date(`${dateKey}T${time}:00+05:30`);
  return Number.isNaN(result.getTime()) ? null : result;
};

export const isMissedAppointment = (appointment, now = new Date()) =>
  [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.UPCOMING].includes(appointment?.status) &&
  isAppointmentSlotPast(appointment, now);

export const getAppointmentDisplayStatus = (appointment) =>
  isMissedAppointment(appointment)
    ? 'missed'
    : appointment?.status === APPOINTMENT_STATUS.NO_SHOW
      ? 'no-show'
      : appointment?.status;
