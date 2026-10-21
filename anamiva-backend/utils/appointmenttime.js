// Appointment dates/times are entered in India local time.
const INDIA_OFFSET_MINUTES = 330;

const getIndiaDateString = (date = new Date()) => {
  const indiaTime = new Date(date.getTime() + INDIA_OFFSET_MINUTES * 60 * 1000);
  return `${indiaTime.getUTCFullYear()}-${String(indiaTime.getUTCMonth() + 1).padStart(2, '0')}-${String(indiaTime.getUTCDate()).padStart(2, '0')}`;
};

const dateOnlyToUtc = (dateString) => {
  const [year, month, day] = String(dateString).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const parseAppointmentDateTime = (dateString, timeString = '00:00') => {
  const dateValue = dateString instanceof Date
    ? dateString.toISOString().slice(0, 10)
    : String(dateString).slice(0, 10);
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = String(timeString).split(':').map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hours || 0, minutes || 0) -
      INDIA_OFFSET_MINUTES * 60 * 1000
  );
};

module.exports = { dateOnlyToUtc, getIndiaDateString, parseAppointmentDateTime };
