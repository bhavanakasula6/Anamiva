const MedicalRecord = require('../models/medicalrecord');
const Medication = require('../models/medication');
const Doctor = require('../models/doctor');
const Consent = require('../models/consent');
const path = require('path');

const parseOptionalDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getDoctorProfileId = async (user) => {
  if (user.doctorInfo) return user.doctorInfo;
  const doctorProfile = await Doctor.findOne({ userId: user.id });
  return doctorProfile?._id || user.id;
};

const emitSocketEvent = (room, event, payload) => {
  try {
    const { getIO } = require('../sockets/socket');
    getIO().to(room).emit(event, payload);
  } catch (socketErr) {
    console.warn('Socket emit failed:', socketErr.message);
  }
};

/**
 * Robustly extract a name from a user object
 */
const getSafeName = (user) => {
  if (!user) return 'Unknown';

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

/**
 * Transform medical record for frontend
 */
const transformMedicalRecord = (rec) => {
  const recObj = rec.toObject ? rec.toObject() : rec;

  return {
    ...recObj,
    id: recObj._id.toString(),
    date: recObj.recordDate || recObj.createdAt,
    patient: recObj.patientId ? {
      id: recObj.patientId._id?.toString() || recObj.patientId.toString(),
      name: getSafeName(recObj.patientId),
      avatar: recObj.patientId.avatar || null,
    } : null,
    doctor: recObj.doctorId ? {
      id: recObj.doctorId._id?.toString() || recObj.doctorId.toString(),
      name: getSafeName(recObj.doctorId.userId || recObj.doctorId),
      avatar: recObj.doctorId.avatar || recObj.doctorId.userId?.avatar || null,
      specialization: recObj.doctorId.specialization || recObj.doctorId.speciality || null,
    } : null,
  };
};

/* =========================
   CREATE MEDICAL RECORD
   - Supports multipart/form-data with up to 10 files
   - Validates file types (JPEG, PNG, PDF) and size (5MB)
========================= */
exports.createMedicalRecord = async (req, res) => {
  try {
    // Validate file types if files are uploaded
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: `Invalid file type: ${file.originalname}. Only JPEG, PNG, and PDF are allowed.`,
          });
        }
      }
    }

    // Build file URLs from uploaded files
    const fileUrls = req.files
      ? req.files.map(f => `/uploads/${f.filename}`)
      : [];

    const record = await MedicalRecord.create({
      patientId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || 'other',
      fileUrl: fileUrls[0] || req.body.fileUrl || '',
      files: fileUrls,
      recordDate: parseOptionalDate(req.body.recordDate) || new Date(),
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      record: transformMedicalRecord(record)
    });

    emitSocketEvent('doctors', 'medical-record-created', {
      recordId: record._id.toString(),
      patientId: req.user.id,
      status: record.status,
    });
    emitSocketEvent(`user_${req.user.id}`, 'medical-record-updated', {
      recordId: record._id.toString(),
      status: record.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET MEDICAL RECORDS
   - Patients see their own records
   - Doctors can pass ?patientId= to see a specific patient's records
========================= */
exports.getMedicalRecords = async (req, res) => {
  try {
    let queryPatientId = req.user.id;
    const filter = {};

    // If a doctor requests records for a specific patient
    if (req.query.patientId && req.user.role === 'doctor') {
      queryPatientId = req.query.patientId;

      const doctorProfile = await Doctor.findOne({ userId: req.user.id });
      if (!doctorProfile) {
        return res.status(403).json({ success: false, message: 'Doctor profile not found' });
      }

      const consent = await Consent.findOne({
        patientId: queryPatientId,
        doctorId: doctorProfile._id,
        status: 'active',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } },
        ],
      });

      if (!consent) {
        return res.status(403).json({ success: false, message: 'Patient has not shared medical history access' });
      }
    }

    filter.patientId = queryPatientId;

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const records = await MedicalRecord.find(filter)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId' }
      })
      .sort({ createdAt: -1 });

    const transformedRecords = records.map(rec => transformMedicalRecord(rec));

    res.json({ success: true, records: transformedRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   GET PENDING RECORDS (Doctor - for verification)
========================= */
exports.getPendingRecords = async (req, res) => {
  try {
    const status = req.query.status || 'pending';

    const records = await MedicalRecord.find({ status })
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId' }
      })
      .sort({ createdAt: -1 });

    const transformedRecords = records.map(rec => transformMedicalRecord(rec));

    res.json({ success: true, records: transformedRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   VERIFY RECORD (Doctor only)
========================= */
exports.verifyRecord = async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can verify records' });
    }

    const record = await MedicalRecord.findById(req.params.recordId);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    record.status = 'verified';
    record.doctorId = await getDoctorProfileId(req.user);
    await record.save();

    const updatedRecord = await MedicalRecord.findById(record._id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId' }
      })
      .populate('patientId');

    res.json({
      success: true,
      record: transformMedicalRecord(updatedRecord)
    });

    emitSocketEvent(`user_${record.patientId.toString()}`, 'medical-record-updated', {
      recordId: record._id.toString(),
      status: record.status,
    });
    emitSocketEvent('doctors', 'medical-record-updated', {
      recordId: record._id.toString(),
      patientId: record.patientId.toString(),
      status: record.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   REJECT RECORD (Doctor only)
========================= */
exports.rejectRecord = async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can reject records' });
    }

    const record = await MedicalRecord.findById(req.params.recordId);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    record.status = 'rejected';
    record.rejectionReason = req.body.reason || '';
    record.doctorId = await getDoctorProfileId(req.user);
    await record.save();

    const updatedRecord = await MedicalRecord.findById(record._id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId' }
      })
      .populate('patientId');

    res.json({
      success: true,
      record: transformMedicalRecord(updatedRecord)
    });

    emitSocketEvent(`user_${record.patientId.toString()}`, 'medical-record-updated', {
      recordId: record._id.toString(),
      status: record.status,
    });
    emitSocketEvent('doctors', 'medical-record-updated', {
      recordId: record._id.toString(),
      patientId: record.patientId.toString(),
      status: record.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   TRANSCRIBE RECORD (Doctor only)
   - Transcribes prescription from image
   - Auto-creates active medications
========================= */
exports.transcribeRecord = async (req, res) => {
  try {
    const { medications, diagnosis, notes, recordDate } = req.body;

    const record = await MedicalRecord.findById(req.params.recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (record.status === 'transcribed') {
      return res.status(400).json({ success: false, message: 'Record already transcribed' });
    }

    // Update record status
    record.status = 'transcribed';
    record.diagnosis = diagnosis || '';
    record.notes = notes || '';
    record.recordDate = parseOptionalDate(recordDate) || record.recordDate || new Date();
    record.medications = Array.isArray(medications) ? medications : [];
    record.doctorId = await getDoctorProfileId(req.user);
    await record.save();

    // Auto-create medications from transcription
    const createdMedications = [];
    if (medications && Array.isArray(medications)) {
      for (const med of medications) {
        const medication = await Medication.create({
          patientId: record.patientId,
          doctorId: record.doctorId,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          startDate: med.startDate || record.recordDate || new Date(),
          endDate: med.endDate || null,
        });
        createdMedications.push(medication);
      }
    }

    const updatedRecord = await MedicalRecord.findById(record._id)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId' }
      });

    res.json({
      success: true,
      record: transformMedicalRecord(updatedRecord),
      medications: createdMedications,
    });

    emitSocketEvent(`user_${record.patientId.toString()}`, 'prescription-updated', {
      appointmentId: record.appointmentId?.toString?.() || null,
      prescriptionId: record._id.toString(),
    });
    emitSocketEvent(`user_${record.patientId.toString()}`, 'medication-updated', {
      patientId: record.patientId.toString(),
      prescriptionId: record._id.toString(),
    });
    emitSocketEvent('doctors', 'medical-record-updated', {
      recordId: record._id.toString(),
      patientId: record.patientId.toString(),
      status: record.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   UPDATE PRESCRIPTION
========================= */
exports.updatePrescription = async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can update prescriptions' });
    }

    const updates = { ...req.body };
    if (updates.recordDate) {
      updates.recordDate = parseOptionalDate(updates.recordDate);
    }
    if (updates.date && !updates.recordDate) {
      updates.recordDate = parseOptionalDate(updates.date);
      delete updates.date;
    }

    const record = await MedicalRecord.findByIdAndUpdate(
      req.params.recordId,
      updates,
      { new: true }
    ).populate('patientId').populate({
      path: 'doctorId',
      populate: { path: 'userId' }
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (record.type === 'prescription' && Array.isArray(updates.medications)) {
      await Medication.deleteMany({ prescriptionRecordId: record._id });

      for (const med of updates.medications.filter(m => m.name && m.dosage)) {
        await Medication.create({
          patientId: record.patientId?._id || record.patientId,
          doctorId: record.doctorId?._id || record.doctorId,
          prescriptionRecordId: record._id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency || '',
          duration: med.duration || '',
          startDate: med.startDate || record.recordDate || new Date(),
          endDate: med.endDate || null,
          active: true,
        });
      }
    } else if (record.type === 'prescription' && updates.recordDate) {
      await Medication.updateMany(
        { prescriptionRecordId: record._id },
        { $set: { startDate: record.recordDate } }
      );
    }

    if (record.type === 'prescription') {
      try {
        const { getIO } = require('../sockets/socket');
        const patientId = (record.patientId?._id || record.patientId).toString();
        getIO().to(`user_${patientId}`).emit('prescription-updated', {
          appointmentId: record.appointmentId?.toString?.() || null,
          prescriptionId: record._id.toString(),
        });
        getIO().to(`user_${patientId}`).emit('medication-updated', {
          patientId,
          prescriptionId: record._id.toString(),
        });
        getIO().to(`user_${patientId}`).emit('medical-record-updated', {
          recordId: record._id.toString(),
          patientId,
          status: record.status,
        });
        getIO().to('doctors').emit('medical-record-updated', {
          recordId: record._id.toString(),
          patientId,
          status: record.status,
        });
      } catch (socketErr) {
        console.warn('Socket emit failed:', socketErr.message);
      }
    }

    res.json({
      success: true,
      record: transformMedicalRecord(record)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
