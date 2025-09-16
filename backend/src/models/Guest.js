//Guest.js in models folder
import mongoose from "mongoose";
import { SessionSchema } from "./Session.js";

const GuestSchema = new mongoose.Schema({
  guestKey: { type: String, required: true, unique: true },
  sessions: [SessionSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Guest", GuestSchema);
//guestKey is a short generated string for each client
