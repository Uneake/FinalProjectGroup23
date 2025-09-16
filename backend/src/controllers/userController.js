import User from "../models/User.js";
import mongoose from "mongoose";

const toObjectId = (id) => {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return null;
};

export const saveUserTheme = async (req, res) => {
  try {
    const { userId } = req.params;
    const { theme } = req.body;
    if (!theme) return res.status(400).json({ error: "Theme required" });

    const oid = toObjectId(userId);
    if (!oid) return res.status(400).json({ error: "Invalid userId" });

    const user = await User.findByIdAndUpdate(oid, { theme }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ status: "ok", theme: user.theme });
  } catch (err) {
    console.error("saveUserTheme error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getUserTheme = async (req, res) => {
  try {
    const { userId } = req.params;
    const oid = toObjectId(userId);
    if (!oid) return res.status(400).json({ error: "Invalid userId" });

    const user = await User.findById(oid);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ theme: user.theme || "default" });
  } catch (err) {
    console.error("getUserTheme error:", err);
    res.status(500).json({ error: err.message });
  }
};
