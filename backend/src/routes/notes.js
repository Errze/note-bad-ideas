import express from "express";
import { noteService as notes } from "../services/index.js";

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Note:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "note_123"
 *         groupId:
 *           type: string
 *           example: "group_456"
 *         title:
 *           type: string
 *           example: "Моя заметка"
 *         content:
 *           type: string
 *           example: "Текст заметки в markdown или plain text"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-12-20T12:34:56.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-12-20T12:35:10.000Z"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Note not found"
 */

/**
 * @openapi
 * /api/groups/{groupId}/notes:
 *   get:
 *     summary: Получить список заметок группы
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *     responses:
 *       200:
 *         description: Список заметок
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Note"
 *       404:
 *         description: Группа не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.get("/:groupId/notes", async (req, res) => {
  try {
    res.json(await notes.list(req.params.groupId));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Группа не найдена" });
    console.error(e);
    res.status(500).json({ error: "Ошибка загрузки заметок" });
  }
});

/**
 * @openapi
 * /api/groups/{groupId}/notes:
 *   post:
 *     summary: Создать заметку в группе
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Новая заметка"
 *               content:
 *                 type: string
 *                 example: "Текст заметки"
 *     responses:
 *       201:
 *         description: Заметка успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Note"
 *       404:
 *         description: Группа не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *             example:
 *               error: "GROUP_NOT_FOUND"
 *       409:
 *         description: Заметка с таким названием уже существует в группе
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *             example:
 *               error: "NOTE_TITLE_DUPLICATE"
 *               message: "Заметка с таким названием уже существует в этой группе"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *             example:
 *               error: "FAILED_TO_CREATE_NOTE"
 */
router.post("/:groupId/notes", async (req, res) => {
  try {
    const created = await notes.create(req.params.groupId, req.body || {});
    res.status(201).json(created);
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") {
      return res.status(404).json({ error: "Группа не найдена" });
    }

    if (e.message === "NOTE_TITLE_DUPLICATE") {
      return res.status(409).json({
        error: "NOTE_TITLE_DUPLICATE",
        message: "Заметка с таким названием уже существует в этой группе",
      });
    }

    console.error(e);
    res.status(500).json({ error: "Ошибка создания заметки" });
  }
});

/**
 * @openapi
 * /api/groups/{groupId}/notes/{noteId}:
 *   get:
 *     summary: Получить одну заметку
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Заметка
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Note"
 *       404:
 *         description: Группа или заметка не найдены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.get("/:groupId/notes/:noteId", async (req, res) => {
  try {
    res.json(await notes.get(req.params.groupId, req.params.noteId));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Группа не найдена" });
    if (e.message === "NOTE_NOT_FOUND") return res.status(404).json({ error: "Заметка не найдена" });
    console.error(e);
    res.status(500).json({ error: "Ошибка загрузки заметки" });
  }
});

/**
 * @openapi
 * /api/groups/{groupId}/notes/{noteId}:
 *   patch:
 *     summary: Частично обновить заметку
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Обновлённая заметка
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Note"
 *       404:
 *         description: Группа или заметка не найдены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.patch("/:groupId/notes/:noteId", async (req, res) => {
  try {
    res.json(await notes.patch(req.params.groupId, req.params.noteId, req.body || {}));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Группа не найдена" });
    if (e.message === "NOTE_NOT_FOUND") return res.status(404).json({ error: "Заметка не найдена" });
    if (e.message === "NOTE_TITLE_DUPLICATE")
      return res.status(409).json({
        error: "NOTE_TITLE_DUPLICATE",
        message: "Заметка с таким названием уже существует в этой группе",
    });
    console.error(e);
    res.status(500).json({ error: "Ошибка обновления заметки" });
  }
});

/**
 * @openapi
 * /api/groups/{groupId}/notes/{noteId}:
 *   delete:
 *     summary: Удалить заметку
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Результат удаления (как возвращает сервис)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Группа или заметка не найдены
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.delete("/:groupId/notes/:noteId", async (req, res) => {
  try {
    res.json(await notes.delete(req.params.groupId, req.params.noteId));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Группа не найдена" });
    if (e.message === "NOTE_NOT_FOUND") return res.status(404).json({ error: "Заметка не найдена" });
    console.error(e);
    res.status(500).json({ error: "Ошибка удаления заметки" });
  }
});

export default router;
