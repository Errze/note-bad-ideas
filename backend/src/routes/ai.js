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

/**
 * @openapi
 * tags:
 *   - name: AI
 *     description: Прокси-маршруты для AI-сервиса (Python)
 *
 * components:
 *   schemas:
 *     AiTextRequest:
 *       type: object
 *       required: [text]
 *       properties:
 *         text:
 *           type: string
 *           example: "Разбери текст и предложи структуру."
 *     AiAnalyzeResponse:
 *       type: object
 *       description: Ответ от AI /analyze (точная схема зависит от AI-сервиса)
 *       additionalProperties: true
 *     AiQuestionsResponse:
 *       type: object
 *       description: Ответ от AI /questions (точная схема зависит от AI-сервиса)
 *       additionalProperties: true
 *     ChatMessage:
 *       type: object
 *       required: [role, content]
 *       properties:
 *         role:
 *           type: string
 *           enum: [user, assistant, system]
 *           example: "user"
 *         content:
 *           type: string
 *           example: "Привет. Сгенерируй вопросы по тексту."
 *     AiChatRequest:
 *       type: object
 *       required: [messages]
 *       properties:
 *         messages:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: "#/components/schemas/ChatMessage"
 *         temperature:
 *           type: number
 *           example: 0.7
 *         max_tokens:
 *           type: integer
 *           example: 400
 *     AiChatResponse:
 *       type: object
 *       description: Ответ от AI /chat (обычно { reply }, но зависит от сервиса)
 *       additionalProperties: true
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Field 'text' (string) is required"
 */

/**
 * @openapi
 * /api/ai/analyze:
 *   post:
 *     summary: Анализ текста через AI-сервис
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AiTextRequest"
 *     responses:
 *       200:
 *         description: Результат анализа
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AiAnalyzeResponse"
 *       400:
 *         description: Некорректный запрос
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Ошибка сервера/AI-сервиса
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
// POST /api/ai/analyze
router.post("/analyze", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Поле 'text' (string) не заполнено" });
    }
    const data = await postAI("/analyze", { text });
    return res.json(data); // { analysis }
  } catch (e) {
    return next(e);
  }
});

/**
 * @openapi
 * /api/ai/questions:
 *   post:
 *     summary: Сгенерировать вопросы по тексту через AI-сервис
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AiTextRequest"
 *     responses:
 *       200:
 *         description: Список/набор вопросов
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AiQuestionsResponse"
 *       400:
 *         description: Некорректный запрос
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Ошибка сервера/AI-сервиса
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
// POST /api/ai/questions
router.post("/questions", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Поле 'text' (string) не заполнено" });
    }
    const data = await postAI("/questions", { text });
    return res.json(data); // { questions }
  } catch (e) {
    return next(e);
  }
});

/**
 * @openapi
 * /api/ai/chat:
 *   post:
 *     summary: Чат с AI-сервисом (прокси)
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AiChatRequest"
 *     responses:
 *       200:
 *         description: Ответ ассистента/результат чата
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AiChatResponse"
 *       400:
 *         description: Некорректный запрос (messages/role/content)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Ошибка сервера/AI-сервиса
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
// POST /api/ai/chat
router.post("/chat", async (req, res, next) => {
  try {
    const { messages, temperature, max_tokens } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Поле 'messages' (array) не заполнено" });
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

