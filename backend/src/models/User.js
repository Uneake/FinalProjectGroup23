import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  theme: { type: String, default: "earth" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
