import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    status: { type: String, enum: ["received", "in_review", "rejected", "accepted"], default: "received" },
    note: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Application = mongoose.model("Application", applicationSchema);
