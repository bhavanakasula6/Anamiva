const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const MedicalRecord = require('../models/medicalrecord');
const Consent = require('../models/consent');
const Medication = require('../models/medication');
const crypto = require('crypto');
const { createNotification } = require('../services/notificationservice');
const { dateOnlyToUtc, getIndiaDateString, parseAppointmentDateTime } = require('../utils/appointmenttime');
const { normalizeDuration, calculateEndDate } = require('../utils/medicationduration');

const parseOptionalDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

// Robust helper to resolve name from user object
const getSafeName = (user) => {
  if (!user) return 'Unknown';

  // Check various name fields, ignoring literal "undefined" strings
  const fullName = (user.fullName && user.fullName !== 'undefined' && user.fullName !== '') ? user.fullName : null;
  const name = (user.name && user.name !== 'undefined' && user.name !== '') ? user.name : null;
  const firstName = (user.firstName && user.firstName !== 'undefined' && user.firstName !== '') ? user.firstName : null;
  const lastName = (user.lastName && user.lastName !== 'undefined' && user.lastName !== '') ? user.lastName : null;

  if (fullName) return fullName;
  if (name) return name;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;

  return 'Unknown';
};

const parseDateOfBirth = (dateOfBirth) => {
  if (!dateOfBirth || dateOfBirth === 'undefined') return null;

  if (dateOfBirth instanceof Date) {
    return Number.isNaN(dateOfBirth.getTime()) ? null : dateOfBirth;
  }

  const value = String(dateOfBirth).trim();
  if (!value) return null;

  const ddMmYyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddMmYyyy) {
    const [, day, month, year] = ddMmYyyy.map(Number);
    const dob = new Date(year, month - 1, day);
    return (
      dob.getFullYear() === year &&
      dob.getMonth() === month - 1 &&
      dob.getDate() === day
    ) ? dob : null;
  }

  const yyyyMmDd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yyyyMmDd) {
    const [, year, month, day] = yyyyMmDd.map(Number);
    const dob = new Date(year, month - 1, day);
    return (
      dob.getFullYear() === year &&
      dob.getMonth() === month - 1 &&
      dob.getDate() === day
    ) ? dob : null;
  }

  try {
    const dob = new Date(value);
    return Number.isNaN(dob.getTime()) ? null : dob;
  } catch {
    return null;
  }
};

// Robust helper to calculate age
const calculateAge = (dateOfBirth) => {
  const dob = parseDateOfBirth(dateOfBirth);
  if (!dob) return '-';

  try {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age.toString() : '-';
  } catch {
    return '-';
  }
};

const parseDateOnly = (date) => {
  return dateOnlyToUtc(date);
};

const getAppointmentDateRange = (date) => {
  const day = parseDateOnly(date);
  return {
    startOfDay: day,
    endOfDay: new Date(day.getTime() + 24 * 60 * 60 * 1000 - 1),
  };
};

// Transform appointment for frontend
const transformAppointment = (apt) => {
  const aptObj = apt.toObject ? apt.toObject() : apt;

  return {
    ...aptObj,
    id: aptObj._id.toString(),
    patientId: aptObj.patientId?._id?.toString() || aptObj.patientId?.toString(),
    doctorId: aptObj.doctorId?._id?.toString() || aptObj.doctorId?.toString(),
    // Map patientId -> patient for frontend
    patient: aptObj.patientId ? {
      id: aptObj.patientId._id?.toString() || aptObj.patientId.toString(),
      name: getSafeName(aptObj.patientId),
      avatar: aptObj.patientId.avatar || null,
      age: calculateAge(aptObj.patientId.dateOfBirth),
      dateOfBirth: aptObj.patientId.dateOfBirth || null,
      gender: (aptObj.patientId.gender && aptObj.patientId.gender !== 'undefined') ? aptObj.patientId.gender : '-',
      phone: aptObj.patientId.phone || aptObj.patientId.phoneNumber,
    } : null,
    // Map doctorId -> doctor for frontend
    doctor: aptObj.doctorId ? {
      id: aptObj.doctorId._id?.toString() || aptObj.doctorId.toString(),
      name: getSafeName(aptObj.doctorId.userId || aptObj.doctorId), // Look in populated userId or Doctor itself
      avatar: aptObj.doctorId.avatar || aptObj.doctorId.userId?.avatar || null,
      specialization: aptObj.doctorId.specialization || aptObj.doctorId.speciality || null,
      consultationFee: aptObj.doctorId.consultationFee || 0,
    } : null,
    // Video call fields
    videoCallRoomId: aptObj.videoCallRoomId || null,
    callStatus: aptObj.callStatus || 'idle',
    callStartedAt: aptObj.callStartedAt || null,
    callEndedAt: aptObj.callEndedAt || null,
  };
};

/* =========================
   BOOK APPOINTMENT
   - 30-minute slots
   - Max 30 days in advance
   - Auto video link for online
========================= */
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, type, symptoms } = req.body;

    // Validate 30-minute slot format (HH:00 or HH:30)
    if (time) {
      const minutes = time.split(':')[1];
      if (minutes !== '00' && minutes !== '30') {
        return res.status(400).json({
          success: false,
          message: 'Appointments must be on 30-minute slots (e.g. 09:00, 09:30)',
        });
      }
    }

    // Validate date range — parse YYYY-MM-DD safely to avoid timezone issues
    const now = new Date();

    // Compare date only (strip time) — allow booking today
    const appointmentDay = dateOnlyToUtc(date);
    const today = dateOnlyToUtc(getIndiaDateString(now));

    if (appointmentDay < today) {
      return res.status(400).json({ success: false, message: 'Cannot book appointments in the past' });
    }

    // If booking today, check the time slot hasn't passed
    if (appointmentDay.getTime() === today.getTime() && time) {
      const slotTime = parseAppointmentDateTime(date, time);
      if (slotTime <= now) {
        return res.status(400).json({ success: false, message: 'This time slot has already passed' });
      }
    }

    const maxDate = dateOnlyToUtc(getIndiaDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
    if (appointmentDay > maxDate) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book more than 30 days in advance',
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const startHour = Number.isFinite(doctor.consultingHours?.start) ? doctor.consultingHours.start : 9;
    const endHour = Number.isFinite(doctor.consultingHours?.end) ? doctor.consultingHours.end : 17;
    const [slotHour, slotMinute] = time.split(':').map(Number);
    const slotStartMinutes = slotHour * 60 + slotMinute;
    const slotEndMinutes = slotStartMinutes + 30;

    if (slotStartMinutes < startHour * 60 || slotEndMinutes > endHour * 60) {
      return res.status(400).json({
        success: false,
        message: `Selected time is outside the doctor's consulting hours (${String(startHour).padStart(2, '0')}:00-${String(endHour).padStart(2, '0')}:00)`,
      });
    }

    // Check slot availability
    const { startOfDay, endOfDay } = getAppointmentDateRange(date);
    const existing = await Appointment.findOne({
      doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      time,
      status: { $in: ['pending', 'upcoming'] },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Time slot already booked' });

    // Auto-generate video link for online appointments
    let videoLink = null;
    if (type === 'online') {
      videoLink = `https://meet.medapp.com/${crypto.randomBytes(8).toString('hex')}`;
    }

    const appointment = await Appointment.create({
      patientId: req.user.id,
      doctorId,
      date,
      time,
      type,
      symptoms,
      videoLink,
    });

    // Populate doctor and patient data for frontend
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    const doctorProfile = await Doctor.findById(doctorId);
    if (doctorProfile) {
      await createNotification({
        userId: doctorProfile.userId,
        title: 'New appointment request',
        message: `${getSafeName(populated.patientId)} requested an appointment for ${date} at ${time}.`,
        type: 'appointment',
        data: { appointmentId: appointment._id.toString(), status: appointment.status },
      });
    }

    await createNotification({
      userId: appointment.patientId,
      title: 'Appointment request submitted',
      message: `Your appointment request for ${date} at ${time} was submitted.`,
      type: 'appointment',
      data: { appointmentId: appointment._id.toString(), status: appointment.status },
    });

    // Notify doctor via socket so their dashboard updates in real-time
    try {
      const doctorProfile = await Doctor.findById(doctorId);
      if (doctorProfile) {
        const { getIO } = require('../sockets/socket');
        const io = getIO();
        io.to(`user_${doctorProfile.userId.toString()}`).emit('appointment-booked', {
          appointmentId: appointment._id.toString(),
          status: 'pending',
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    res.status(201).json({ success: true, appointment: transformAppointment(populated), message: 'Appointment booked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET ALL APPOINTMENTS
   - Supports status, startDate, endDate, page, limit
========================= */
exports.getAppointments = async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;
    let filter = {};

    // Appointment completion is always an explicit doctor action.
    // A prescription or a past appointment must never auto-close the appointment.

    if (req.user.role === "patient") {
      filter.patientId = req.user.id;
    }
    else if (req.user.role === "doctor") {
      const doctorProfile = await Doctor.findOne({ userId: req.user.id });
      if (doctorProfile) {
        filter.doctorId = doctorProfile._id;
      } else {
        return res.json({
          success: true,
          appointments: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 }
        });
      }
    }

    if (status) {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const appointments = await Appointment.find(filter)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Appointment.countDocuments(filter);

    const transformedAppointments = appointments.map(apt => transformAppointment(apt));

    res.json({
      success: true,
      appointments: transformedAppointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('[getAppointments] ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET APPOINTMENT BY ID
========================= */
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const prescription = await MedicalRecord.findOne({
      appointmentId: appointment._id,
      type: 'prescription',
    }).sort({ createdAt: -1 });

    const transformedAppointment = transformAppointment(appointment);
    if (prescription) {
      transformedAppointment.prescriptionId = prescription._id.toString();
      transformedAppointment.prescription = {
        id: prescription._id.toString(),
        ...prescription.toObject(),
        date: prescription.recordDate || prescription.createdAt,
      };
    }

    res.json({
      success: true,
      appointment: transformedAppointment
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   UPDATE STATUS (Doctor Only)
========================= */
exports.updateStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // For doctors, compare against their doctor profile ID
    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: req.user.id });
      if (!doctorProfile || !appointment.doctorId || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'upcoming', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment status' });
    }

    if (status === 'completed') {
      const appointmentDateTime = parseAppointmentDateTime(appointment.date, appointment.time);
      appointmentDateTime.setMinutes(appointmentDateTime.getMinutes() + 30);

      if (new Date() < appointmentDateTime) {
        return res.status(400).json({
          success: false,
          error: 'APPOINTMENT_NOT_FINISHED',
          message: 'The appointment can be closed only after its scheduled time.',
        });
      }

      const prescriptionExists = await MedicalRecord.exists({
        appointmentId: appointment._id,
        type: 'prescription',
      });
      if (!prescriptionExists) {
        return res.status(400).json({
          success: false,
          error: 'PRESCRIPTION_REQUIRED',
          message: 'Add the prescription before completing this appointment.',
        });
      }
    }

    if (status === 'no_show') {
      const prescriptionExists = await MedicalRecord.exists({
        appointmentId: appointment._id,
        type: 'prescription',
      });
      if (prescriptionExists) {
        return res.status(400).json({
          success: false,
          error: 'PRESCRIPTION_ALREADY_EXISTS',
          message: 'This appointment has a prescription and cannot be marked as no-show.',
        });
      }

      if (!['pending', 'upcoming'].includes(appointment.status)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_APPOINTMENT_STATE',
          message: 'Only pending or upcoming appointments can be marked as no-show.',
        });
      }

      const appointmentEnd = parseAppointmentDateTime(appointment.date, appointment.time);
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + 30);
      if (new Date() < appointmentEnd) {
        return res.status(400).json({
          success: false,
          error: 'APPOINTMENT_NOT_FINISHED',
          message: 'An appointment can be marked as no-show only after its scheduled period.',
        });
      }

      appointment.noShowReason = String(reason || '').trim() || 'Patient did not attend the appointment.';
      appointment.noShowAt = new Date();
    }

    appointment.status = status;

    // Auto-generate video call room ID when online appointment becomes upcoming
    if (status === 'upcoming' && appointment.type === 'online' && !appointment.videoCallRoomId) {
      appointment.videoCallRoomId = crypto.randomBytes(16).toString('hex');
    }

    await appointment.save();

    const statusMessages = {
      upcoming: 'Your appointment has been accepted.',
      cancelled: 'Your appointment has been cancelled.',
      completed: 'Your appointment has been marked as completed.',
      no_show: 'Your appointment was marked as no-show by the doctor.',
    };
    await createNotification({
      userId: appointment.patientId,
      title: 'Appointment updated',
      message: statusMessages[status] || `Appointment status changed to ${status}.`,
      type: 'appointment',
      data: { appointmentId: appointment._id.toString(), status },
    });

    if (status === 'completed' || status === 'cancelled' || status === 'no_show') {
      await Consent.updateMany(
        {
          appointmentId: appointment._id,
          type: 'consultation',
          status: 'active',
        },
        {
          $set: {
            status: 'expired',
            expiresAt: new Date(),
          },
        }
      );
    }

    // Notify patient via socket so their UI updates in real-time
    const { getIO } = require('../sockets/socket');
    try {
      const io = getIO();
      io.to(`user_${appointment.patientId.toString()}`).emit('appointment-updated', {
        appointmentId: appointment._id.toString(),
        status,
      });
      const doctorProfile = await Doctor.findById(appointment.doctorId);
      if (doctorProfile) {
        io.to(`user_${doctorProfile.userId.toString()}`).emit('appointment-updated', {
          appointmentId: appointment._id.toString(),
          status,
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    // Re-populate so transformAppointment has full patient/doctor data
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   CANCEL APPOINTMENT
   - Must cancel 24+ hours before (else no refund)
========================= */
exports.cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (appointment.patientId.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    // Check 24-hour cancellation window
    const appointmentDateTime = parseAppointmentDateTime(appointment.date, appointment.time);

    const hoursUntilAppointment = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
    const eligibleForRefund = hoursUntilAppointment >= 24;

    appointment.status = 'cancelled';
    appointment.cancelReason = reason;

    if (!eligibleForRefund) {
      appointment.refund = { amount: 0, status: 'processed' };
    }

    await appointment.save();

    await Consent.updateMany(
      {
        appointmentId: appointment._id,
        type: 'consultation',
        status: 'active',
      },
      {
        $set: {
          status: 'expired',
          expiresAt: new Date(),
        },
        }
      );

    const cancelledDoctor = await Doctor.findById(appointment.doctorId);
    if (cancelledDoctor) {
      await createNotification({
        userId: cancelledDoctor.userId,
        title: 'Appointment cancelled',
        message: 'A patient cancelled an appointment.',
        type: 'appointment',
        data: { appointmentId: appointment._id.toString(), status: 'cancelled' },
      });
    }

    try {
      const { getIO } = require('../sockets/socket');
      const io = getIO();
      const doctorProfile = await Doctor.findById(appointment.doctorId);
      if (doctorProfile) {
        io.to(`user_${doctorProfile.userId.toString()}`).emit('appointment-updated', {
          appointmentId: appointment._id.toString(),
          status: appointment.status,
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    // Re-populate so transformAppointment has full patient/doctor data
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({
      success: true,
      appointment: transformAppointment(populated),
      refundEligible: eligibleForRefund,
      message: eligibleForRefund
        ? 'Appointment cancelled. Refund will be processed.'
        : 'Appointment cancelled. No refund (less than 24 hours notice).',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   RESCHEDULE APPOINTMENT
========================= */
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { date, time } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (appointment.patientId.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    appointment.date = date;
    appointment.time = time;
    appointment.status = 'upcoming';
    await appointment.save();

    const rescheduledDoctor = await Doctor.findById(appointment.doctorId);
    if (rescheduledDoctor) {
      await createNotification({
        userId: rescheduledDoctor.userId,
        title: 'Appointment rescheduled',
        message: `An appointment was rescheduled to ${date} at ${time}.`,
        type: 'appointment',
        data: { appointmentId: appointment._id.toString(), status: 'upcoming' },
      });
    }

    // Re-populate so transformAppointment has full patient/doctor data
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   ADD CLINICAL NOTES
========================= */
exports.addNotes = async (req, res) => {
  try {
    const { notes, diagnosis } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const doctorProfile = await Doctor.findOne({ userId: req.user.id });
    if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    appointment.notes = notes;
    appointment.diagnosis = diagnosis;
    await appointment.save();

    // Re-populate so transformAppointment has full patient/doctor data
    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   SUBMIT PATIENT RATING
========================= */
exports.submitRating = async (req, res) => {
  try {
    const score = Number(req.body.rating);
    const review = String(req.body.review || '').trim();
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (appointment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Rating is available after the consultation is completed' });
    }
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    if (appointment.rating) {
      return res.status(409).json({ success: false, message: 'This appointment has already been rated' });
    }

    appointment.rating = score;
    appointment.review = review;
    appointment.ratedAt = new Date();
    await appointment.save();

    const doctorRatings = await Appointment.find({
      doctorId: appointment.doctorId,
      rating: { $exists: true, $ne: null },
    }).select('rating');
    const average = doctorRatings.length
      ? doctorRatings.reduce((sum, item) => sum + item.rating, 0) / doctorRatings.length
      : 0;
    await Doctor.findByIdAndUpdate(appointment.doctorId, {
      rating: Math.round(average * 10) / 10,
      reviewCount: doctorRatings.length,
    });

    const doctorProfile = await Doctor.findById(appointment.doctorId);
    if (doctorProfile) {
      await createNotification({
        userId: doctorProfile.userId,
        title: 'New consultation rating',
        message: `A patient rated your consultation ${score}/5.`,
        type: 'appointment',
        data: { appointmentId: appointment._id.toString(), rating: score },
      });
    }

    res.json({ success: true, appointment: transformAppointment(appointment) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   CREATE PRESCRIPTION (Doctor only)
   - Creates a MedicalRecord of type 'prescription'
   - Links to appointment via appointmentId
========================= */
exports.createPrescription = async (req, res) => {
  try {
    const { medications, diagnosis, notes, recordDate } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Verify doctor authorization
    const doctorProfile = await Doctor.findOne({ userId: req.user.id });
    if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const existingPrescription = await MedicalRecord.findOne({
      appointmentId: appointment._id,
      type: 'prescription',
    });
    if (existingPrescription) {
      return res.status(409).json({
        success: false,
        error: 'PRESCRIPTION_ALREADY_EXISTS',
        message: 'A prescription already exists for this appointment',
      });
    }

    // Build prescription description from medications
    let prescriptionDesc = '';
    if (medications && Array.isArray(medications)) {
      prescriptionDesc = medications.map(m =>
        `${m.name} - ${m.dosage || ''} ${m.frequency || ''}`
      ).join('; ');
    }

    // Create medical record as prescription
    const prescriptionDate = parseOptionalDate(recordDate) || new Date();
    const normalizedMedications = Array.isArray(medications)
      ? medications.map((med) => {
          const normalized = normalizeDuration(med);
          return {
            ...med,
            ...(normalized || {}),
          };
        })
      : [];

    const hasInvalidDuration = normalizedMedications.some(
      (med) => med.name && med.dosage && !normalizeDuration(med)
    );
    if (hasInvalidDuration) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MEDICATION_DURATION',
        message: 'Each medication must have a positive duration value and a unit: days, weeks, or months.',
      });
    }

    const record = await MedicalRecord.create({
      patientId: appointment.patientId,
      doctorId: doctorProfile._id,
      appointmentId: appointment._id,
      title: `Prescription - ${(parseOptionalDate(recordDate) || new Date()).toLocaleDateString()}`,
      description: prescriptionDesc || 'Prescription',
      type: 'prescription',
      diagnosis: diagnosis || '',
      notes: notes || '',
      recordDate: prescriptionDate,
      medications: normalizedMedications,
      status: 'verified',
    });

    await createNotification({
      userId: appointment.patientId,
      title: 'New prescription available',
      message: 'Your doctor added a prescription to your appointment.',
      type: 'medication',
      data: { appointmentId: appointment._id.toString(), prescriptionId: record._id.toString() },
    });

    const createdMedications = [];
    if (Array.isArray(medications)) {
      for (const med of normalizedMedications.filter(m => m.name && m.dosage)) {
        const medicationDuration = normalizeDuration(med);
        const startDate = med.startDate || prescriptionDate;
        const medication = await Medication.create({
          patientId: appointment.patientId,
          doctorId: doctorProfile._id,
          prescriptionRecordId: record._id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency || '',
          duration: medicationDuration?.duration || med.duration || '',
          durationValue: medicationDuration?.durationValue,
          durationUnit: medicationDuration?.durationUnit,
          startDate,
          endDate: med.endDate || calculateEndDate(startDate, medicationDuration),
          active: true,
        });
        createdMedications.push(medication);
      }
    }

    try {
      const { getIO } = require('../sockets/socket');
      getIO().to(`user_${appointment.patientId.toString()}`).emit('prescription-updated', {
        appointmentId: appointment._id.toString(),
        prescriptionId: record._id.toString(),
      });
      getIO().to(`user_${appointment.patientId.toString()}`).emit('medication-updated', {
        patientId: appointment.patientId.toString(),
        prescriptionId: record._id.toString(),
      });
    } catch (socketErr) {
      console.warn('Socket emit failed:', socketErr.message);
    }

    res.status(201).json({
      success: true,
      prescription: {
        id: record._id.toString(),
        ...record.toObject(),
        date: record.recordDate || record.createdAt,
        medications: normalizedMedications,
      },
      medications: createdMedications,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET PRESCRIPTION BY APPOINTMENT
========================= */
exports.getPrescription = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user.role === 'patient' && appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: req.user.id });
      if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
    }

    const prescription = await MedicalRecord.findOne({
      appointmentId: appointment._id,
      type: 'prescription',
    }).sort({ createdAt: -1 });

    if (!prescription) {
      return res.json({ success: true, prescription: null });
    }

    res.json({
      success: true,
      prescription: {
        id: prescription._id.toString(),
        ...prescription.toObject(),
        date: prescription.recordDate || prescription.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   START VIDEO CALL (Doctor)
========================= */
exports.startCall = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const doctorProfile = await Doctor.findOne({ userId: req.user.id });
    if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to start this call' });
    }

    if (appointment.type !== 'online') {
      return res.status(400).json({ success: false, message: 'Video calls are only for online appointments' });
    }

    // Ensure a room ID exists
    if (!appointment.videoCallRoomId) {
      appointment.videoCallRoomId = crypto.randomBytes(16).toString('hex');
    }

    appointment.callStatus = 'ringing';
    await appointment.save();

    // Notify patient via Socket.IO
    const { getIO } = require('../sockets/socket');
    try {
      const io = getIO();
      const populatedDoctor = await Doctor.findById(appointment.doctorId).populate('userId');
      io.to(`user_${appointment.patientId.toString()}`).emit('incoming-call', {
        appointmentId: appointment._id.toString(),
        roomId: appointment.videoCallRoomId,
        caller: {
          id: appointment.doctorId.toString(),
          name: getSafeName(populatedDoctor?.userId || populatedDoctor),
          role: 'doctor',
        },
      });
    } catch (socketErr) {
      console.warn('Socket notification failed:', socketErr.message);
    }

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   JOIN VIDEO CALL (Patient)
========================= */
exports.joinCall = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to join this call' });
    }

    if (!appointment.videoCallRoomId) {
      return res.status(400).json({ success: false, message: 'No active call for this appointment' });
    }

    appointment.callStatus = 'in_progress';
    appointment.callStartedAt = new Date();
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   END VIDEO CALL
========================= */
exports.endCall = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    const doctorProfile = req.user.role === 'doctor'
      ? await Doctor.findOne({ userId: req.user.id })
      : null;
    const isParticipant = appointment.patientId.toString() === req.user.id
      || doctorProfile?._id?.toString() === appointment.doctorId.toString();
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorized to end this call' });
    }

    appointment.callStatus = 'ended';
    appointment.callEndedAt = new Date();
    await appointment.save();

    // Notify the other party
    const { getIO } = require('../sockets/socket');
    try {
      const io = getIO();
      io.to(`call_${appointment.videoCallRoomId}`).emit('call-ended', {
        appointmentId: appointment._id.toString(),
      });
    } catch (socketErr) {
      console.warn('Socket notification failed:', socketErr.message);
    }

    const populated = await Appointment.findById(appointment._id)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    res.json({ success: true, appointment: transformAppointment(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
