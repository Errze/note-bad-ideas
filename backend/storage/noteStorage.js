import fs from "fs/promises";
import path from "path";
import { PATHS } from "../config.js";
import { readJSON, writeJSON } from "../src/utils/fileUtils.js";

/**
 * Хранилище для работы с файлами заметок.
 * Не содержит бизнес-логики, только файловые операции
 */
export class NoteStorage {
    /**
     * Получает путь к директории заметок группы
     * @param {string} groupId - ID группы
     * @returns {string} Путь к директории
     */
    getGroupNotesDir(groupId) {
        return path.join(PATHS.groups, groupId, "notes");
    }

    /**
     * Преобразует название в безопасное имя файла
     * @param {string} title - Название заметки
     * @returns {string} Безопасное имя файла
     */
    titleToFilename(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9а-яё\s]/g, '-') // заменяем спецсимволы на дефисы
            .replace(/\s+/g, '-') // заменяем пробелы на дефисы
            .replace(/-+/g, '-') // убираем повторяющиеся дефисы
            .replace(/^-|-$/g, '') // убираем дефисы в начале и конце
            .substring(0, 100); // ограничиваем длину
    }

    /**
     * Получает путь к файлу заметки (используем название вместо ID)
     * @param {string} groupId - ID группы
     * @param {string} noteTitle - Название заметки
     * @returns {string} Путь к файлу
     */
    getNoteFilePath(groupId, noteTitle) {
        const filename = this.titleToFilename(noteTitle);
        return path.join(this.getGroupNotesDir(groupId), `${filename}.json`);
    }

    /**
     * Находит файл заметки по ID (для обратной совместимости)
     * @param {string} groupId - ID группы
     * @param {string} noteId - ID заметки
     * @returns {Promise<string|null>} Путь к файлу или null
     */
    async findNoteFileById(groupId, noteId) {
        const dir = this.getGroupNotesDir(groupId);
        try {
            const files = await fs.readdir(dir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(dir, file);
                    const note = await readJSON(filePath);
                    if (note && note.id === noteId) {
                        return filePath;
                    }
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Читает все заметки группы
     * @param {string} groupId - ID группы
     * @returns {Promise<Object[]>} Массив объектов заметок
     */
    async readAll(groupId) {
        const dir = this.getGroupNotesDir(groupId);
        try {
            const files = await fs.readdir(dir);
            const jsonFiles = files
                .filter(file => file.endsWith(".json"))
                .map(async file => {
                    try {
                        const note = await readJSON(path.join(dir, file));
                        return note || null;
                    } catch (error) {
                        console.error(`Error reading note file ${file}:`, error);
                        return null;
                    }
                });
            const notes = await Promise.all(jsonFiles);
            return notes.filter(note => note !== null);
        } catch (error) {
            if (error.code === "ENOENT") return [];
            throw error;
        }
    }

    /**
     * Читает конкретную заметку
     * @param {string} groupId - ID группы
     * @param {string} noteId - ID заметки
     * @returns {Promise<Object|null>} Объект заметки или null
     */
    async readOne(groupId, noteId) {
        const filePath = await this.findNoteFileById(groupId, noteId);
        if (!filePath) return null;
        
        try {
            return await readJSON(filePath);
        } catch (error) {
            if (error.code === "ENOENT") return null;
            throw error;
        }
    }

    /**
     * Сохраняет заметку в файл (используем название как имя файла)
     * @param {string} groupId - ID группы
     * @param {string} noteId - ID заметки
     * @param {Object} noteData - Данные заметки
     */
    async save(groupId, noteId, noteData) {
        const dir = this.getGroupNotesDir(groupId);
        await fs.mkdir(dir, { recursive: true });
        
        // Используем название заметки как имя файла
        const filePath = this.getNoteFilePath(groupId, noteData.title);
        
        // Если это обновление существующей заметки, удаляем старый файл
        const oldFilePath = await this.findNoteFileById(groupId, noteId);
        if (oldFilePath && oldFilePath !== filePath) {
            try {
                await fs.unlink(oldFilePath);
            } catch (error) {
                console.warn('Could not delete old note file:', error.message);
            }
        }
        
        await writeJSON(filePath, noteData);
    }

    /**
     * Удаляет файл заметки
     * @param {string} groupId - ID группы
     * @param {string} noteId - ID заметки
     */
    async delete(groupId, noteId) {
        const filePath = await this.findNoteFileById(groupId, noteId);
        if (!filePath) {
            throw new Error(`Note ${noteId} not found`);
        }
        
        try {
            await fs.unlink(filePath);
        } catch (error) {
            if (error.code === "ENOENT") {
                throw new Error(`Note ${noteId} not found`);
            }
            throw error;
        }
    }

    /**
     * Проверяет существование заметки
     * @param {string} groupId - ID группы
     * @param {string} noteId - ID заметки
     * @returns {Promise<boolean>} Существует ли заметка
     */
    async exists(groupId, noteId) {
        const filePath = await this.findNoteFileById(groupId, noteId);
        return filePath !== null;
    }
}