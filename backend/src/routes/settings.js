import express from "express";
import { getStorageBasePath, setStorageBasePath } from "../services/storagePath.js";

const router = express.Router();


/**
 * @swagger
 * /api/settings/storage-path:
 *   get:
 *     summary: Получить путь хранилища данных
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Текущий путь хранилища
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 storageBasePath:
 *                   type: string
 *       500:
 *         description: Внутренняя ошибка сервера
 *
 *   post:
 *     summary: Установить путь хранилища данных
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storageBasePath
 *             properties:
 *               storageBasePath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Путь сохранён
 *       400:
 *         description: Некорректный путь
 *       500:
 *         description: Ошибка сохранения
 */
router.get("/storage-path", (req, res) => {
  res.json({
    storageBasePath: getStorageBasePath(),
  });
});

router.post("/storage-path", (req, res) => {
  try {
    const { storageBasePath } = req.body || {};
    if (!storageBasePath) {
      return res.status(400).json({ error: "STORAGE_PATH_REQUIRED" });
    }

    const saved = setStorageBasePath(storageBasePath);
    res.json({ storageBasePath: saved });
  } catch (e) {
    if (e.message === "INVALID_PATH") {
      return res.status(400).json({ error: "INVALID_PATH" });
    }
    console.error(e);
    res.status(500).json({ error: "FAILED_TO_SAVE_STORAGE_PATH" });
  }
});

export default router;
