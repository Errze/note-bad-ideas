import express from "express";
import { groupService as groups } from "../services/index.js";

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "group_123"
 *         title:
 *           type: string
 *           example: "Учёба"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-12-20T12:34:56.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-12-20T12:40:00.000Z"
 *     DeleteGroupResult:
 *       type: object
 *       description: Результат удаления группы (формат зависит от реализации сервиса)
 *       additionalProperties: true
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Failed to load groups"
 */

/**
 * @openapi
 * tags:
 *   - name: Groups
 *     description: Управление группами заметок
 */

/**
 * @openapi
 * /api/groups:
 *   get:
 *     summary: Получить список групп
 *     tags: [Groups]
 *     responses:
 *       200:
 *         description: Список групп
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Group"
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
router.get("/", async (req, res) => {
  try {
    res.json(await groups.list());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Ошибка загрузки групп" });
  }
});

/**
 * @openapi
 * /api/groups:
 *   post:
 *     summary: Создать новую группу
 *     tags: [Groups]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Работа"
 *     responses:
 *       201:
 *         description: Группа создана
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Group"
 *       400:
 *         description: Некорректное название
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: Группа с таким названием уже существует
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
router.post("/", async (req, res) => {
  try {
    const created = await groups.create(req.body?.title);
    res.status(201).json(created);
  } catch (e) {
    if (e.message === "INVALID_TITLE") return res.status(400).json({ error: "Некорректное название" });
    if (e.message === "GROUP_EXISTS") return res.status(409).json({ error: "Группа существует" });
    console.error(e);
    res.status(500).json({ error: "Ошибка создания группы" });
  }
});

/**
 * @openapi
 * /api/groups/{groupId}:
 *   patch:
 *     summary: Переименовать группу
 *     tags: [Groups]
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
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Новая группа"
 *     responses:
 *       200:
 *         description: Группа переименована
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Group"
 *       400:
 *         description: Некорректное название
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       404:
 *         description: Группа не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: Группа с таким названием уже существует
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
router.patch("/:groupId", async (req, res) => {
  try {
    const updated = await groups.rename(req.params.groupId, req.body?.title);
    res.json(updated);
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Группа не найдена" });
    if (e.message === "GROUP_EXISTS") return res.status(409).json({ error: "Группа существует" });
    if (e.message === "INVALID_TITLE") return res.status(400).json({ error: "Некорректное название" });
    console.error(e);
    res.status(500).json({ error: "Ошибка переименования группы" });
  }
});

/**
 * @openapi
 * /api/groups/{groupId}:
 *   delete:
 *     summary: Удалить группу
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID группы
 *       - in: query
 *         name: cascade
 *         required: false
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Если true, удалять заметки группы каскадно. Если false, вернёт ошибку при наличии заметок.
 *     responses:
 *       200:
 *         description: Результат удаления
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/DeleteGroupResult"
 *       404:
 *         description: Группа не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       409:
 *         description: Группа не пуста (cascade=false)
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
router.delete("/:groupId", async (req, res) => {
  try {
    const cascade = String(req.query.cascade ?? "true") === "true";
    res.json(await groups.delete(req.params.groupId, { cascade }));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Группа не найдена" });
    if (e.message === "GROUP_NOT_EMPTY") return res.status(409).json({ error: "Группа не пуста" });
    console.error(e);
    res.status(500).json({ error: "Ошибка удаления группы" });
  }
});

export default router;
