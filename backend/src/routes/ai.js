import express from "express";

const router = express.Router();

const AI_BASE = process.env.AI_BASE || "http://127.0.0.1:8000";

async function postAI(path, body) {
  const res = await fetch(`${AI_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const detail = data?.detail || data?.error || text || `HTTP ${res.status}`;
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }

  return data;
}

// POST /api/ai/analyze
router.post("/analyze", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Field 'text' (string) is required" });
    }
    const data = await postAI("/analyze", { text });
    return res.json(data); // { analysis }
  } catch (e) {
    return next(e);
  }
});

// POST /api/ai/questions
router.post("/questions", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Field 'text' (string) is required" });
    }
    const data = await postAI("/questions", { text });
    return res.json(data); // { questions }
  } catch (e) {
    return next(e);
  }
});

// POST /api/ai/chat
router.post("/chat", async (req, res, next) => {
  try {
    const { messages, temperature, max_tokens } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Field 'messages' (array) is required" });
    }

    // легкая валидация
    for (const m of messages) {
      if (!m || typeof m !== "object") {
        return res.status(400).json({ error: "Each message must be an object" });
      }
      if (!["user", "assistant", "system"].includes(m.role)) {
        return res.status(400).json({ error: "Message role must be user|assistant|system" });
      }
      if (!m.content || typeof m.content !== "string") {
        return res.status(400).json({ error: "Message content must be a string" });
      }
    }

    const data = await postAI("/chat", {
      messages,
      temperature: typeof temperature === "number" ? temperature : 0.7,
      max_tokens: Number.isInteger(max_tokens) ? max_tokens : 400,
    });

    return res.json(data); // { reply }
  } catch (e) {
    return next(e);
  }
});

export default router;
