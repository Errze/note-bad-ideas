import { noteService } from "../src/models/services/noteService.js";

/**
 * Единый API для работы с хранилищем
 * @namespace Storage
 */
export const Storage = Object.freeze({
    Notes: Object.freeze({
        getNotes: (groupId) => noteService.getAllNotes(groupId),
        getNote: (groupId, noteId) => noteService.getNote(groupId, noteId),
        createNote: (groupId, noteData) => noteService.createNote(groupId, noteData),
        updateNote: (groupId, noteId, updates) => noteService.updateNote(groupId, noteId, updates),
        deleteNote: (groupId, noteId) => noteService.deleteNote(groupId, noteId),
    })
});