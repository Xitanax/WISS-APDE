// src/models/Meeting.js
import mongoose from 'mongoose';

const MeetingSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hr: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: String, enum: ['applicant','hr','admin'], required: true },

  startsAt: { type: Date, required: true },
  endsAt:   { type: Date, required: true },
  mode:     { type: String, enum: ['onsite','online','phone'], default: 'online' },
  location: { type: String, default: '' },

  status: { type: String, enum: ['proposed','accepted','declined','canceled'], default: 'proposed' },
  notes:  { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);
