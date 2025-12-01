import express from "express";
import fs from "fs/promises";
import path from "path";
import { PATHS } from "../../config.js";

const router = express.Router();

// Получить список групп
router.get("/", async (req, res) => {
  try {
    const folders = await fs.readdir(PATHS.groups, { withFileTypes: true });
    const groups = folders
      .filter(f => f.isDirectory())
      .map(f => f.name);

    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать группу
router.post("/", async (req, res) => {
  const { groupName } = req.body;

  if (!groupName || !groupName.trim()) {
    return res.status(400).json({ error: "Group name is required" });
  }

  const newDir = path.join(PATHS.groups, groupName.trim());

  try {
    await fs.mkdir(newDir, { recursive: false });
    await fs.mkdir(path.join(newDir, "notes"), { recursive: true });

    res.json({ message: "Group created", group: groupName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Удалить группу
router.delete("/:groupId", async (req, res) => {
  const groupId = req.params.groupId;

  try {
    await fs.rm(path.join(PATHS.groups, groupId), { recursive: true, force: true });
    res.json({ message: "Group deleted", group: groupId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
