// src/models/Agency.js
import mongoose from 'mongoose';

const AgencySchema = new mongoose.Schema({
  name: { type: String, required: true },
  apiKey: { type: String, required: true, unique: true }, // zufälliger String
  active: { type: Boolean, default: true },
  permissions: { type: [String], default: ['jobs:read', 'applications:read'] }, // feingranular
}, { timestamps: true });

export default mongoose.models.Agency || mongoose.model('Agency', AgencySchema);
