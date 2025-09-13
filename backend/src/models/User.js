import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'hr', 'applicant', 'partner', 'recruiter'],
      default: 'applicant',
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
