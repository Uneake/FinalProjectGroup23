import { CONFIG } from "./config.js";

async function safeParseJsonResponse(res) {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (ct.includes("application/json")) {
      const err = await res.json();
      throw err;
    }
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  if (ct.includes("application/json")) return res.json();
  return null;
}

export const createAccount = async (username, password, theme = null) => {
  const body = { username, password };
  if (theme) body.theme = theme;
  const res = await fetch(`${CONFIG.BACKEND_URL}/session/account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return await safeParseJsonResponse(res);
};

export const login = async (username, password) => {
  const res = await fetch(`${CONFIG.BACKEND_URL}/session/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return await safeParseJsonResponse(res);
};

export const fetchSessions = async (guestKey = null) => {
  if (CONFIG.USER_ID) {
    const res = await fetch(`${CONFIG.BACKEND_URL}/session?userId=${CONFIG.USER_ID}`);
    return await safeParseJsonResponse(res);
  } else if (guestKey) {
    const res = await fetch(`${CONFIG.BACKEND_URL}/session/guest/${guestKey}`);
    return await safeParseJsonResponse(res);
  }
  return [];
};

export const fetchSessionById = async (sessionId) => {
  if (!/^[a-fA-F0-9]{24}$/.test(sessionId)) return null;
  const res = await fetch(`${CONFIG.BACKEND_URL}/session/${sessionId}`);
  return await safeParseJsonResponse(res);
};

export const createSessionAPI = async (text, questionCount = 10, difficulty = "ปานกลาง", guestKey = null) => {
  const body = { text, questionCount, difficulty };
  if (CONFIG.USER_ID) body.owner = CONFIG.USER_ID;
  if (!CONFIG.USER_ID && guestKey) body.guestKey = guestKey;

  const res = await fetch(`${CONFIG.BACKEND_URL}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return await safeParseJsonResponse(res);
};

export const submitAllQuizAnswers = async (sessionId, answers, guestKey = null) => {
  const body = { answers };
  if (CONFIG.USER_ID) body.userId = CONFIG.USER_ID;
  else if (guestKey) body.guestKey = guestKey;
  else return null;

  const res = await fetch(`${CONFIG.BACKEND_URL}/session/${sessionId}/quiz`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return await safeParseJsonResponse(res);
};

export const sendMessageAPI = async (sessionId, message, guestKey = null) => {
  // Only use guestKey if not logged in
  if (!CONFIG.USER_ID && guestKey) {
    const url = `${CONFIG.BACKEND_URL}/session/guest/${encodeURIComponent(guestKey)}/session/${encodeURIComponent(sessionId)}/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    return await safeParseJsonResponse(res);
  }

  // logged-in user
  const url = `${CONFIG.BACKEND_URL}/session/${encodeURIComponent(sessionId)}/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, userId: CONFIG.USER_ID })
  });
  return await safeParseJsonResponse(res);
};

export const deleteSessionAPI = async (sessionId, guestKey = null) => {
  const body = {};
  if (CONFIG.USER_ID) body.userId = CONFIG.USER_ID;
  else if (guestKey) body.guestKey = guestKey;
  else return null;

  const res = await fetch(`${CONFIG.BACKEND_URL}/session/${sessionId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return await safeParseJsonResponse(res);
};


// theme APIs 
const ALLOWED_THEMES = ["earth", "light", "dark", "pastel", "solar"];

export const fetchUserTheme = async (userId) => {
  // call the backend route you already have mounted under /session
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/session/users/${userId}/theme`);
    if (!res.ok) {
      // non-OK -> return default, do not throw to break login flow
      console.warn("fetchUserTheme: non-ok response", res.status);
      return "earth";
    }
    const data = await res.json();
    const theme = data?.theme || "earth";
    return ALLOWED_THEMES.includes(theme) ? theme : "earth";
  } catch (err) {
    console.error("fetchUserTheme error", err);
    return "earth";
  }
};

export const saveUserTheme = async (theme) => {
  if (!CONFIG.USER_ID) return;
  if (!ALLOWED_THEMES.includes(theme)) {
    console.warn("saveUserTheme: invalid theme", theme);
    return null;
  }
  const res = await fetch(`${CONFIG.BACKEND_URL}/session/users/${CONFIG.USER_ID}/theme`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  });
  return safeParseJsonResponse(res);
};
