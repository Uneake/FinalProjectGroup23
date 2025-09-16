import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" , required: false},
  title: String,
  summary: String,
  quizzes: [{
    question: String,
    options: [String],
    answer: String,
    userAnswer: String,
    isCorrect: Boolean,
    followUps: [{ userQuestion: String, aiAnswer: String }]
  }],
  chat: [{ role: String, text: String }],
  createdAt: { type: Date, default: Date.now }
});

sessionSchema.index({ owner: 1, createdAt: -1 });

export const SessionSchema = sessionSchema;
export default mongoose.model("Session", sessionSchema);

