import express from "express";

import { 
  getUserTheme, 
  saveUserTheme 
}  from "../controllers/userController.js";

import {
  createAccount,
  loginToAccount,
  createSession,
  deleteSession,
  submitAllQuizAnswers,
  sendMessage,
  sendGuestMessage,
  getGuestSessions,
  getGuestSessionById,
} from "../controllers/sessionController.js";

const router = express.Router();

router.post("/account", createAccount);
router.post("/login", loginToAccount);

// Logged-in user session routes
router.post("/", createSession);
router.delete("/:id", deleteSession);
router.patch("/:id/quiz", submitAllQuizAnswers);
router.post("/:id/chat", sendMessage);

// Guest session routes
router.get("/guest/:guestKey", getGuestSessions);
router.get("/guest/:guestKey/session/:sessionId", getGuestSessionById);
router.post("/guest/:guestKey/session/:sessionId/chat", sendGuestMessage);
router.get("/users/:userId/theme", getUserTheme);
router.patch("/users/:userId/theme", saveUserTheme);

export default router;
