const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    prescriptionRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
    prescribedDate: Date,
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: String,
    duration: String,
    durationValue: Number,
    durationUnit: { type: String, enum: ['days', 'weeks', 'months'] },
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true },
    reminder: {
      enabled: { type: Boolean, default: false },
      times: [String], // e.g. ["08:00", "20:00"]
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Medication', medicationSchema);
