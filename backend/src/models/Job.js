import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('Job', JobSchema);
