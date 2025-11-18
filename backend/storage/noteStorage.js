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
     * Получает путь к файлу заметки
     * @param {string} groupId - ID группы
     * @param {string} noteId - ID заметки
     * @returns {string} Путь к файлу
     */
    getNoteFilePath(groupId, noteId) {
        return path.join(this.getGroupNotesDir(groupId), `${noteId}.json`);
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
                    const note = await readJSON(path.join(dir, file));
                    return note || null;
                })
            return await Promise.all(jsonFiles);
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
        const filePath = this.getNoteFilePath(groupId, noteId);
        try {
            return await readJSON(filePath);
        } catch (error) {
            if (error.code === "ENOENT") return null;
            throw error;
        }
    }

    /**
     * Сохраняет заметку в файл
     * @param {string} groupId - ID группы
     * @param {string} noteId - ID заметки
     * @param {Object} noteData - Данные заметки
     */
    async save(groupId, noteId, noteData) {
        const dir = this.getGroupNotesDir(groupId);
        await fs.mkdir(dir, { recursive: true });
        const filePath = this.getNoteFilePath(groupId, noteId);
        await writeJSON(filePath, noteData);
    }

    /**
     * Удаляет файл заметки
     * @param {string} groupId - ID группы
     * @param {string} noteId - ID заметки
     */
    async delete(groupId, noteId) {
        const filePath = this.getNoteFilePath(groupId, noteId);
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
        const filePath = this.getNoteFilePath(groupId, noteId);
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}