import express from "express";
import { noteService as notes } from "../services/index.js";

const router = express.Router();

router.get("/:groupId/notes", async (req, res) => {
  try {
    res.json(await notes.list(req.params.groupId));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Group not found" });
    console.error(e);
    res.status(500).json({ error: "Failed to load notes" });
  }
});

router.post("/:groupId/notes", async (req, res) => {
  try {
    const created = await notes.create(req.params.groupId, req.body || {});
    res.status(201).json(created);
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Group not found" });
    console.error(e);
    res.status(500).json({ error: "Failed to create note" });
  }
});


router.get("/:groupId/notes/:noteId", async (req, res) => {
  try {
    res.json(await notes.get(req.params.groupId, req.params.noteId));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Group not found" });
    if (e.message === "NOTE_NOT_FOUND") return res.status(404).json({ error: "Note not found" });
    console.error(e);
    res.status(500).json({ error: "Failed to load note" });
  }
});

router.patch("/:groupId/notes/:noteId", async (req, res) => {
  try {
    res.json(await notes.patch(req.params.groupId, req.params.noteId, req.body || {}));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Group not found" });
    if (e.message === "NOTE_NOT_FOUND") return res.status(404).json({ error: "Note not found" });
    console.error(e);
    res.status(500).json({ error: "Failed to update note" });
  }
});

router.delete("/:groupId/notes/:noteId", async (req, res) => {
  try {
    res.json(await notes.delete(req.params.groupId, req.params.noteId));
  } catch (e) {
    if (e.message === "GROUP_NOT_FOUND") return res.status(404).json({ error: "Group not found" });
    if (e.message === "NOTE_NOT_FOUND") return res.status(404).json({ error: "Note not found" });
    console.error(e);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;
