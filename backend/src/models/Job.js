import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' },
    open: { type: Boolean, default: true },
    linkedinPostId: { type: String, default: null }
  },
  { timestamps: true }
);

export default mongoose.model('Job', JobSchema);
