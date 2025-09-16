import mongoose from "mongoose";
import Session from "../models/Session.js";
import User from "../models/User.js";
import Guest from "../models/Guest.js";
import { gemini } from "../services/geminiService.js";
import { parseLLMJSON, cutUntilJson, cutAfterLastTripleQuote } from "../utils/utilities.js";

const toObjectId = (id) => {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return null;
};

const checkCorrect = (q, userAnswer) => {
  if (q == null) return false;
  const a = q.answer;
  if (typeof a === "number") {
    if (Array.isArray(q.options) && q.options[a] !== undefined) return q.options[a] === userAnswer;
    return String(a) === String(userAnswer);
  }
  return String(a) === String(userAnswer);
};

export const createAccount = async (req, res) => {
  try {
    const { username, password, theme } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password required" });
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: "username already exists" });
    const user = new User({ username, password, theme });
    await user.save();
    res.status(201).json({ userId: user._id.toString(), username: user.username, theme: user.theme || null });
  } catch (err) {
    console.error("CreateAccount error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const loginToAccount = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "username and password required" });
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ status: "invalid credentials" });
    const sessions = await Session.find({ owner: user._id }).sort({ createdAt: -1 });
    res.json({ status: "ok", userId: user._id.toString(), sessions });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getAllSessions = async (req, res) => {
  try {
    const { userId } = req.query;
    if (userId) {
      const oid = toObjectId(userId);
      if (!oid) return res.status(400).json({ error: "invalid userId" });
      const sessions = await Session.find({ owner: oid }).sort({ createdAt: -1 });
      return res.json(sessions);
    }
    const sessions = await Session.find().sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    console.error("GetAllSessions error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const createSession = async (req, res) => {
  try {
    const { owner, text, questionCount = 10, difficulty = "ปานกลาง", guestKey } = req.body;
    if (!text) return res.status(400).json({ error: "text missing" });

    const qnRaw = parseInt(questionCount, 10);
    const qn = Number.isNaN(qnRaw) ? 10 : Math.max(1, Math.min(20, qnRaw));

    const prompt = `
      สรุปข้อความนี้หรือทำสรุปในภาษาไทยเกี่ยวกับหัวข้อนี้ พร้อมสร้าง quiz จำนวน ${qn} ข้อ ระดับความยาก "${difficulty}" เป็น JSON เท่านั้น
      โครงสร้าง JSON:
      {
        "summary": "string",
        "quizzes": [
          { "question": "string", "options": ["..."], "answer": "string or index" }
        ]
      }
      ข้อความ: ${text}
    `;

    let result;
    try {
      result = await gemini.generateContent(prompt);
    } catch (llmErr) {
      console.error("Gemini generateContent failed:", llmErr);
      return res.status(502).json({ error: "LLM request failed", detail: llmErr.message || String(llmErr) });
    }

    const jsonString = cutAfterLastTripleQuote(cutUntilJson(result));
    const parsed = parseLLMJSON(jsonString);
    if (!parsed) {
      console.error("Parsed LLM output was invalid:", { result });
      return res.status(500).json({ error: "Invalid LLM output", raw: String(result).slice(0, 500) });
    }

    const sessionData = {
      owner: owner || null,
      title: String(text).slice(0, 80),
      summary: parsed.summary,
      quizzes: parsed.quizzes || [],
      chat: [{ role: "user", text }, { role: "ai", text: parsed.summary }],
      createdAt: new Date()
    };

    if (owner) {
      const oid = toObjectId(owner);
      if (!oid) return res.status(400).json({ error: "invalid owner id" });
      sessionData.owner = oid;
      const session = new Session(sessionData);
      await session.save();
      return res.status(201).json(session);
    }

    let key = guestKey;
    if (!key) key = Math.random().toString(36).slice(2, 10);
    let guest = await Guest.findOne({ guestKey: key });
    if (!guest) {
      guest = new Guest({ guestKey: key, sessions: [sessionData] });
    } else {
      guest.sessions.unshift(sessionData);
    }
    await guest.save();
    const createdSession = guest.sessions[0];
    res.status(201).json({ guestKey: guest.guestKey, session: createdSession });
  } catch (err) {
    console.error("CreateSession error:", err);
    res.status(500).json({ error: "Internal Server Error", detail: err.message || String(err) });
  }
};


export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, guestKey } = req.body;

    if (userId) {
      const oid = toObjectId(userId);
      if (!oid) return res.status(400).json({ error: "invalid userId" });
      await Session.findOneAndDelete({ _id: id, owner: oid });
      return res.json({ status: "deleted" });
    }

    if (guestKey) {
      const guest = await Guest.findOne({ guestKey });
      if (!guest) return res.status(404).json({ error: "Guest not found" });
      const sub = guest.sessions.id(id);
      if (!sub) return res.status(404).json({ error: "Session not found for guest" });
      sub.remove();
      await guest.save();
      return res.json({ status: "deleted" });
    }

    res.status(400).json({ error: "userId or guestKey required" });
  } catch (err) {
    console.error("DeleteSession error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const submitAllQuizAnswers = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, guestKey, answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: "answers array required" });

    if (userId) {
      const oid = toObjectId(userId);
      if (!oid) return res.status(400).json({ error: "invalid userId" });
      const session = await Session.findOne({ _id: id, owner: oid });
      if (!session) return res.status(404).json({ error: "Session not found or not owned by user" });
      for (const a of answers) {
        const q = session.quizzes.id(a.quizId);
        if (!q) continue;
        q.userAnswer = a.userAnswer;
        q.isCorrect = checkCorrect(q, a.userAnswer);
      }
      await session.save();
      return res.json({ status: "saved" });
    }

    if (guestKey) {
      const guest = await Guest.findOne({ guestKey });
      if (!guest) return res.status(404).json({ error: "Guest not found" });
      const session = guest.sessions.id(id);
      if (!session) return res.status(404).json({ error: "Session not found for guest" });
      for (const a of answers) {
        const q = session.quizzes.id(a.quizId);
        if (!q) continue;
        q.userAnswer = a.userAnswer;
        q.isCorrect = checkCorrect(q, a.userAnswer);
      }
      await guest.save();
      return res.json({ status: "saved" });
    }

    res.status(400).json({ error: "userId or guestKey required" });
  } catch (err) {
    console.error("submitAllQuizAnswers error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });
    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const chatHistoryText = (session.chat || []).map(c => `${c.role}: ${c.text}`).join("\n");
    const prompt = `${chatHistoryText}\nUser asks: ${message}\nAI: (ตอบสั้น ๆ ไม่เกิน 2 บรรทัด เป็นภาษาไทย)`;
    const aiText = await gemini.generateContent(prompt);

    session.chat.push({ role: "user", text: message });
    session.chat.push({ role: "ai", text: aiText });
    await session.save();
    res.json({ result: aiText });
  } catch (err) {
    console.error("SendMessage error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const sendGuestMessage = async (req, res) => {
  try {
    const { guestKey, sessionId } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });
    const guest = await Guest.findOne({ guestKey });
    if (!guest) return res.status(404).json({ error: "Guest not found" });
    const session = guest.sessions.id(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found for guest" });

    const chatHistoryText = (session.chat || []).map(c => `${c.role}: ${c.text}`).join("\n");
    const prompt = `${chatHistoryText}\nUser asks: ${message}\nAI: (ตอบสั้น ๆ ไม่เกิน 2 บรรทัด เป็นภาษาไทย)`;
    const aiText = await gemini.generateContent(prompt);

    session.chat.push({ role: "user", text: message });
    session.chat.push({ role: "ai", text: aiText });
    await guest.save();
    res.json({ result: aiText });
  } catch (err) {
    console.error("SendGuestMessage error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getGuestSessions = async (req, res) => {
  try {
    const { guestKey } = req.params;
    const guest = await Guest.findOne({ guestKey });
    if (!guest) return res.status(404).json({ error: "Guest not found" });
    res.json({ sessions: guest.sessions });
  } catch (err) {
    console.error("getGuestSessions error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getGuestSessionById = async (req, res) => {
  try {
    const { guestKey, sessionId } = req.params;
    const guest = await Guest.findOne({ guestKey });
    if (!guest) return res.status(404).json({ error: "Guest not found" });
    const session = guest.sessions.id(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err) {
    console.error("getGuestSessionById error:", err);
    res.status(500).json({ error: err.message });
  }
};
