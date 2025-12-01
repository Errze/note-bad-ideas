import express from "express";
import { GroupStorage } from "../../storage/groupStorage.js";

const router = express.Router();
const groupStorage = new GroupStorage();

// GET /api/groups - получить все группы
router.get("/", async (req, res) => {
  try {
    const groups = await groupStorage.readAll();
    res.json(groups);
  } catch (error) {
    console.error("Error getting groups:", error);
    res.status(500).json({ error: "Failed to get groups" });
  }
});

// POST /api/groups - создать новую группу
router.post("/", async (req, res) => {
  try {
    const { groupName } = req.body;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ error: "Group name is required" });
    }

    const createdGroup = await groupStorage.create(groupName.trim());
    res.status(201).json(createdGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    
    if (error.message.includes("already exists")) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to create group" });
  }
});

// DELETE /api/groups/:groupId - удалить группу
router.delete("/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    const deletedGroup = await groupStorage.delete(groupId);
    res.json({ message: `Group "${deletedGroup}" deleted successfully` });
  } catch (error) {
    console.error("Error deleting group:", error);
    
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to delete group" });
  }
});

export default router;