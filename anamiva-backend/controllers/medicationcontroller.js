const Medication = require('../models/medication');
const { normalizeDuration, calculateEndDate } = require('../utils/medicationduration');

const emitMedicationUpdated = (patientId, medicationId) => {
  try {
    const { getIO } = require('../sockets/socket');
    getIO().to(`user_${patientId.toString()}`).emit('medication-updated', {
      patientId: patientId.toString(),
      medicationId: medicationId?.toString?.() || null,
    });
  } catch (socketErr) {
    console.warn('Socket emit failed:', socketErr.message);
  }
};

const getSafeName = (user) => {
  if (!user) return '';
  return (
    user.fullName ||
    user.name ||
    (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '') ||
    ''
  );
};

const transformMedication = (medication) => {
  const med = medication.toObject ? medication.toObject() : medication;
  const doctorUser = med.doctorId?.userId;

  return {
    ...med,
    id: med._id?.toString?.() || med.id,
    prescribedBy: getSafeName(doctorUser || med.doctorId) || 'Doctor',
  };
};

// Older prescriptions stored the duration as free text and did not always have
// an endDate. Normalize those records before applying active/expired filters.
const normalizeMedicationSchedule = async (medication, now = new Date()) => {
  const duration = normalizeDuration(medication);
  const startDate = medication.startDate || medication.createdAt || now;
  const updates = {};

  if (duration) {
    if (medication.duration !== duration.duration) updates.duration = duration.duration;
    if (medication.durationValue !== duration.durationValue) updates.durationValue = duration.durationValue;
    if (medication.durationUnit !== duration.durationUnit) updates.durationUnit = duration.durationUnit;

    if (!medication.endDate || Number.isNaN(new Date(medication.endDate).getTime())) {
      updates.endDate = calculateEndDate(startDate, duration);
    }
  }

  if (!medication.startDate && startDate) updates.startDate = startDate;
  if (updates.endDate && new Date(updates.endDate) < now) updates.active = false;
  if (medication.active !== false && medication.endDate && new Date(medication.endDate) < now) {
    updates.active = false;
  }

  if (Object.keys(updates).length) {
    Object.assign(medication, updates);
    await medication.save();
  }
  return medication;
};

/* =========================
   ADD MEDICATION
========================= */
exports.addMedication = async (req, res) => {
  try {
    const duration = normalizeDuration(req.body);
    const startDate = req.body.startDate || new Date();
    const medication = await Medication.create({
      patientId: req.user.id,
      ...req.body,
      ...(duration || {}),
      prescribedDate: req.body.prescribedDate || startDate,
      startDate,
      endDate: req.body.endDate || calculateEndDate(startDate, duration),
    });
    emitMedicationUpdated(medication.patientId, medication._id);
    res.status(201).json({ success: true, medication });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET ALL MEDICATIONS
========================= */
exports.getMedications = async (req, res) => {
  try {
    const now = new Date();
    const medications = await Medication.find({ patientId: req.user.id })
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .sort({ createdAt: -1 });
    for (const medication of medications) await normalizeMedicationSchedule(medication, now);
    res.json({ success: true, medications: medications.map(transformMedication) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET ACTIVE MEDICATIONS
   - Filters by: no endDate OR endDate >= today, and active=true
========================= */
exports.getActiveMedications = async (req, res) => {
  try {
    const now = new Date();
    const requestedPatientId = req.user.role === 'doctor' && req.query.patientId
      ? req.query.patientId
      : req.user.id;
    const allMedications = await Medication.find({ patientId: requestedPatientId })
      .populate({ path: 'doctorId', populate: { path: 'userId' } });
    for (const medication of allMedications) await normalizeMedicationSchedule(medication, now);
    const medications = allMedications
      .filter((medication) => medication.active !== false)
      .filter((medication) => !medication.endDate || new Date(medication.endDate) >= now)
      .sort((a, b) => new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt));

    res.json({ success: true, medications: medications.map(transformMedication) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   UPDATE REMINDER SETTINGS
========================= */
exports.updateReminder = async (req, res) => {
  try {
    const { enabled, times } = req.body;

    const medication = await Medication.findOne({
      _id: req.params.medicationId,
      patientId: req.user.id,
    });

    if (!medication) {
      return res.status(404).json({ success: false, message: 'Medication not found' });
    }

    medication.reminder = {
      enabled: enabled !== undefined ? enabled : medication.reminder?.enabled || false,
      times: times || medication.reminder?.times || [],
    };
    await medication.save();
    emitMedicationUpdated(medication.patientId, medication._id);

    res.json({ success: true, medication });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
