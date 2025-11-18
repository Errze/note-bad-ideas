import crypto from "crypto";
import { createNote, updateNote, validateNote } from "../models/note.js";
import { NoteStorage } from "../../storage/noteStorage.js";

export class NoteService {
    constructor() {
        this.storage = new NoteStorage();
    }

    /**
     * Валидирует ID заметки
     */
    validateNoteId(id) {
        const idRegex = /^[a-zA-Z0-9_-]+$/;
        if (!idRegex.test(id)) {
            throw new Error(`Invalid note ID: ${id}`);
        }
    }

    async getAllNotes(groupId) {
        // ИСПРАВЛЕНО: используем readAll вместо readAllNotes
        const notes = await this.storage.readAll(groupId);
        return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    async getNote(groupId, noteId) {
        this.validateNoteId(noteId);
        // ИСПРАВЛЕНО: используем readOne вместо readNote
        return await this.storage.readOne(groupId, noteId);
    }

    async createNote(groupId, noteData) {
        // Создаем объект заметки с помощью модели
        const noteWithId = {
            ...noteData,
            id: noteData.id || crypto.randomUUID(),
            groupId: groupId
        };

        const newNote = createNote(noteWithId);
        
        // Валидируем ID если он кастомный
        if (noteData.id) {
            this.validateNoteId(noteData.id);
        }

        // ИСПРАВЛЕНО: используем save вместо saveNote
        await this.storage.save(groupId, newNote.id, newNote);
        return newNote;
    }

    async updateNote(groupId, noteId, updates) {
        this.validateNoteId(noteId);

        // ИСПРАВЛЕНО: используем readOne вместо readNote
        const existing = await this.storage.readOne(groupId, noteId);
        if (!existing) {
            throw new Error(`Cannot update: note ${noteId} not found`);
        }

        // Обновляем через модель
        const updatedNote = updateNote(existing, updates);
        
        // ИСПРАВЛЕНО: используем save вместо saveNote
        await this.storage.save(groupId, noteId, updatedNote);
        return updatedNote;
    }

    async deleteNote(groupId, noteId) {
        this.validateNoteId(noteId);
        // ИСПРАВЛЕНО: используем delete вместо deleteNote
        await this.storage.delete(groupId, noteId);
    }
}

// Создаем и экспортируем экземпляр сервиса
export const noteService = new NoteService();