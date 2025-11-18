import express from "express";
import { noteService } from "../services/noteService.js";

const router = express.Router();

// КОРНЕВОЙ МАРШРУТ ДЛЯ API - исправлено с app на router
router.get("/", (req, res) => {
    res.json({
        message: "Notes Manager API",
        version: "1.0.0",
        endpoints: {
            health: "/health",
            notes: "/api/groups/:groupId/notes",
            "create-note": "POST /api/groups/:groupId/notes"
        },
        documentation: "See API docs for more information"
    });
});

/**
 * GET /api/groups/:groupId/notes
 * Получить все заметки группы
 */
router.get("/groups/:groupId/notes", async (req, res) => {
    try {
        const notes = await noteService.getAllNotes(req.params.groupId);
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/groups/:groupId/notes/:noteId
 */
router.get("/groups/:groupId/notes/:noteId", async (req, res) => {
    try {
        const { groupId, noteId } = req.params;
        const note = await noteService.getNote(groupId, noteId);

        if (!note) {
            return res.status(404).json({ error: "Note not found" });
        }

        res.json(note);
    } catch (err) {
        // Различаем ошибки валидации и системные ошибки
        if (err.message.includes('Invalid note ID')) {
            res.status(400).json({ error: err.message });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

/**
 * POST /api/groups/:groupId/notes
 * Создать заметку
 */
router.post("/groups/:groupId/notes", async (req, res) => {
    try {
        const { groupId } = req.params;
        const noteData = req.body;
        
        const newNote = await noteService.createNote(groupId, noteData);
        res.status(201).json(newNote);
    } catch (err) {
        if (err.message.includes('Invalid note ID') || err.message.includes('Validation failed')) {
            res.status(400).json({ error: err.message });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});
/**
 * PATCH /api/groups/:groupId/notes/:noteId
 * Обновить заметку
 */
router.patch("/groups/:groupId/notes/:noteId", async (req, res) => {
    try {
        const { groupId, noteId } = req.params;
        const updates = req.body;
        
        const updatedNote = await noteService.updateNote(groupId, noteId, updates);
        res.json(updatedNote);
    } catch (err) {
        if (err.message.includes('Invalid note ID')) {
            res.status(400).json({ error: err.message });
        } else if (err.message.includes('not found')) {
            res.status(404).json({ error: err.message });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

/**
 * DELETE /api/groups/:groupId/notes/:noteId
 */
router.delete("/groups/:groupId/notes/:noteId", async (req, res) => {
    try {
        const { groupId, noteId } = req.params;
        await noteService.deleteNote(groupId, noteId);
        res.json({ 
            success: true,
            message: `Note ${noteId} deleted successfully` 
        });
    } catch (err) {
        if (err.message.includes('Invalid note ID')) {
            res.status(400).json({ error: err.message });
        } else if (err.message.includes('not found')) {
            res.status(404).json({ error: err.message });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

export default router;