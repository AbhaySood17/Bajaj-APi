import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

let Submission;
let ready = false;

export const connectHistoryStore = async (mongoUri) => {
  if (!mongoUri) {
    return false;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
    Submission = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
    ready = true;
    return true;
  } catch (error) {
    console.warn("MongoDB history disabled:", error.message);
    return false;
  }
};

export const saveSubmission = async (input, output) => {
  if (!ready || !Submission) {
    return;
  }

  try {
    await Submission.create({ input, output });
  } catch (error) {
    console.warn("Submission history skipped:", error.message);
  }
};
