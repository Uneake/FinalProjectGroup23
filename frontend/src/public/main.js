import {
  createAccount, login, fetchSessions, createSessionAPI,
  submitAllQuizAnswers, sendMessageAPI, deleteSessionAPI,
  fetchUserTheme, saveUserTheme
} from "./api.js";
import { CONFIG } from "./config.js";

let sessions = [];
let selectedSession = null;
const AI_TYPING_SPEED = 20;

const sessionList = document.getElementById("sessionList");
const chatArea = document.getElementById("chatArea");
const quizArea = document.getElementById("quizArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const newSessionText = document.getElementById("newSessionText");
const createSessionBtn = document.getElementById("createSessionBtn");
const submitQuizBtn = document.getElementById("submitQuizBtn");
const redoQuizBtn = document.getElementById("redoQuizBtn");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const questionCountInput = document.getElementById("questionCountInput");
const difficultySelect = document.getElementById("difficultySelect");
const newSessionBtn = document.getElementById("newSessionBtn");
const loadingOverlay = document.getElementById("loadingOverlay");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const createAccountBtn = document.getElementById("createAccountBtn");
const loginBtn = document.getElementById("loginBtn");
const authStatus = document.getElementById("authStatus");
const themeCircles = document.getElementById("theme-circles");
const resultOverlay = document.getElementById("resultOverlay");
const resultScoreValue = document.getElementById("resultScoreValue");
const resultTotalValue = document.getElementById("resultTotalValue");
const closeResultBtn = document.getElementById("closeResultBtn");
const leftAside = document.getElementById("leftAside");
const toggleAsideBtn = document.getElementById("toggleAsideBtn");
const newSessionEl = document.getElementById("newSession");
const userAsk = document.getElementById("userAsk");

const ALLOWED_THEMES = ["earth", "light", "dark", "pastel", "solar"];

const setAuthStatus = (txt) => { if (authStatus) authStatus.textContent = txt; };

function collapseAuthPanel() { const asideAuth = document.querySelector(".aside-auth"); if (!asideAuth) return; asideAuth.classList.add("collapsed"); }

function enterLoggedInState(username) {
  selectedSession = null;
  chatArea.innerHTML = "";
  quizArea.innerHTML = "";
  if (newSessionEl) newSessionEl.style.display = "block";
  if (userAsk) userAsk.style.display = "none";
  renderSessions();
  collapseAuthPanel();
  document.getElementById("loggedInAs").textContent = `logged in as ${username}`;
}

createAccountBtn.onclick = async () => {
  const u = usernameInput.value.trim();
  const p = passwordInput.value.trim();
  if (!u || !p) return setAuthStatus("username and password required");
  const currentTheme = document.body.dataset.theme || "earth";
  const res = await createAccount(u, p, currentTheme).catch(() => null);
  if (res && res.userId) {
    CONFIG.USER_ID = res.userId;
    setAuthStatus(`created & logged as ${res.username}`);
    applyTheme(res.theme || currentTheme);
    const loginRes = await login(u, p).catch(() => null);
    if (loginRes && loginRes.status === "ok") {
      sessions = loginRes.sessions || [];
      renderSessions();
      try { const theme = await fetchUserTheme(CONFIG.USER_ID); applyTheme(theme); } catch (err) { applyTheme("earth"); }
      enterLoggedInState(res.username || u);
    } else {
      enterLoggedInState(u);
    }
  } else {
    setAuthStatus(res && res.error ? res.error : "create failed");
  }
};


loginBtn.onclick = async () => {
  const u = usernameInput.value.trim();
  const p = passwordInput.value.trim();
  if (!u || !p) return setAuthStatus("username and password required");
  const res = await login(u, p).catch(() => null);
  if (res && res.status === "ok") {
    CONFIG.USER_ID = res.userId;
    sessions = res.sessions || [];
    setAuthStatus(`logged as ${u}`);
    renderSessions();
    try { const theme = await fetchUserTheme(CONFIG.USER_ID); applyTheme(theme); } catch (err) { applyTheme("earth"); }
    enterLoggedInState(u);
  } else {
    setAuthStatus(res && res.status ? res.status : "login failed");
  }
};

function renderSessions() {
  sessionList.innerHTML = "";
  sessions.forEach((s, index) => {
    const li = document.createElement("li");
    li.textContent = s.title || "Untitled";
    li.onclick = () => selectSession(s._id);
    li.style.cursor = "pointer";
    li.className = "session-btn w-full text-left py-4 px-6 rounded-2xl font-medium transition-all duration-200 flex justify-between items-center";
    if (selectedSession && selectedSession._id === s._id) li.classList.add("active");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.className = "text-sm text-red-500 hover:text-red-700";


    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      showConfirmPopup(s);
    };


    li.appendChild(deleteBtn);
    sessionList.appendChild(li);
    if (index < sessions.length - 1) {
      const divider = document.createElement("div");
      divider.className = "my-0.25 h-px bg-gray-200";
      divider.style.backgroundColor = "var(--bg-accent-color)";
      sessionList.appendChild(divider);
    }
  });
}


function showConfirmPopup(sessionToDelete) {
  if (confirmMessage) {
    confirmMessage.textContent = `Are you sure you want to delete session "${sessionToDelete.title || 'Untitled'}"?`;
  }
  confirmOverlay.style.display = "flex";


  // กำหนด listener ในตัวแปรเพื่อใช้อ้างอิงตอน remove
  const confirmHandler = () => {
    // User confirmed, proceed with deletion
    sessions = sessions.filter(s => s._id !== sessionToDelete._id);
    renderSessions();
    if (selectedSession && selectedSession._id === sessionToDelete._id) {
      selectedSession = null;
      chatArea.innerHTML = "";
      quizArea.innerHTML = "";
    }
    if (CONFIG.USER_ID) {
      deleteSessionAPI(sessionToDelete._id).catch(() => { });
    }
    confirmOverlay.style.display = "none";
    // ลบ event listeners เพื่อป้องกันการทำงานซ้ำ
    confirmDeleteBtn.removeEventListener("click", confirmHandler);
    cancelDeleteBtn.removeEventListener("click", cancelHandler);
  };


  const cancelHandler = () => {
    // User canceled, just hide the popup
    confirmOverlay.style.display = "none";
    // ลบ event listeners เพื่อป้องกันการทำงานซ้ำ
    confirmDeleteBtn.removeEventListener("click", confirmHandler);
    cancelDeleteBtn.removeEventListener("click", cancelHandler);
  };


  confirmDeleteBtn.addEventListener("click", confirmHandler);
  cancelDeleteBtn.addEventListener("click", cancelHandler);
}


async function selectSession(id) {
  selectedSession = sessions.find(s => s._id === id) || null;
  if (!selectedSession) return;
  if (Array.isArray(selectedSession.chat)) {
    selectedSession.chat.forEach(m => { m._displayed = true; });
  }
  renderChat();
  renderQuiz();
  quizArea.style.display = "block";
  chatArea.style.display = "block";
  if (userAsk) userAsk.style.display = "flex";
  updateSubmitRedoButtons();
  renderSessions();
}

function typeWrite(el, text, speed) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = "";
    const tick = () => {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    };
    tick();
  });
}

function renderChat() {
  chatArea.innerHTML = "";
  chatArea.classList.add("flex", "flex-col");
  if (!selectedSession) {
    if (newSessionEl) newSessionEl.style.display = "block";
    if (userAsk) userAsk.style.display = "none";
    chatArea.innerHTML = "";
    quizArea.innerHTML = "";
    submitQuizBtn.style.display = "none";
    redoQuizBtn.style.display = "none";
    showAnswerBtn.style.display = "none";
    return;
  }
  if (newSessionEl) newSessionEl.style.display = "none";
  if (userAsk) userAsk.style.display = "flex";
  const chatArr = selectedSession.chat || selectedSession.chatHistory || [];
  chatArr.forEach((msg) => {
    const wrapper = document.createElement("div");
    wrapper.className = msg.role === "user" ? "chat-wrapper user" : "chat-wrapper ai";
    const bubble = document.createElement("div");
    bubble.className = msg.role === "user" ? "chat-bubble user" : "chat-bubble ai";
    const p = document.createElement("p");
    if (msg.role === "ai") {
      if (!msg._displayed) {
        p.textContent = "";
        bubble.appendChild(p);
        wrapper.appendChild(bubble);
        chatArea.appendChild(wrapper);
        chatArea.scrollTop = chatArea.scrollHeight;
        typeWrite(p, msg.text, AI_TYPING_SPEED).then(() => {
          msg._displayed = true;
          chatArea.scrollTop = chatArea.scrollHeight;
        });
      } else {
        p.textContent = msg.text;
        bubble.appendChild(p);
        wrapper.appendChild(bubble);
        chatArea.appendChild(wrapper);
      }
    } else {
      p.textContent = msg.text;
      bubble.appendChild(p);
      wrapper.appendChild(bubble);
      chatArea.appendChild(wrapper);
    }
  });
  chatArea.scrollTop = chatArea.scrollHeight;
}

function clearOptionHighlights() { quizArea.querySelectorAll(".quiz-option").forEach(el => el.classList.remove("show-correct", "correct")); }

function updateSubmitRedoButtons() {
  const hasSubmitted = selectedSession && selectedSession.quizzes?.some(q => q.status !== null && q.status !== undefined);
  if (!selectedSession) {
    submitQuizBtn.style.display = "none";
    redoQuizBtn.style.display = "none";
    showAnswerBtn.style.display = "none";
    return;
  }
  if (hasSubmitted) {
    submitQuizBtn.style.display = "none";
    redoQuizBtn.style.display = "inline-block";
    showAnswerBtn.style.display = "inline-block";
  } else {
    submitQuizBtn.style.display = "inline-block";
    redoQuizBtn.style.display = "none";
    showAnswerBtn.style.display = "inline-block";
  }
}

function renderQuiz() {
  quizArea.innerHTML = "";
  if (!selectedSession || !selectedSession.quizzes?.length) {
    updateSubmitRedoButtons();
    return;
  }

  selectedSession.quizzes.forEach((q, idx) => {
    if ((q.userAnswer !== undefined && q.userAnswer !== null) && !q.status) {
      q.isCorrect = q.answer === q.userAnswer;
      q.status = q.isCorrect ? "correct" : "incorrect";
    }

    const div = document.createElement("div");
    div.className = "quizDiv";
    const questionEl = document.createElement("b");
    questionEl.textContent = `${idx + 1}. ${q.question}`;
    div.appendChild(questionEl);
    div.appendChild(document.createElement("br"));

    if (q.options && q.options.length) {
      q.options.forEach((opt, idxOpt) => {
        const optId = `quiz_${q._id}_opt_${idxOpt}`;
        const wrapper = document.createElement("label");
        wrapper.className = "quiz-option";
        wrapper.dataset.value = opt;
        if (q.answer === opt) wrapper.dataset.correct = "true";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `quiz_${q._id}`;
        radio.id = optId;
        radio.value = opt;
        if (q.userAnswer === opt) radio.checked = true;

        radio.addEventListener("change", () => {
          q.userAnswer = radio.value;
        });

        const text = document.createElement("span");
        text.textContent = opt;

        wrapper.appendChild(radio);
        wrapper.appendChild(text);
        div.appendChild(wrapper);
      });
    } else {
      const noOpt = document.createElement("div");
      noOpt.textContent = "No options for this question";
      div.appendChild(noOpt);
    }

    const feedbackDiv = document.createElement("div");
    feedbackDiv.className = "feedback mt-2 flex items-center gap-2 text-sm";

    if (q.status === "correct") {
      const s = document.createElement("span");
      s.className = "badge correct-answer";
      s.textContent = "✓";
      feedbackDiv.appendChild(s);
      const t = document.createElement("span");
      t.textContent = "Correct";
      feedbackDiv.appendChild(t);
    } else if (q.status === "incorrect") {
      const s = document.createElement("span");
      s.className = "badge incorrect-answer";
      s.textContent = "✕";
      feedbackDiv.appendChild(s);
      const t = document.createElement("span");
      t.textContent = "Incorrect";
      feedbackDiv.appendChild(t);
    } else if (q.status === "no-answer") {
      const s = document.createElement("span");
      s.className = "badge didnt-answer";
      s.textContent = "?";
      feedbackDiv.appendChild(s);
      const t = document.createElement("span");
      t.textContent = "Didn't answer";
      feedbackDiv.appendChild(t);
    }

    if (q.status) div.appendChild(feedbackDiv);

    quizArea.appendChild(div);
  });

  clearOptionHighlights();
  updateSubmitRedoButtons();
}

if (questionCountInput) {
  questionCountInput.addEventListener("input", () => {
    const v = parseInt(questionCountInput.value, 10);
    if (Number.isNaN(v)) return;
    if (v < 1) questionCountInput.value = "1";
    if (v > 20) questionCountInput.value = "20";
  });
  questionCountInput.addEventListener("blur", () => {
    let v = parseInt(questionCountInput.value, 10);
    if (Number.isNaN(v) || v < 1) v = 1;
    if (v > 20) v = 20;
    questionCountInput.value = String(v);
  });
}

let guestKey = null;

createSessionBtn.onclick = async () => {
  const text = newSessionText.value.trim();
  if (!text) return;
  loadingOverlay.style.display = "flex";
  let qn = parseInt(questionCountInput.value, 10);
  if (Number.isNaN(qn) || qn < 1) qn = 1;
  if (qn > 20) qn = 20;
  questionCountInput.value = String(qn);

  const questionCount = qn;
  const difficulty = difficultySelect.value || "ปานกลาง";

  let data;
  try {
    data = await createSessionAPI(text, questionCount, difficulty, guestKey);
  } catch (err) {
    loadingOverlay.style.display = "none";
    alert("Create session failed: " + (err.error || err.message || JSON.stringify(err)));
    return;
  }

  if (!data) {
    loadingOverlay.style.display = "none";
    return;
  }

  // Store guestKey if returned from backend
  if (data.guestKey) guestKey = data.guestKey;

  let createdSession = data.session || data;
  if (!createdSession._id) createdSession._id = `local_${Math.random().toString(36).slice(2, 9)}`;

  sessions.unshift(createdSession);
  renderSessions();
  loadingOverlay.style.display = "none";
  selectSession(createdSession._id);

  newSessionText.value = "";
};


submitQuizBtn.onclick = async () => {
  if (!selectedSession || !selectedSession.quizzes?.length) return;
  const answers = [];
  selectedSession.quizzes.forEach(q => {
    const selectedOpt = document.querySelector(`input[name="quiz_${q._id}"]:checked`)?.value || null;
    q.userAnswer = selectedOpt;
    if (selectedOpt) { q.isCorrect = q.answer === selectedOpt; q.status = q.isCorrect ? "correct" : "incorrect"; answers.push({ quizId: q._id, userAnswer: selectedOpt }); }
    else { q.isCorrect = false; q.status = "no-answer"; }
  });
  renderQuiz();
  const total = selectedSession.quizzes.length;
  const correctCount = selectedSession.quizzes.filter(q => q.status === "correct").length;
  if (resultScoreValue) resultScoreValue.textContent = String(correctCount);
  if (resultTotalValue) resultTotalValue.textContent = String(total);
  if (resultOverlay) resultOverlay.style.display = "flex";
  updateSubmitRedoButtons();
  if (answers.length === 0) return;
  if (CONFIG.USER_ID) { submitAllQuizAnswers(selectedSession._id, answers).catch(console.error); sessions = sessions.map(s => s._id === selectedSession._id ? selectedSession : s); }
};

redoQuizBtn.onclick = () => {
  if (!selectedSession || !selectedSession.quizzes?.length) return;
  selectedSession.quizzes.forEach(q => { q.userAnswer = null; q.isCorrect = false; q.status = null; });
  renderQuiz();
  updateSubmitRedoButtons();
};

showAnswerBtn.onclick = () => {
  if (!selectedSession || !selectedSession.quizzes?.length) {
    return;
  }


  if (showAnswerBtn.classList.contains("answered")) {
    clearOptionHighlights();
    quizArea.querySelectorAll(".quiz-option").forEach(optEl => {
      optEl.classList.remove("show-correct");
    });
    showAnswerBtn.classList.remove("answered");
  } else {
    clearOptionHighlights();
    quizArea.querySelectorAll(".quiz-option").forEach(optEl => {
      if (optEl.dataset.correct === "true") {
        optEl.classList.add("show-correct");
      }
    });
    showAnswerBtn.classList.add("answered");
  }
};

closeResultBtn.onclick = () => { if (resultOverlay) resultOverlay.style.display = "none"; };

sendBtn.onclick = async () => {
  const message = userInput.value.trim();
  if (!selectedSession || !message) return;
  if (!selectedSession.chat) selectedSession.chat = [];
  selectedSession.chat.push({ role: "user", text: message });
  renderChat();
  userInput.value = "";
  const res = await sendMessageAPI(selectedSession._id, message, guestKey).catch(() => null);
  let aiText = null;
  if (!res) aiText = null;
  else if (res.result) aiText = res.result;
  else if (res.aiText) aiText = res.aiText;
  else if (typeof res === "string") aiText = res;
  else aiText = null;
  if (aiText) {
    selectedSession.chat.push({ role: "ai", text: aiText });
    sessions = sessions.map(s => s._id === selectedSession._id ? selectedSession : s);
    renderChat();
  } else { renderChat(); }
};

function applyTheme(theme) { if (!ALLOWED_THEMES.includes(theme)) theme = "earth"; document.body.dataset.theme = theme; if (!themeCircles) return; themeCircles.querySelectorAll(".theme-dot").forEach(el => { el.classList.toggle("theme-circle-active", el.dataset.theme === theme); }); }

if (themeCircles) { themeCircles.addEventListener("click", async (e) => { const dot = e.target.closest(".theme-dot"); if (!dot) return; const theme = dot.dataset.theme; applyTheme(theme); if (CONFIG.USER_ID) { try { await saveUserTheme(theme); } catch (err) { } } }); }

newSessionBtn.onclick = () => {
  selectedSession = null;
  chatArea.style.display = "none";
  const quizDivs = quizArea.querySelectorAll(".quizDiv");
  quizDivs.forEach(div => {
    div.style.display = "none";
  });
  if (userInput) userInput.style.display = "";
  if (sendBtn) sendBtn.style.display = "";
  if (submitQuizBtn) submitQuizBtn.style.display = "none";
  if (redoQuizBtn) redoQuizBtn.style.display = "none";
  if (showAnswerBtn) showAnswerBtn.style.display = "none";
  if (newSessionEl) newSessionEl.style.display = "block";
  if (userAsk) userAsk.style.display = "none";
  renderSessions();
  if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
};

toggleAsideBtn.onclick = () => {
  const collapsed = leftAside.classList.toggle("collapsed");
  toggleAsideBtn.textContent = collapsed ? "▶" : "◀";
};
