const Medication = require('../models/medication');

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

/* =========================
   ADD MEDICATION
========================= */
exports.addMedication = async (req, res) => {
  try {
    const medication = await Medication.create({
      patientId: req.user.id,
      ...req.body,
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
    await Medication.updateMany(
      { patientId: req.user.id, active: { $ne: false }, endDate: { $lt: new Date() } },
      { $set: { active: false } }
    );
    const medications = await Medication.find({ patientId: req.user.id })
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .sort({ createdAt: -1 });
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
    await Medication.updateMany(
      { patientId: req.user.id, active: { $ne: false }, endDate: { $lt: now } },
      { $set: { active: false } }
    );
    const filter = {
      patientId: req.user.id,
      active: { $ne: false },
      $or: [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gte: now } },
      ],
    };

    if (req.user.role === 'doctor' && req.query.patientId) {
      filter.patientId = req.query.patientId;
    }

    const medications = await Medication.find(filter)
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .sort({ startDate: -1 });

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
